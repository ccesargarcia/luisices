import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Palette, RotateCcw, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { DEFAULT_ORDER_TRACKING_TEMPLATE, type OrderTrackingTemplate, type UserSettings } from '../../../services/firebaseSettingsService';

interface Props {
  settings?: UserSettings | null;
  businessName?: string;
  logo?: string;
  onLogoUpload: (file: File) => Promise<string>;
  onSave: (value: OrderTrackingTemplate) => Promise<void>;
}

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={e => onChange(e.target.value)} maxLength={7} placeholder="Usar cor do design system" /></div>
);

export function OrderTrackingTemplateSection({ settings, businessName = '', logo = '', onLogoUpload, onSave }: Props) {
  const [value, setValue] = useState<OrderTrackingTemplate>({ ...DEFAULT_ORDER_TRACKING_TEMPLATE, brandName: businessName, logoUrl: logo, ...settings?.orderTrackingTemplate });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  useEffect(() => setValue({ ...DEFAULT_ORDER_TRACKING_TEMPLATE, brandName: businessName, logoUrl: logo, ...settings?.orderTrackingTemplate }), [settings?.orderTrackingTemplate, businessName, logo]);
  const change = <K extends keyof OrderTrackingTemplate>(key: K, next: OrderTrackingTemplate[K]) => setValue(current => ({ ...current, [key]: next }));
  const save = async () => {
    if (![value.backgroundColor, value.surfaceColor, value.primaryColor, value.textColor].every(color => !color || /^#[0-9a-fA-F]{6}$/.test(color))) {
      toast.error('Use cores no formato hexadecimal, por exemplo #2563eb.'); return;
    }
    setSaving(true);
    try { await onSave(value); toast.success('Template do link salvo.'); }
    catch { toast.error('Não foi possível salvar o template.'); }
    finally { setSaving(false); }
  };
  const toggleFields: Array<[keyof OrderTrackingTemplate, string]> = [
    ['showLogo', 'Exibir logo'], ['showProgress', 'Exibir etapas do pedido'], ['showProduct', 'Exibir item'],
    ['showQuantity', 'Exibir quantidade'], ['showDeliveryDate', 'Exibir previsão de entrega'], ['showTrackingCode', 'Exibir código de rastreio'],
  ];
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="size-5 text-primary" />Página do link de acompanhamento</CardTitle><CardDescription>Personalize a página que seus clientes veem ao abrir o link do pedido. As alterações valem para os links ativos.</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="space-y-4"><h3 className="font-semibold">Identidade e conteúdo</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="tracking-brand">Nome exibido</Label><Input id="tracking-brand" value={value.brandName} maxLength={80} onChange={e => change('brandName', e.target.value)} placeholder={businessName || 'Nome do negócio'} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="tracking-logo-file">Logo da página</Label><div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                {value.logoUrl ? <img src={value.logoUrl} alt="Prévia da logo" className="h-12 w-24 rounded-md bg-muted p-1 object-contain" /> : <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground"><ImagePlus className="size-5" /></div>}
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{value.logoUrl ? 'Logo selecionada' : 'Nenhuma logo selecionada'}</p><p className="text-xs text-muted-foreground">PNG, JPG ou WebP · até 5 MB · redimensionada para no máximo 1000 px</p></div>
                <Input id="tracking-logo-file" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingLogo} onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 5 MB.'); return; } setUploadingLogo(true); try { const url = await onLogoUpload(file); setValue(current => ({ ...current, logoUrl: url, showLogo: true })); toast.success('Logo enviada. Salve o template para aplicar.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a logo.'); } finally { setUploadingLogo(false); } }} />
                <Label htmlFor="tracking-logo-file" className="cursor-pointer"><Button type="button" variant="outline" disabled={uploadingLogo} asChild><span>{uploadingLogo ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ImagePlus className="mr-2 size-4" />}{uploadingLogo ? 'Enviando…' : 'Enviar imagem'}</span></Button></Label>
                {value.logoUrl && <Button type="button" variant="ghost" size="icon" aria-label="Remover logo do template" onClick={() => setValue(current => ({ ...current, logoUrl: '', showLogo: false }))}><X className="size-4" /></Button>}
              </div><p className="text-xs text-muted-foreground">Recomendado: logo horizontal, proporção aproximada de 3:1, com fundo transparente. Será exibida com até 160 × 48 px.</p></div>
              <div className="space-y-2"><Label htmlFor="tracking-title">Título da página</Label><Input id="tracking-title" value={value.title} maxLength={100} onChange={e => change('title', e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="tracking-subtitle">Texto de apoio</Label><Input id="tracking-subtitle" value={value.subtitle} maxLength={160} onChange={e => change('subtitle', e.target.value)} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="tracking-footer">Mensagem no rodapé</Label><Textarea id="tracking-footer" value={value.footerText} maxLength={240} rows={2} onChange={e => change('footerText', e.target.value)} /></div>
            </div>
          </section>
          <section className="space-y-4"><div><h3 className="font-semibold">Estilo visual</h3><p className="text-sm text-muted-foreground">Por padrão, a página acompanha o tema e as cores do Luisices. Preencha uma cor apenas se quiser personalizar.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="tracking-layout">Modelo</Label><select id="tracking-layout" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.layout} onChange={e => change('layout', e.target.value as OrderTrackingTemplate['layout'])}><option value="classic">Clássico</option><option value="editorial">Editorial</option><option value="soft">Suave</option></select></div>
              <ColorField label="Fundo da página (opcional)" value={value.backgroundColor} onChange={v => change('backgroundColor', v)} />
              <ColorField label="Fundo dos cartões (opcional)" value={value.surfaceColor} onChange={v => change('surfaceColor', v)} />
              <ColorField label="Cor principal (opcional)" value={value.primaryColor} onChange={v => change('primaryColor', v)} />
              <ColorField label="Cor do texto (opcional)" value={value.textColor} onChange={v => change('textColor', v)} />
            </div>
          </section>
          <section className="space-y-4"><h3 className="font-semibold">Informações exibidas</h3>
            <div className="grid gap-4 sm:grid-cols-2">{toggleFields.map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={Boolean(value[key])} onChange={e => change(key, e.target.checked as never)} className="size-4 accent-primary" />{label}</label>)}</div>
            <div className="grid gap-4 sm:grid-cols-2">{([['productLabel', 'Rótulo do item'], ['quantityLabel', 'Rótulo da quantidade'], ['deliveryLabel', 'Rótulo da entrega'], ['trackingLabel', 'Rótulo do rastreio']] as const).map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`tracking-${key}`}>{label}</Label><Input id={`tracking-${key}`} value={value[key]} maxLength={40} onChange={e => change(key, e.target.value)} /></div>)}</div>
          </section>
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setValue({ ...DEFAULT_ORDER_TRACKING_TEMPLATE, brandName: businessName, logoUrl: logo })}><RotateCcw className="mr-2 size-4" />Restaurar padrão</Button><Button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Salvar template</Button></div>
        </div>
        <aside className="space-y-2"><Label>Prévia</Label><div className={`overflow-hidden border border-border bg-muted/30 p-4 text-foreground ${value.layout === 'soft' ? 'rounded-3xl' : value.layout === 'editorial' ? 'rounded-none' : 'rounded-2xl'}`} style={{ backgroundColor: value.backgroundColor || undefined, color: value.textColor || undefined }}>
          <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm" style={{ borderRadius: value.layout === 'soft' ? 24 : value.layout === 'editorial' ? 2 : 16, backgroundColor: value.surfaceColor || undefined, color: value.textColor || undefined }}>
            <div className="bg-primary p-5 text-primary-foreground" style={{ backgroundColor: value.primaryColor || undefined }}>{value.showLogo && (value.logoUrl || logo) && <img src={value.logoUrl || logo} alt="Logo" className="mb-3 h-9 max-w-32 object-contain" />}<p className="text-xs opacity-80">{value.brandName || businessName || 'Seu negócio'}</p><h4 className="mt-1 text-lg font-bold">{value.title}</h4><p className="mt-1 text-xs opacity-80">{value.subtitle}</p><p className="mt-3 text-sm font-semibold">Pedido #PED-001 · Em produção</p></div>
            <div className="space-y-3 p-4">{value.showProgress && <div className="rounded-lg border p-3 text-xs">Recebido ━━━ Em produção ━━━ Concluído</div>}<div className="grid grid-cols-2 gap-2 text-xs">{value.showProduct && <div className="rounded-lg border p-2"><span className="opacity-60">{value.productLabel}</span><p className="font-semibold">Produto personalizado</p></div>}{value.showQuantity && <div className="rounded-lg border p-2"><span className="opacity-60">{value.quantityLabel}</span><p className="font-semibold">2 unidades</p></div>}{value.showDeliveryDate && <div className="rounded-lg border p-2"><span className="opacity-60">{value.deliveryLabel}</span><p className="font-semibold">A combinar</p></div>}{value.showTrackingCode && <div className="rounded-lg border p-2"><span className="opacity-60">{value.trackingLabel}</span><p className="font-semibold">—</p></div>}</div><p className="text-center text-xs opacity-70">{value.footerText}</p></div>
          </div>
        </div></aside>
      </div>
    </CardContent>
  </Card>;
}
