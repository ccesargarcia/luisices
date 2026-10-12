import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Info,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import {
  downloadOrderImportTemplate,
  parseOrdersExcelFile,
  executeOrdersImport,
  ExcelParseResult,
  ParsedOrderRow,
  ImportProgress,
  ImportExecutionResult,
} from '../../utils/importOrdersExcel';
import { ImportOrderRowEditor } from './ImportOrderRowEditor';
import { getSelectedImportRows } from '../../utils/importOrdersReview';
import { formatCurrency } from '../../utils/currency';

interface ImportOrdersDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onImportSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export function ImportOrdersDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onImportSuccess,
  triggerButton,
}: ImportOrdersDialogProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (!isControlled) setInternalOpen(val);
    controlledOnOpenChange?.(val);
  };

  const parseGenerationRef = useRef(0);
  const pendingRefreshRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);

  // Filtro de exibição na tabela de pré-visualização
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editingRowIndex !== null) editorRef.current?.scrollIntoView({ block: 'start' }); }, [editingRowIndex]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [autoCreateCustomer, setAutoCreateCustomer] = useState(true);

  // Estados de execução da importação
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);

  const resetState = () => {
    parseGenerationRef.current += 1;
    setParsing(false);
    setFileName(null);
    setParseResult(null);
    setSelectedRowIds(new Set());
    setEditingRowIndex(null);
    setIsImporting(false);
    setImportProgress(null);
    setImportResult(null);
    setPreviewFilter('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Refreshing the dashboard unmounts this dialog. Keep results until dismissed.
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      onImportSuccess?.();
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValidExt) {
      toast.error('Formato inválido. Selecione um arquivo Excel (.xlsx, .xls) ou .csv.');
      return;
    }

    const generation = ++parseGenerationRef.current;
    setFileName(file.name);
    setParseResult(null);
    setSelectedRowIds(new Set());
    setEditingRowIndex(null);
    setParsing(true);
    setImportResult(null);

    try {
      const res = await parseOrdersExcelFile(file);
      if (generation !== parseGenerationRef.current) return;
      setParseResult(res);
      setSelectedRowIds(new Set(res.validRows.map(row => row.rowIndex)));

      if (res.totalRows === 0) {
        toast.warning('O arquivo não contém linhas de pedidos para importar.');
      } else if (res.invalidRows.length > 0) {
        toast.warning(
          `Foram identificadas ${res.invalidRows.length} linha(s) com erros de validação.`
        );
      } else {
        toast.success(`${res.validRows.length} pedidos validados com sucesso e prontos para importar!`);
      }
    } catch (err: any) {
      if (generation !== parseGenerationRef.current) return;
      console.error('[ImportOrdersDialog] Erro ao analisar planilha:', err);
      toast.error(err?.message || 'Falha ao processar arquivo Excel.');
      setFileName(null);
      setParseResult(null);
    } finally {
      if (generation === parseGenerationRef.current) setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      toast.info('Gerando modelo de planilha...');
      await downloadOrderImportTemplate();
      toast.success('Download da planilha modelo concluído!');
    } catch (err: any) {
      console.error('[ImportOrdersDialog] Erro ao baixar modelo:', err);
      toast.error('Não foi possível gerar a planilha modelo.');
    }
  };

  const handleStartImport = async () => {
    if (!selectedRows.length || selectedInvalidCount > 0 || editingRowIndex !== null || parsing || isImporting || !user?.uid) return;

    setIsImporting(true);
    setImportProgress({
      current: 0,
      total: selectedRows.length,
      statusText: 'Iniciando importação...',
    });

    try {
      const result = await executeOrdersImport(selectedRows, user.uid, {
        autoCreateCustomer,
        onProgress: (p) => setImportProgress(p),
      });

      setImportResult(result);
      if (result.successCount > 0) {
        toast.success(`${result.successCount} pedido(s) importado(s) com sucesso!`);
        pendingRefreshRef.current = true;
      }
      if (result.errorCount > 0) {
        toast.error(`${result.errorCount} pedido(s) falharam. Consulte os detalhes no modal.`);
      }
    } catch (err: any) {
      console.error('[ImportOrdersDialog] Erro durante a importação:', err);
      const message = err?.message || 'Erro inesperado ao importar pedidos.';
      setImportResult({ total: selectedRows.length, successCount: 0, errorCount: selectedRows.length, createdOrderIds: [], createdCustomerIds: [], errors: [{ rowIndex: 0, customerName: '', error: message }] });
      toast.error('Não foi possível concluir a importação. Consulte os detalhes no modal.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPreviewRows = (parseResult?.allRows || []).filter((r) => {
    if (previewFilter === 'valid') return r.isValid;
    if (previewFilter === 'invalid') return !r.isValid;
    return true;
  });

  const selectedRows = getSelectedImportRows(parseResult?.allRows || [], selectedRowIds);
  const selectedInvalidCount = selectedRows.filter(row => !row.isValid).length;
  const editingRow = parseResult?.allRows.find(row => row.rowIndex === editingRowIndex);
  const allVisibleSelected = filteredPreviewRows.length > 0 && filteredPreviewRows.every(row => selectedRowIds.has(row.rowIndex));
  const someVisibleSelected = filteredPreviewRows.some(row => selectedRowIds.has(row.rowIndex));
  const toggleRow = (rowIndex: number) => setSelectedRowIds(previous => {
    const next = new Set(previous);
    if (next.has(rowIndex)) next.delete(rowIndex); else next.add(rowIndex);
    return next;
  });
  const toggleVisibleRows = () => setSelectedRowIds(previous => {
    const next = new Set(previous);
    filteredPreviewRows.forEach(row => { if (allVisibleSelected) next.delete(row.rowIndex); else next.add(row.rowIndex); });
    return next;
  });
  const beginEdit = (rowIndex: number) => {
    if (editingRowIndex !== null && editingRowIndex !== rowIndex) {
      toast.info('Salve ou descarte a edição atual antes de editar outro pedido.');
      editorRef.current?.scrollIntoView({ block: 'start' });
      return;
    }
    setEditingRowIndex(rowIndex);
  };
  const saveEditedRow = (edited: ParsedOrderRow) => {
    setParseResult(previous => {
      if (!previous) return previous;
      const allRows = previous.allRows.map(row => row.rowIndex === edited.rowIndex ? edited : row);
      return { ...previous, allRows, validRows: allRows.filter(row => row.isValid), invalidRows: allRows.filter(row => !row.isValid) };
    });
    setEditingRowIndex(null);
    toast.success(`Alterações da linha ${edited.rowIndex} salvas na prévia.`);
  };

  const percentProgress =
    importProgress && importProgress.total > 0
      ? Math.round((importProgress.current / importProgress.total) * 100)
      : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isImporting) {
          toast.warning('A importação está em andamento. Aguarde a conclusão.');
          return;
        }
        if (!v) resetState();
        setOpen(v);
      }}
    >
      {triggerButton ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="default" className="gap-2" aria-label="Importar Excel">
            <Upload className="size-4" />
            <span className="hidden sm:inline">Importar Excel</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent size="4xl" noPadding className="flex flex-col overflow-hidden bg-background text-foreground border-border rounded-xl shadow-2xl [&>[data-slot=dialog-close]]:size-11 [&>[data-slot=dialog-close]]:top-2 [&>[data-slot=dialog-close]]:right-2">
        <DialogHeader className="p-4 pr-16 sm:p-6 sm:pr-16 border-b border-border text-left">
          <div className="flex items-start gap-3 min-w-0">
            <div className="hidden sm:flex shrink-0 size-10 rounded-xl bg-primary/10 items-center justify-center text-primary border border-primary/20">
              <FileSpreadsheet className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-xl font-bold tracking-tight leading-snug">
                Importar Pedidos via Excel
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Revise, edite e selecione os pedidos da sua planilha antes de importar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-4 sm:p-6 space-y-4 min-w-0 overflow-x-hidden">
          {/* 1. Tela de Conclusão / Resumo */}
          {importResult && (
            <div className="space-y-6 text-center py-6">
              <div className={`size-16 rounded-full border flex items-center justify-center mx-auto ${importResult.errorCount > 0 ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
                {importResult.errorCount > 0 ? <AlertTriangle className="size-8 text-destructive" /> : <CheckCircle2 className="size-8" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold">{importResult.errorCount > 0 ? (importResult.successCount > 0 ? 'Importação concluída com falhas' : 'Não foi possível importar os pedidos') : 'Importação Concluída!'}</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {importResult.successCount} de {importResult.total} pedido(s) foram cadastrados com sucesso no sistema.
                  {importResult.createdCustomerIds.length > 0 &&
                    ` Foram criados ${importResult.createdCustomerIds.length} novos clientes automaticamente.`}
                </p>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-left bg-destructive/10 border border-destructive/20 rounded-xl p-4 max-w-lg mx-auto">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-2">
                    <AlertTriangle className="size-4" />
                    <span>Falhas registradas ({importResult.errorCount}):</span>
                  </div>
                  <p className="text-sm mb-3">Os pedidos cadastrados com sucesso já foram salvos. Não importe novamente a planilha inteira para evitar duplicatas.</p>
                  <ul className="text-sm space-y-3 break-words text-destructive/90">
                    {importResult.errors.map((e, idx) => (
                      <li key={idx}>
                        <strong>{e.rowIndex > 0 ? `Linha ${e.rowIndex} (${e.customerName})` : 'Importação'}</strong>
                        {e.stage && <span className="block">Etapa: {e.stage === 'customer' ? 'cadastro do cliente' : 'gravação do pedido'}</span>}
                        <span className="block">{e.error}</span>
                        {e.code && <span className="block text-xs">Código: {e.code}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 2. Barra de Progresso durante a importação */}
          {isImporting && importProgress && (
            <div className="space-y-4 py-8 max-w-md mx-auto text-center">
              <Loader2 className="size-8 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <h4 className="font-semibold text-base">Gravando pedidos no sistema...</h4>
                <p className="text-sm text-muted-foreground">{importProgress.statusText}</p>
                <Progress value={percentProgress} className="h-3 rounded-full mt-3" />
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Progresso</span>
                  <span>{percentProgress}% ({importProgress.current} de {importProgress.total})</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Seleção / Upload de Arquivo e Template */}
          {!isImporting && !importResult && (
            <>
              {/* Banner do Template */}
              {!fileName && <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Info className="size-5 text-primary shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Precisa de um modelo pronto para preencher?</span>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Baixe a planilha oficial com colunas pré-formatadas e aba de instruções detalhadas.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="min-h-11 gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Download className="size-3.5" />
                  <span>Baixar Modelo (.xlsx)</span>
                </Button>
              </div>}

              {/* Dropzone */}
              {!fileName ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors duration-200 ${
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                  <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <Upload className="size-6" />
                  </div>
                  <h4 className="text-base font-semibold">Arraste seu arquivo Excel ou clique para buscar</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suporta arquivos nos formatos <strong>.xlsx</strong>, <strong>.xls</strong> e <strong>.csv</strong>
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border bg-muted/40 min-w-0">
                  <FileSpreadsheet className="size-5 sm:size-6 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div>
                      <span className="block font-semibold text-sm [overflow-wrap:anywhere]">{fileName}</span>
                      <p className="text-xs text-muted-foreground">
                        {parsing ? 'Processando dados...' : `${parseResult?.totalRows || 0} linha(s) encontrada(s)`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    disabled={parsing}
                    aria-label="Trocar arquivo"
                    className="size-11 sm:w-auto shrink-0 text-muted-foreground hover:text-destructive gap-1.5"
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">Trocar arquivo</span>
                  </Button>
                </div>
              )}

              {/* Indicador de Carregamento da Análise */}
              {parsing && (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span>Analisando e validando linhas da planilha...</span>
                </div>
              )}

              {/* Tabela de Pré-visualização & Diagnóstico */}
              {parseResult && !parsing && (
                <div className="space-y-4">
                  {/* Resumo com Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs font-medium">
                        Total: {parseResult.totalRows}
                      </Badge>
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs">
                        <CheckCircle2 className="size-3 mr-1" />
                        Válidos: {parseResult.validRows.length}
                      </Badge>
                      {parseResult.invalidRows.length > 0 && (
                        <Badge className="bg-destructive/20 text-destructive border border-destructive/30 text-xs">
                          <XCircle className="size-3 mr-1" />
                          Erros: {parseResult.invalidRows.length}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs min-w-0 w-full sm:w-auto" role="group" aria-label="Filtrar prévia">
                      <Button
                        variant={previewFilter === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="min-h-11 sm:min-h-8 text-xs px-2.5"
                        onClick={() => setPreviewFilter('all')}
                      >
                        Todos
                      </Button>
                      <Button
                        variant={previewFilter === 'valid' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="min-h-11 sm:min-h-8 text-xs px-2.5"
                        onClick={() => setPreviewFilter('valid')}
                        aria-label="Apenas Válidos"
                      >
                        Válidos
                      </Button>
                      <Button
                        variant={previewFilter === 'invalid' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="min-h-11 sm:min-h-8 text-xs px-2.5"
                        onClick={() => setPreviewFilter('invalid')}
                        aria-label="Com Erros"
                      >
                        Erros
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-2 min-h-11 text-xs cursor-pointer">
                      <Checkbox checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false} onCheckedChange={toggleVisibleRows} aria-label="Selecionar pedidos visíveis" />
                      Todos visíveis
                    </label>
                    <span className="font-medium">{selectedRows.length} selecionado(s)</span>
                    <Button variant="ghost" size="sm" className="min-h-11" aria-label="Limpar seleção" onClick={() => setSelectedRowIds(new Set())} disabled={!selectedRows.length}>Limpar</Button>
                  </div>
                  {selectedInvalidCount > 0 && <p role="alert" className="text-xs text-destructive">Há {selectedInvalidCount} pedido(s) selecionado(s) com erros. Edite os dados ou desmarque essas linhas para importar.</p>}
                  {editingRow && <div ref={editorRef}><ImportOrderRowEditor key={editingRow.rowIndex} row={editingRow} onSave={saveEditedRow} onCancel={() => setEditingRowIndex(null)} /></div>}
                  <p className="text-xs text-muted-foreground">Somente os pedidos selecionados serão importados. Edite uma linha para corrigir os dados antes de confirmar.</p>

                  {/* Opção de Autocadastro de Cliente */}
                  <div className="flex items-start gap-2 px-1 min-w-0">
                    <Checkbox
                      id="auto-create-customer"
                      checked={autoCreateCustomer}
                      onCheckedChange={(checked) => setAutoCreateCustomer(Boolean(checked))}
                    />
                    <label
                      htmlFor="auto-create-customer"
                      className="text-xs leading-relaxed font-medium text-foreground cursor-pointer select-none min-h-11 flex items-center"
                    >
                      Cadastrar clientes automaticamente caso ainda não existam no sistema
                    </label>
                  </div>

                  {/* No celular, cada pedido preserva seus dados sem comprimir colunas. */}
                  <div className="space-y-3 md:hidden" aria-label="Prévia dos pedidos">
                    {filteredPreviewRows.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido encontrado para o filtro selecionado.</p>
                    ) : filteredPreviewRows.map((row) => <ImportOrderPreviewCard key={row.rowIndex} row={row} selected={selectedRowIds.has(row.rowIndex)} onToggle={() => toggleRow(row.rowIndex)} onEdit={() => beginEdit(row.rowIndex)} />)}
                  </div>

                  {/* No desktop a tabela tem rolagem horizontal própria; o corpo controla a rolagem vertical. */}
                  <div className="hidden md:block border border-border rounded-xl overflow-x-auto" role="region" aria-label="Tabela de prévia dos pedidos" tabIndex={0}>
                    <table className="w-full min-w-[900px] text-xs text-left">
                      <thead className="bg-muted text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Importar</th>
                          <th className="py-2.5 px-3 font-semibold w-12 text-center">Linha</th>
                          <th className="py-2.5 px-3 font-semibold">Cliente</th>
                          <th className="py-2.5 px-3 font-semibold">Telefone</th>
                          <th className="py-2.5 px-3 font-semibold">Produto</th>
                          <th className="py-2.5 px-3 font-semibold text-center w-12">Qtd</th>
                          <th className="py-2.5 px-3 font-semibold">Valor</th>
                          <th className="py-2.5 px-3 font-semibold">Entrega</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Validação</th>
                          <th className="py-2.5 px-3 font-semibold">Editar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredPreviewRows.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-8 text-center text-muted-foreground">
                              Nenhum pedido encontrado para o filtro selecionado.
                            </td>
                          </tr>
                        ) : (
                          filteredPreviewRows.map((row) => (
                            <tr
                              key={row.rowIndex}
                              className={
                                row.isValid
                                  ? 'hover:bg-muted/40 transition-colors'
                                  : 'bg-destructive/5 hover:bg-destructive/10 transition-colors'
                              }
                            >
                              <td className="py-2 px-3"><Checkbox checked={selectedRowIds.has(row.rowIndex)} onCheckedChange={() => toggleRow(row.rowIndex)} aria-label={`Selecionar linha ${row.rowIndex}`} /></td>
                              <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                                #{row.rowIndex}
                              </td>
                              <td className="py-2 px-3 font-medium">
                                {row.customerName || <span className="text-destructive font-normal">(Ausente)</span>}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {row.customerPhone || '—'}
                              </td>
                              <td className="py-2 px-3 font-medium">
                                {row.productName || <span className="text-destructive font-normal">(Ausente)</span>}
                              </td>
                              <td className="py-2 px-3 text-center">{row.quantity}</td>
                              <td className="py-2 px-3 font-semibold">
                                {Number.isFinite(row.price) ? formatCurrency(row.price) : 'Valor inválido'}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {row.deliveryDate}
                              </td>
                              <td className="py-2 px-3 capitalize text-muted-foreground">
                                {orderStatusLabel(row.status)}
                              </td>
                              <td className="py-2 px-3">
                                {row.isValid ? (
                                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3.5" />
                                    <span>Pronto</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5 text-destructive font-normal">
                                    {row.errors.map((err, eIdx) => (
                                      <span key={eIdx} className="leading-tight">
                                        • {err}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {row.warnings.length > 0 && <ul className="mt-1 text-amber-700 dark:text-amber-400">{row.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
                              </td>
                              <td className="py-2 px-3"><Button variant="outline" size="sm" className="min-h-11" onClick={() => beginEdit(row.rowIndex)} aria-label={`Editar linha ${row.rowIndex}`}>Editar</Button></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter className="grid grid-cols-[auto_1fr] sm:flex sm:flex-row sm:justify-between items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border bg-background">
          {importResult ? (
            <Button
              className="min-h-11 col-span-2 w-full sm:w-auto ml-auto"
              onClick={() => {
                resetState();
                setOpen(false);
              }}
            >
              Concluir
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={isImporting}
                onClick={() => {
                  resetState();
                  setOpen(false);
                }}
              >
                Cancelar
              </Button>

              <div className="min-w-0 flex justify-end">
                {parseResult && (
                  <Button
                    onClick={handleStartImport}
                    disabled={isImporting || !selectedRows.length || selectedInvalidCount > 0 || editingRowIndex !== null}
                    className="min-h-11 w-full sm:w-auto min-w-0 whitespace-normal gap-2 px-3 sm:px-4"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Importando...</span>
                      </>
                    ) : (
                      <>
                        <span>Importar {selectedRows.length} {selectedRows.length === 1 ? 'pedido' : 'pedidos'}</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function orderStatusLabel(status: ParsedOrderRow['status']) {
  return { pending: 'Pendente', 'in-progress': 'Em Produção', completed: 'Concluído', cancelled: 'Cancelado' }[status];
}

function ImportOrderPreviewCard({ row, selected, onToggle, onEdit }: { row: ParsedOrderRow; selected: boolean; onToggle: () => void; onEdit: () => void }) {
  return (
    <article className="rounded-lg border border-border bg-card p-3 space-y-2 min-w-0 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <label className="flex items-center gap-2 min-h-11 text-xs cursor-pointer"><Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Selecionar linha ${row.rowIndex}`} /><span className="font-medium text-muted-foreground">Linha #{row.rowIndex}</span></label>
        <span className={row.isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}>
          {row.isValid ? 'Pronto para importar' : 'Revisar dados'}
        </span>
      </div>
      <p className="text-sm font-semibold">{row.customerName || 'Cliente ausente'}</p>
      <p className="text-sm">{row.productName || 'Produto ausente'}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div><dt className="text-muted-foreground">Telefone</dt><dd>{row.customerPhone || '—'}</dd></div>
        <div><dt className="text-muted-foreground">Quantidade</dt><dd>{row.quantity}</dd></div>
        <div><dt className="text-muted-foreground">Valor</dt><dd>{Number.isFinite(row.price) ? formatCurrency(row.price) : 'Valor inválido'}</dd></div>
        <div><dt className="text-muted-foreground">Entrega</dt><dd>{row.deliveryDate}</dd></div>
        <div className="col-span-2"><dt className="text-muted-foreground">Status</dt><dd>{orderStatusLabel(row.status)}</dd></div>
      </dl>
      <Button variant="outline" size="sm" className="min-h-11 w-full" onClick={onEdit} aria-label={`Editar linha ${row.rowIndex}`}>Editar dados</Button>
      {row.warnings.length > 0 && <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">{row.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      {row.errors.length > 0 && <ul className="text-xs text-destructive space-y-1">{row.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
    </article>
  );
}
