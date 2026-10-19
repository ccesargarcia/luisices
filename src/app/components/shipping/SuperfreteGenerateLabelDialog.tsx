import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Truck,
  Loader2,
  AlertCircle,
  Package,
  ExternalLink,
  Copy,
  CheckCircle2,
  FileText,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Order, Customer } from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  superfreteService,
  CreateLabelResponse,
  SuperfretePackage,
} from '../../../services/superfreteService';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { normalizePhoneForWhatsApp } from '../../utils/whatsapp';

interface SuperfreteGenerateLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customer?: Customer | null;
  onSuccess: (result: CreateLabelResponse) => void;
}

export function SuperfreteGenerateLabelDialog({
  isOpen,
  onClose,
  order,
  customer,
  onSuccess,
}: SuperfreteGenerateLabelDialogProps) {
  const { settings } = useUserSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateLabelResponse | null>(null);

  // Dados do Destinatário
  const [recipientName, setRecipientName] = useState('');
  const [recipientDocument, setRecipientDocument] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientPostalCode, setRecipientPostalCode] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientComplement, setRecipientComplement] = useState('');
  const [recipientDistrict, setRecipientDistrict] = useState('Centro');
  const [recipientCity, setRecipientCity] = useState('');
  const [recipientState, setRecipientState] = useState('SP');

  // Serviço escolhido
  const [service, setService] = useState<number>(order.shippingServiceId ? Number(order.shippingServiceId) : 1);

  // Dimensões do pacote
  const [pkg, setPkg] = useState<SuperfretePackage>({
    weight: settings?.superfreteDefaultPackage?.weight ?? 0.3,
    height: settings?.superfreteDefaultPackage?.height ?? 6,
    width: settings?.superfreteDefaultPackage?.width ?? 16,
    length: settings?.superfreteDefaultPackage?.length ?? 20,
  });


  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setRecipientName(customer?.name || order.customerName || '');
      setRecipientPhone(customer?.phone || order.customerPhone || '');
      setRecipientPostalCode(customer?.zipCode || '');
      setRecipientAddress(customer?.street || customer?.address || '');
      setRecipientNumber(customer?.number || '');
      setRecipientComplement(customer?.complement || '');
      setRecipientDistrict(customer?.notes?.includes('Bairro:') ? customer.notes : 'Centro');
      setRecipientCity(customer?.city || '');
      setRecipientState((customer?.state || 'SP').toUpperCase().slice(0, 2));

      // Se o pedido já tiver etiqueta gerada previamente
      if (order.shippingLabelUrl || order.shippingTrackingNumber) {
        setResult({
          success: true,
          tagId: order.shippingTagId || '',
          status: order.shippingStatus || 'released',
          trackingCode: order.shippingTrackingNumber,
          labelPdfUrl: order.shippingLabelUrl,
        });
      }
    }
  }, [isOpen, order, customer]);

  const handleGenerate = async () => {
    const cleanDoc = recipientDocument.replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      setError('O CPF ou CNPJ do destinatário é obrigatório para emitir a etiqueta (11 ou 14 dígitos).');
      return;
    }

    const cleanCep = recipientPostalCode.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setError('O CEP do destinatário deve conter 8 dígitos.');
      return;
    }

    if (!recipientAddress.trim()) {
      setError('O endereço (rua) do destinatário é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    const fromData = {
      name: settings?.businessName || 'Ateliê Luisices',
      address: settings?.businessAddress || 'Rua Principal',
      number: settings?.businessNumber || '100',
      complement: settings?.businessComplement || '',
      district: 'Centro',
      city: settings?.businessCity || 'São Paulo',
      state_abbr: (settings?.businessState || 'SP').toUpperCase().slice(0, 2),
      postal_code: (settings?.businessZipCode || '01153000').replace(/\D/g, ''),
      document: settings?.superfreteSenderDocument?.replace(/\D/g, '') || undefined,
    };

    const toData = {
      name: recipientName.trim(),
      document: cleanDoc,
      phone: recipientPhone.replace(/\D/g, '') || null,
      address: recipientAddress.trim(),
      number: recipientNumber.trim() || 'S/N',
      complement: recipientComplement.trim() || undefined,
      district: recipientDistrict.trim() || 'Centro',
      city: recipientCity.trim() || 'São Paulo',
      state_abbr: recipientState.trim().toUpperCase().slice(0, 2) || 'SP',
      postal_code: cleanCep,
    };

    try {
      const response = await superfreteService.createLabel({
        orderId: order.id,
        from: fromData,
        to: toData,
        service,
        volume: pkg,
        products: [
          {
            name: order.productName || 'Produto Artesanal Personalizado',
            quantity: Math.max(1, order.quantity || 1),
            unitary_value: Math.max(1, (order.price || 50) / Math.max(1, order.quantity || 1)),
          },
        ],
        nonCommercial: true,
      });

      setResult(response);
      onSuccess(response);
      toast.success('Etiqueta emitida com sucesso!');
    } catch (err: any) {
      console.error('[SuperfreteLabel] Erro ao emitir etiqueta:', err);
      setError(err?.message || 'Falha ao emitir etiqueta na SuperFrete.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTracking = () => {
    if (result?.trackingCode) {
      navigator.clipboard.writeText(result.trackingCode);
      toast.success('Código de rastreamento copiado!');
    }
  };

  const handleSendWhatsAppTracking = () => {
    if (!result?.trackingCode || !recipientPhone) return;
    const cleanPhone = normalizePhoneForWhatsApp(recipientPhone);
    const msg = `Olá, ${recipientName}! Seu pedido *${order.orderNumber || order.productName}* foi postado com sucesso!\n\n📦 *Código de Rastreamento:* ${result.trackingCode}\nVocê pode acompanhar a entrega diretamente pelo site dos Correios/Transportadora.\n\nQualquer dúvida estamos à disposição!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              Emitir Etiqueta de Envio (SuperFrete)
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              Sandbox
            </Badge>
          </div>
          <DialogDescription>
            Pedido #{order.orderNumber || order.id.slice(0, 8)} — {order.productName}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-2">
          {/* Se a etiqueta já foi emitida com sucesso */}
          {result && (
            <div className="space-y-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-card-foreground animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="size-5" />
                Etiqueta Emitida e Liberada!
              </div>

              {result.trackingCode && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Código de Rastreio
                    </span>
                    <div className="font-mono font-bold text-base text-primary">
                      {result.trackingCode}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCopyTracking} className="gap-1.5 text-xs">
                    <Copy className="size-3.5" />
                    Copiar
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {result.labelPdfUrl && (
                  <Button
                    onClick={() => window.open(result.labelPdfUrl!, '_blank')}
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <FileText className="size-4" />
                    Abrir Etiqueta (PDF para Imprimir)
                    <ExternalLink className="size-3.5 opacity-70" />
                  </Button>
                )}

                {recipientPhone && (
                  <Button
                    variant="outline"
                    onClick={handleSendWhatsAppTracking}
                    className="gap-2 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Send className="size-4" />
                    Notificar Cliente no WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}

          {!result && (
            <div className="space-y-4">
              {/* Seleção do Serviço */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Serviço de Envio</Label>
                <Select value={String(service)} onValueChange={(val) => setService(Number(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Correios PAC</SelectItem>
                    <SelectItem value="2">Correios SEDEX</SelectItem>
                    <SelectItem value="17">Correios Mini Envios</SelectItem>
                    <SelectItem value="3">Jadlog (.Package)</SelectItem>
                    <SelectItem value="31">Loggi Express</SelectItem>
                    <SelectItem value="33">J&T Express</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dados do Destinatário */}
              <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
                <div className="text-xs font-semibold text-foreground">Destinatário</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Nome Completo</span>
                    <Input
                      className="h-8 text-xs"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">
                      CPF / CNPJ <strong className="text-destructive">*</strong>
                    </span>
                    <Input
                      className="h-8 text-xs"
                      placeholder="000.000.000-00"
                      value={recipientDocument}
                      onChange={(e) => setRecipientDocument(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">CEP</span>
                    <Input
                      className="h-8 text-xs"
                      placeholder="00000-000"
                      value={recipientPostalCode}
                      onChange={(e) => setRecipientPostalCode(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Endereço (Rua)</span>
                    <Input
                      className="h-8 text-xs"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Número</span>
                    <Input
                      className="h-8 text-xs"
                      placeholder="S/N"
                      value={recipientNumber}
                      onChange={(e) => setRecipientNumber(e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Bairro</span>
                    <Input
                      className="h-8 text-xs"
                      value={recipientDistrict}
                      onChange={(e) => setRecipientDistrict(e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Cidade</span>
                    <Input
                      className="h-8 text-xs"
                      value={recipientCity}
                      onChange={(e) => setRecipientCity(e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">UF</span>
                    <Input
                      className="h-8 text-xs"
                      maxLength={2}
                      value={recipientState}
                      onChange={(e) => setRecipientState(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>

              {/* Dimensões do Pacote */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-muted/10">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  Dimensões e Peso do Pacote
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Peso (kg)</span>
                    <Input
                      type="number"
                      step="0.05"
                      className="h-7 text-xs"
                      value={pkg.weight}
                      onChange={(e) => setPkg({ ...pkg, weight: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Alt (cm)</span>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={pkg.height}
                      onChange={(e) => setPkg({ ...pkg, height: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Larg (cm)</span>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={pkg.width}
                      onChange={(e) => setPkg({ ...pkg, width: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Comp (cm)</span>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={pkg.length}
                      onChange={(e) => setPkg({ ...pkg, length: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {result ? 'Concluir' : 'Cancelar'}
          </Button>

          {!result && (
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Emitindo Etiqueta...
                </>
              ) : (
                <>
                  <Truck className="size-4" />
                  Emitir Etiqueta
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
