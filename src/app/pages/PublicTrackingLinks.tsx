import { useCallback, useEffect, useState } from 'react';
import { Copy, ExternalLink, Link2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { orderTrackingService, type OrderTrackingLinkRecord } from '../../services/orderTrackingService';
import { toast } from 'sonner';

function publicUrl(token: string) {
  const base = import.meta.env.BASE_URL || '/';
  return new URL(`${base.replace(/\/$/, '')}/acompanhar/${token}`, window.location.origin).toString();
}

function linkStatus(link: OrderTrackingLinkRecord): 'Ativo' | 'Expirado' | 'Revogado' {
  if (link.revokedAt) return 'Revogado';
  if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) return 'Expirado';
  return 'Ativo';
}

export function PublicTrackingLinks() {
  const [links, setLinks] = useState<OrderTrackingLinkRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadLinks = useCallback(async (cursor: string | null, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const page = await orderTrackingService.listLinks(cursor);
      setLinks(current => append ? [...current, ...page.links] : page.links);
      setNextCursor(page.nextCursor);
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

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Links de acompanhamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulte e copie os links compartilhados com seus clientes.</p>
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
            return (
              <Card key={link.id} className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      Pedido {link.orderNumber || `#${link.orderId.slice(0, 8)}`}
                    </CardTitle>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{link.customerName || 'Cliente não informado'}</p>
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
                  <div className="flex justify-end gap-2">
                    {url && status === 'Ativo' && (
                      <Button size="sm" variant="outline" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} className="gap-1.5">
                        <ExternalLink className="size-3.5" /> Abrir
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => void copyLink(link)} disabled={!url} className="gap-1.5">
                      <Copy className="size-3.5" /> Copiar link
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
    </main>
  );
}
