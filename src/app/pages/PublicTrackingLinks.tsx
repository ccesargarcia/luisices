import { useCallback, useEffect, useState } from 'react';
import { Ban, Copy, ExternalLink, Link2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { orderTrackingService, type OrderTrackingLinkRecord } from '../../services/orderTrackingService';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

function publicUrl(token: string) {
  const base = import.meta.env.BASE_URL || '/';
  return new URL(`${base.replace(/\/$/, '')}/acompanhar/${token}`, window.location.origin).toString();
}

function linkStatus(link: OrderTrackingLinkRecord): 'Ativo' | 'Expirado' | 'Revogado' {
  if (link.revokedAt) return 'Revogado';
  if (link.expiresAt !== null) {
    const expiry = Date.parse(link.expiresAt || '');
    if (!Number.isFinite(expiry) || expiry <= Date.now()) return 'Expirado';
  }
  return 'Ativo';
}

export function PublicTrackingLinks() {
  const [links, setLinks] = useState<OrderTrackingLinkRecord[]>([]);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ link: OrderTrackingLinkRecord; action: 'revoke' | 'delete' } | null>(null);
  const [processingLinkId, setProcessingLinkId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadLinks = useCallback(async (cursor: string | null, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const page = await orderTrackingService.listLinks(cursor);
      setLinks(current => append ? [...current, ...page.links] : page.links);
      setNextCursor(page.nextCursor);
      if (!append) setSelectedLinkIds(new Set());
    } catch (err) {
      console.error('Falha ao carregar links de acompanhamento:', err);
      setError('Não foi possível carregar seus links. Tente novamente.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { void loadLinks(null, false); }, [loadLinks]);

  const copyLink = async (link: OrderTrackingLinkRecord) => {
    if (!link.token) {
      toast.error('Este link antigo não pode ser recuperado. Gere um novo pelo pedido.');
      return;
    }
    try {
      await navigator.clipboard.writeText(publicUrl(link.token));
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link neste navegador.');
    }
  };

  const confirmLinkAction = async () => {
    if (!pendingAction || processingLinkId) return;
    const { link, action } = pendingAction;
    setProcessingLinkId(link.id);
    try {
      if (action === 'revoke') {
        await orderTrackingService.revokeLinkById(link.id);
        setLinks(current => current.map(item => item.id === link.id
          ? { ...item, revokedAt: new Date().toISOString() }
          : item));
        toast.success('Acesso ao link revogado.');
      } else {
        await orderTrackingService.deleteLink(link.id);
        setLinks(current => current.filter(item => item.id !== link.id));
        setSelectedLinkIds(prev => {
          const next = new Set(prev);
          next.delete(link.id);
          return next;
        });
        toast.success('Link removido do histórico.');
      }
      setPendingAction(null);
    } catch (err) {
      console.error(`Falha ao ${action === 'revoke' ? 'revogar' : 'excluir'} link de acompanhamento:`, err);
      toast.error(`Não foi possível ${action === 'revoke' ? 'revogar' : 'excluir'} este link.`);
    } finally {
      setProcessingLinkId(null);
    }
  };

  const allSelected = links.length > 0 && links.every(link => selectedLinkIds.has(link.id));
  const someSelected = selectedLinkIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedLinkIds(new Set());
    } else {
      setSelectedLinkIds(new Set(links.map(l => l.id)));
    }
  };

  const toggleSelectLink = (id: string) => {
    setSelectedLinkIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedLinkIds.size === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    const count = selectedLinkIds.size;
    const toastId = toast.loading(`Excluindo ${count} link(s) de acompanhamento...`);
    try {
      const idsToDelete = Array.from(selectedLinkIds);
      const result = await orderTrackingService.deleteLinksBatch(idsToDelete);
      setLinks(current => current.filter(link => !selectedLinkIds.has(link.id)));
      setSelectedLinkIds(new Set());
      setBulkDeleteDialogOpen(false);
      toast.success(`${result.deletedCount ?? count} link(s) excluído(s) do histórico.`, { id: toastId });
    } catch (err) {
      console.error('Falha ao excluir links em massa:', err);
      toast.error('Não foi possível excluir os links selecionados.', { id: toastId });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Links de acompanhamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulte, copie, revogue ou remova links compartilhados com seus clientes.</p>
        </div>
        <Button variant="outline" onClick={() => void loadLinks(null, false)} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Atualizar
        </Button>
      </header>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void loadLinks(null, false)}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/60 p-3 shadow-sm">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={toggleSelectAll}
              aria-label="Selecionar todos os links"
            />
            <span>
              {allSelected
                ? 'Todos selecionados'
                : selectedLinkIds.size > 0
                ? `${selectedLinkIds.size} de ${links.length} selecionado(s)`
                : `Selecionar todos (${links.length})`}
            </span>
          </label>

          {selectedLinkIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedLinkIds(new Set())}
                disabled={bulkDeleting}
                className="text-xs"
              >
                Limpar seleção
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={bulkDeleting}
                className="gap-1.5 text-xs"
              >
                {bulkDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Excluir selecionados ({selectedLinkIds.size})
              </Button>
            </div>
          )}
        </div>
      )}

      {loading && links.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando links…
        </div>
      ) : links.length === 0 && !error ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Link2 className="size-8 text-muted-foreground" />
            <p className="font-medium">Nenhum link foi criado ainda</p>
            <p className="max-w-md text-sm text-muted-foreground">Abra um pedido no Dashboard e use “Link do cliente” para criar o primeiro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {links.map(link => {
            const status = linkStatus(link);
            const url = link.token ? publicUrl(link.token) : '';
            const isSelected = selectedLinkIds.has(link.id);
            return (
              <Card key={link.id} className={`min-w-0 transition-colors ${isSelected ? 'border-primary/60 bg-primary/[0.03]' : ''}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectLink(link.id)}
                      className="mt-1"
                      aria-label={`Selecionar link do pedido ${link.orderNumber || link.orderId}`}
                    />
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        Pedido {link.orderNumber || `#${link.orderId.slice(0, 8)}`}
                      </CardTitle>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{link.customerName || 'Cliente não informado'}</p>
                    </div>
                  </div>
                  <Badge variant={status === 'Ativo' ? 'default' : 'outline'} className="shrink-0">{status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Criado em</span><span className="text-right text-foreground">{link.createdAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(link.createdAt)) : '—'}</span>
                    <span>Criado por</span><span className="truncate text-right text-foreground" title={link.createdByName}>{link.createdByName || '—'}</span>
                    <span>Validade</span><span className="text-right text-foreground">{link.expiresAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(link.expiresAt)) : 'Sem expiração'}</span>
                  </div>
                  {url && <p className="truncate rounded-md bg-muted/50 px-2 py-1.5 font-mono text-[11px] text-muted-foreground" title={url}>{url}</p>}
                  {!url && <p className="text-xs text-muted-foreground">Link criado antes do histórico seguro. Ele não pode ser recuperado; gere outro pelo pedido.</p>}
                  <div className="flex flex-wrap justify-end gap-2">
                    {url && status === 'Ativo' && (
                      <Button size="sm" variant="outline" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} className="gap-1.5">
                        <ExternalLink className="size-3.5" /> Abrir
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => void copyLink(link)} disabled={!url} className="gap-1.5">
                      <Copy className="size-3.5" /> Copiar link
                    </Button>
                    {status === 'Ativo' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingLinkId === link.id || bulkDeleting}
                        onClick={() => setPendingAction({ link, action: 'revoke' })}
                        className="gap-1.5 text-amber-700 hover:text-amber-800 dark:text-amber-400"
                      >
                        <Ban className="size-3.5" /> Revogar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processingLinkId === link.id || bulkDeleting}
                      onClick={() => setPendingAction({ link, action: 'delete' })}
                      className="gap-1.5"
                    >
                      <Trash2 className="size-3.5" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadLinks(nextCursor, true)} disabled={loadingMore} className="gap-2">
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            Carregar mais links
          </Button>
        </div>
      )}

      {/* Confirmação de exclusão/revogação individual */}
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={open => { if (!open && !processingLinkId) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.action === 'revoke' ? 'Revogar este link?' : 'Excluir este link?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'revoke'
                ? 'O cliente perderá o acesso ao acompanhamento por este link imediatamente. O registro continuará no histórico.'
                : 'O registro será removido do histórico. Se o link ainda estiver ativo, o acesso público também será revogado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(processingLinkId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(processingLinkId)}
              onClick={event => { event.preventDefault(); void confirmLinkAction(); }}
              className={pendingAction?.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {processingLinkId
                ? <Loader2 className="mr-2 size-4 animate-spin" />
                : pendingAction?.action === 'delete' ? <Trash2 className="mr-2 size-4" /> : <Ban className="mr-2 size-4" />}
              {pendingAction?.action === 'revoke' ? 'Revogar link' : 'Excluir link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão em massa */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={open => { if (!open && !bulkDeleting) setBulkDeleteDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedLinkIds.size} link(s) de acompanhamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Os {selectedLinkIds.size} links selecionados serão removidos do histórico permanentemente.
              Se algum desses links ainda estiver ativo, o acesso público do cliente será revogado imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkDeleting}
              onClick={event => { event.preventDefault(); void handleBulkDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Excluir {selectedLinkIds.size} link(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
