import React, { useState, useRef } from 'react';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);

  // Filtro de exibição na tabela de pré-visualização
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [autoCreateCustomer, setAutoCreateCustomer] = useState(true);

  // Estados de execução da importação
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);

  const resetState = () => {
    setFileName(null);
    setParseResult(null);
    setIsImporting(false);
    setImportProgress(null);
    setImportResult(null);
    setPreviewFilter('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
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

    setFileName(file.name);
    setParsing(true);
    setImportResult(null);

    try {
      const res = await parseOrdersExcelFile(file);
      setParseResult(res);

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
      console.error('[ImportOrdersDialog] Erro ao analisar planilha:', err);
      toast.error(err?.message || 'Falha ao processar arquivo Excel.');
      setFileName(null);
      setParseResult(null);
    } finally {
      setParsing(false);
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
    if (!parseResult || parseResult.validRows.length === 0 || !user?.uid) return;

    setIsImporting(true);
    setImportProgress({
      current: 0,
      total: parseResult.validRows.length,
      statusText: 'Iniciando importação...',
    });

    try {
      const result = await executeOrdersImport(parseResult.validRows, user.uid, {
        autoCreateCustomer,
        onProgress: (p) => setImportProgress(p),
      });

      setImportResult(result);
      if (result.successCount > 0) {
        toast.success(`${result.successCount} pedido(s) importado(s) com sucesso!`);
        onImportSuccess?.();
      }
      if (result.errorCount > 0) {
        toast.error(`${result.errorCount} pedido(s) falharam ao importar.`);
      }
    } catch (err: any) {
      console.error('[ImportOrdersDialog] Erro durante a importação:', err);
      toast.error(err?.message || 'Erro inesperado ao importar pedidos.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPreviewRows = (parseResult?.allRows || []).filter((r) => {
    if (previewFilter === 'valid') return r.isValid;
    if (previewFilter === 'invalid') return !r.isValid;
    return true;
  });

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
          <Button variant="outline" size="default" className="gap-2">
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
                Revise sua planilha (.xlsx, .xls ou .csv) antes de importar os pedidos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-4 sm:p-6 space-y-4 min-w-0 overflow-x-hidden">
          {/* 1. Tela de Conclusão / Resumo */}
          {importResult && (
            <div className="space-y-6 text-center py-6">
              <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold">Importação Concluída!</h3>
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
                    <span>Falhas registradas ({importResult.errors.length}):</span>
                  </div>
                  <ul className="text-xs space-y-1.5 max-h-32 overflow-y-auto text-destructive/90">
                    {importResult.errors.map((e, idx) => (
                      <li key={idx}>
                        • Linha {e.rowIndex} ({e.customerName}): {e.error}
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
                    ) : filteredPreviewRows.map((row) => <ImportOrderPreviewCard key={row.rowIndex} row={row} />)}
                  </div>

                  {/* No desktop a tabela tem rolagem horizontal própria; o corpo controla a rolagem vertical. */}
                  <div className="hidden md:block border border-border rounded-xl overflow-x-auto" role="region" aria-label="Tabela de prévia dos pedidos" tabIndex={0}>
                    <table className="w-full min-w-[900px] text-xs text-left">
                      <thead className="bg-muted text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold w-12 text-center">Linha</th>
                          <th className="py-2.5 px-3 font-semibold">Cliente</th>
                          <th className="py-2.5 px-3 font-semibold">Telefone</th>
                          <th className="py-2.5 px-3 font-semibold">Produto</th>
                          <th className="py-2.5 px-3 font-semibold text-center w-12">Qtd</th>
                          <th className="py-2.5 px-3 font-semibold">Valor</th>
                          <th className="py-2.5 px-3 font-semibold">Entrega</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Validação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredPreviewRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-muted-foreground">
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
                                {formatCurrency(row.price)}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {row.deliveryDate}
                              </td>
                              <td className="py-2 px-3 capitalize text-muted-foreground">
                                {row.status === 'in-progress'
                                  ? 'Em Produção'
                                  : row.status === 'completed'
                                  ? 'Concluído'
                                  : 'Pendente'}
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
                              </td>
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
                {parseResult && parseResult.validRows.length > 0 && (
                  <Button
                    onClick={handleStartImport}
                    disabled={isImporting || parseResult.validRows.length === 0}
                    className="min-h-11 w-full sm:w-auto min-w-0 whitespace-normal gap-2 px-3 sm:px-4"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Importando...</span>
                      </>
                    ) : (
                      <>
                        <span>Importar {parseResult.validRows.length} {parseResult.validRows.length === 1 ? 'pedido' : 'pedidos'}</span>
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

function ImportOrderPreviewCard({ row }: { row: ParsedOrderRow }) {
  return (
    <article className="rounded-lg border border-border bg-card p-3 space-y-2 min-w-0 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Linha #{row.rowIndex}</span>
        <span className={row.isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}>
          {row.isValid ? 'Pronto para importar' : 'Revisar dados'}
        </span>
      </div>
      <p className="text-sm font-semibold">{row.customerName || 'Cliente ausente'}</p>
      <p className="text-sm">{row.productName || 'Produto ausente'}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div><dt className="text-muted-foreground">Telefone</dt><dd>{row.customerPhone || '—'}</dd></div>
        <div><dt className="text-muted-foreground">Quantidade</dt><dd>{row.quantity}</dd></div>
        <div><dt className="text-muted-foreground">Valor</dt><dd>{formatCurrency(row.price)}</dd></div>
        <div><dt className="text-muted-foreground">Entrega</dt><dd>{row.deliveryDate}</dd></div>
        <div className="col-span-2"><dt className="text-muted-foreground">Status</dt><dd>{row.status === 'in-progress' ? 'Em Produção' : row.status === 'completed' ? 'Concluído' : 'Pendente'}</dd></div>
      </dl>
      {row.errors.length > 0 && <ul className="text-xs text-destructive space-y-1">{row.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
    </article>
  );
}
