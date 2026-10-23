import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { AlertCircle, Check, Clock3, Loader2, PackageCheck, PackageSearch, Truck } from 'lucide-react';
import { orderTrackingService, type PublicOrderTracking as TrackingData } from '../../services/orderTrackingService';
import { DEFAULT_ORDER_TRACKING_TEMPLATE } from '../../services/firebaseSettingsService';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const STATUS_LABELS: Record<TrackingData['status'], string> = {
  pending: 'Pedido recebido',
  'in-progress': 'Em produção',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const dateLabel = (value: string) => {
  if (!value) return 'A combinar';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'A combinar' : new Intl.DateTimeFormat('pt-BR').format(date);
};

export function PublicOrderTracking() {
  const { token = '' } = useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    orderTrackingService.getPublicStatus(token)
      .then(result => { if (active) setData(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-muted/30 p-6"><div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Buscando informações do pedido…</div></main>;
  }

  if (error || !data) {
    return <main className="grid min-h-screen place-items-center bg-muted/30 p-6"><Card className="w-full max-w-md"><CardContent className="p-7 text-center"><AlertCircle className="mx-auto mb-3 size-9 text-muted-foreground" /><h1 className="text-xl font-bold">Não encontramos este acompanhamento</h1><p className="mt-2 text-sm text-muted-foreground">O link pode estar incorreto ou ter sido desativado. Peça um novo link para quem está cuidando do seu pedido.</p></CardContent></Card></main>;
  }

  const progress = data.status === 'cancelled' ? -1 : data.status === 'pending' ? 0 : data.status === 'in-progress' ? 1 : 2;
  const steps = [
    { label: 'Recebido', icon: PackageSearch },
    { label: 'Em produção', icon: Clock3 },
    { label: 'Concluído', icon: PackageCheck },
  ];
  const template = { ...DEFAULT_ORDER_TRACKING_TEMPLATE, brandName: '', logoUrl: '', ...data.trackingTemplate };
  const radius = template.layout === 'soft' ? '1.75rem' : template.layout === 'editorial' ? '0.35rem' : '1rem';
  const title = template.title || 'Acompanhe seu pedido';
  const backgroundStyle = { backgroundColor: template.backgroundColor || undefined, color: template.textColor || undefined };
  const surfaceStyle = { backgroundColor: template.surfaceColor || undefined, color: template.textColor || undefined };
  const primaryStyle = { backgroundColor: template.primaryColor || undefined };

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 text-foreground sm:py-16" style={backgroundStyle}>
      <Card className="mx-auto w-full max-w-2xl overflow-hidden border-border bg-card text-card-foreground shadow-sm" style={{ ...surfaceStyle, borderRadius: radius }}>
        <CardHeader className="border-b px-6 py-7 sm:px-9 bg-primary text-primary-foreground" style={primaryStyle}>
          {template.showLogo && template.logoUrl && <img src={template.logoUrl} alt={template.brandName || 'Logo'} className="mb-4 max-h-12 max-w-40 object-contain" />}
          {template.brandName && <CardDescription className="text-primary-foreground/80">{template.brandName}</CardDescription>}
          <CardDescription className="text-primary-foreground/80">{title}</CardDescription>
          {template.subtitle && <p className="mt-1 text-sm text-primary-foreground/80">{template.subtitle}</p>}
          <CardTitle className="mt-2 text-2xl font-bold">{data.orderNumber ? `Pedido ${data.orderNumber}` : 'Seu pedido'}</CardTitle>
          <Badge variant="outline" className="mt-2 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground">{STATUS_LABELS[data.status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-8 px-6 py-6 sm:px-9">
          {data.status === 'cancelled' ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Este pedido foi cancelado. Fale com o ateliê se precisar de ajuda.</div>
          ) : template.showProgress ? (
            <div className="grid grid-cols-3">
              {steps.map(({ label, icon: Icon }, index) => {
                const complete = index <= progress;
                return <div key={label} className="relative flex flex-col items-center text-center">
                  {index > 0 && <span className={`absolute right-1/2 top-5 h-0.5 w-full ${index <= progress ? 'bg-primary' : 'bg-border'}`} style={index <= progress && template.primaryColor ? { backgroundColor: template.primaryColor } : undefined} />}
                  <span className={`relative z-10 grid size-10 place-items-center rounded-full border ${complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`} style={complete && template.primaryColor ? { borderColor: template.primaryColor, backgroundColor: template.primaryColor } : undefined}>
                    {index < progress ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className={`mt-2 text-xs sm:text-sm ${complete ? 'font-semibold' : 'opacity-65'}`}>{label}</span>
                </div>;
              })}
            </div>
          ) : null}

          <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 sm:p-5" style={{ borderRadius: radius }}>
            {template.showProduct && <div><p className="text-xs font-medium uppercase opacity-60">{template.productLabel}</p><p className="mt-1 font-semibold">{data.productName}</p></div>}
            {template.showQuantity && <div><p className="text-xs font-medium uppercase opacity-60">{template.quantityLabel}</p><p className="mt-1 font-semibold">{data.quantity}</p></div>}
            {template.showDeliveryDate && <div><p className="text-xs font-medium uppercase opacity-60">{template.deliveryLabel}</p><p className="mt-1 font-semibold">{dateLabel(data.deliveryDate)}</p></div>}
            {template.showTrackingCode && data.shippingTrackingNumber && <div><p className="text-xs font-medium uppercase opacity-60">{template.trackingLabel}</p><p className="mt-1 flex items-center gap-2 font-semibold"><Truck className="size-4" />{data.shippingTrackingNumber}</p></div>}
          </div>
          {template.footerText && <p className="text-center text-xs opacity-70">{template.footerText}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
