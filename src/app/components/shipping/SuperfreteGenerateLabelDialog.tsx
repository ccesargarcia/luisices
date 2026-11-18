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
  SuperfreteShippingService,
} from '../../../services/superfreteService';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { normalizePhoneForWhatsApp } from '../../utils/whatsapp';
import { fetchAddressByCep, formatCepInput, normalizeCepDigits } from '../../utils/cepLookup';
import { formatCpfCnpjInput, isValidCpfCnpj, normalizeCpfCnpj } from '../../utils/documentFormat';
import {
  PackageDimensionInputs,
  hasCompletePackageDimensions,
  parsePackageDimensions,
  toPackageDimensionInputs,
} from '../../utils/packageDimensions';
import { PackageDimensionsFields } from './PackageDimensionsFields';

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
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [cepLookupError, setCepLookupError] = useState('');
  const lastFetchedCepRef = React.useRef('');
  const [shippingQuotes, setShippingQuotes] = useState<SuperfreteShippingService[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  // Serviço escolhido
  const [service, setService] = useState<number>(order.shippingServiceId ? Number(order.shippingServiceId) : 1);

  // Dimensões do pacote
  const [pkgInputs, setPkgInputs] = useState<PackageDimensionInputs>(() =>
    toPackageDimensionInputs(settings?.superfreteDefaultPackage),
  );
  const parsedPkg = parsePackageDimensions(pkgInputs, settings?.superfreteDefaultPackage);


  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setCepLookupError('');
      setCepLookupLoading(false);
      setShippingQuotes([]);
      setQuotesError(null);
      setQuotesLoading(false);
      setPkgInputs(toPackageDimensionInputs(settings?.superfreteDefaultPackage));
      const initialCep = normalizeCepDigits(customer?.zipCode || '');
      // Se o cliente já tem endereço completo salvo, evita sobrescrever na abertura; caso contrário consulta o CEP.
      const hasSavedAddress = Boolean((customer?.street || customer?.address) && customer?.city && customer?.state);
      lastFetchedCepRef.current = hasSavedAddress && initialCep.length === 8 ? initialCep : '';

      setRecipientName(customer?.name || order.customerName || '');
      setRecipientPhone(customer?.phone || order.customerPhone || '');
      setRecipientPostalCode(customer?.zipCode ? formatCepInput(customer.zipCode) : '');
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

  useEffect(() => {
    if (!isOpen || result) return;
    const digits = normalizeCepDigits(recipientPostalCode);
    if (digits.length !== 8) {
      setCepLookupLoading(false);
      setCepLookupError('');
      if (digits.length < 8) {
        lastFetchedCepRef.current = '';
      }
      return;
    }
    if (lastFetchedCepRef.current === digits) {
      return;
    }

    const controller = new AbortController();
    const runLookup = async () => {
      setCepLookupLoading(true);
      setCepLookupError('');
      try {
        const address = await fetchAddressByCep(digits, controller.signal);
        if (controller.signal.aborted) return;
        lastFetchedCepRef.current = digits;
        if (!address) {
          setCepLookupError('CEP não encontrado. Preencha o endereço manualmente.');
          return;
        }
        setRecipientAddress((prev) => address.street || prev);
        setRecipientDistrict((prev) => address.district || prev);
        setRecipientCity((prev) => address.city || prev);
        setRecipientState((prev) => address.state || prev);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setCepLookupError('Não foi possível consultar o CEP. Preencha manualmente.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCepLookupLoading(false);
        }
      }
    };

    void runLookup();
    return () => controller.abort();
  }, [isOpen, result, recipientPostalCode]);

  useEffect(() => {
    if (!isOpen || result) return;
    const digits = normalizeCepDigits(recipientPostalCode);
    if (digits.length !== 8 || !hasCompletePackageDimensions(pkgInputs)) {
      if (digits.length !== 8) {
        setShippingQuotes([]);
        setQuotesError(null);
      }
      setQuotesLoading(false);
      return;
    }

    let cancelled = false;
    setQuotesLoading(true);
    setQuotesError(null);

    const timer = window.setTimeout(async () => {
      try {
        const cleanFrom = (settings?.businessZipCode || '01153000').replace(/\D/g, '') || '01153000';
        const response = await superfreteService.calculateShipping({
          fromPostalCode: cleanFrom,
          toPostalCode: digits,
          packageDimensions: parsedPkg,
        });
        if (cancelled) return;

        const list = Array.isArray(response?.services) ? response.services : [];
        const sorted = [...list].sort((a, b) => {
          const aAvailable = !a.error && a.price > 0;
          const bAvailable = !b.error && b.price > 0;
          if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
          return (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER);
        });
        setShippingQuotes(sorted);

        const available = sorted.filter((s) => !s.error && s.price > 0);
        if (available.length > 0) {
          setService((current) =>
            available.some((s) => s.id === current) ? current : available[0].id
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setShippingQuotes([]);
          setQuotesError(err?.message || 'Não foi possível comparar os valores de frete para este CEP.');
        }
      } finally {
        if (!cancelled) {
          setQuotesLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, result, recipientPostalCode, pkgInputs.weight, pkgInputs.height, pkgInputs.width, pkgInputs.length, settings?.businessZipCode]);

  const handleGenerate = async () => {
    const cleanDoc = normalizeCpfCnpj(recipientDocument);
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      setError('O CPF ou CNPJ do destinatário é obrigatório para emitir a etiqueta (11 ou 14 posições).');
      return;
    }
    if (!isValidCpfCnpj(cleanDoc)) {
      setError(cleanDoc.length === 11 ? 'O CPF do destinatário é inválido.' : 'O CNPJ do destinatário é inválido.');
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

    if (!hasCompletePackageDimensions(pkgInputs)) {
      setError('Informe peso e dimensões válidos (maiores que zero).');
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
        volume: parsedPkg,
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
              {/* Seleção e Comparação de Serviço */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold">Serviço de Envio</Label>
                  {quotesLoading && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin text-primary" />
                      Comparando valores...
                    </span>
                  )}
                </div>
                <Select value={String(service)} onValueChange={(val) => setService(Number(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { id: 1, label: 'Correios PAC' },
                      { id: 2, label: 'Correios SEDEX' },
                      { id: 17, label: 'Correios Mini Envios' },
                      { id: 3, label: 'Jadlog (.Package)' },
                      { id: 31, label: 'Loggi Express' },
                      { id: 33, label: 'J&T Express' },
                    ].map((opt) => {
                      const quoted = shippingQuotes.find((q) => q.id === opt.id && !q.error && q.price > 0);
                      return (
                        <SelectItem key={opt.id} value={String(opt.id)}>
                          {quoted
                            ? `${opt.label} — ${formatCurrency(quoted.price)}${quoted.deliveryTime ? ` (${quoted.deliveryTime}d úteis)` : ''}`
                            : opt.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {quotesError && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">{quotesError}</p>
                )}

                {shippingQuotes.length > 0 && (() => {
                  const cheapestId = shippingQuotes.find((q) => !q.error && q.price > 0)?.id;
                  return (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-medium text-muted-foreground">
                        Comparação para o CEP {recipientPostalCode}:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {shippingQuotes.map((svc) => {
                          const available = !svc.error && svc.price > 0;
                          const isSelected = service === svc.id;
                          const isCheapest = available && svc.id === cheapestId;
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              disabled={!available}
                              onClick={() => available && setService(svc.id)}
                              className={`text-left p-2 rounded-lg border transition-colors ${
                                !available
                                  ? 'opacity-55 bg-muted/20 border-border cursor-not-allowed'
                                  : isSelected
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-semibold truncate">
                                  {svc.name}
                                </span>
                                {available ? (
                                  <span className="text-xs font-bold text-primary shrink-0">
                                    {formatCurrency(svc.price)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    Indisponível
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-0.5 text-[10px] text-muted-foreground">
                                <span className="truncate">
                                  {svc.company}
                                  {available && svc.deliveryTime ? ` • ${svc.deliveryTime} dia(s) úteis` : ''}
                                  {!available && svc.error ? ` • ${svc.error}` : ''}
                                </span>
                                {isCheapest && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                                    Mais barato
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
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
                      placeholder="CPF ou CNPJ"
                      maxLength={18}
                      value={recipientDocument}
                      onChange={(e) => setRecipientDocument(formatCpfCnpjInput(e.target.value))}
                    />
                    {(() => {
                      const d = normalizeCpfCnpj(recipientDocument);
                      if ((d.length === 11 || d.length === 14) && !isValidCpfCnpj(d)) {
                        return (
                          <p className="text-[10px] text-destructive leading-tight">
                            {d.length === 11 ? 'CPF inválido.' : 'CNPJ inválido.'}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      CEP
                      {cepLookupLoading && <Loader2 className="size-3 animate-spin text-primary" />}
                    </span>
                    <Input
                      className="h-8 text-xs"
                      placeholder="00000-000"
                      maxLength={9}
                      value={recipientPostalCode}
                      onChange={(e) => setRecipientPostalCode(formatCepInput(e.target.value))}
                    />
                    {cepLookupError && (
                      <p className="text-[10px] text-destructive leading-tight">{cepLookupError}</p>
                    )}
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

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">
                    Complemento / Observação <span className="text-[10px]">(máx. 20 caracteres)</span>
                  </span>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Ex: Apto 12, Bloco B"
                    maxLength={20}
                    value={recipientComplement}
                    onChange={(e) => setRecipientComplement(e.target.value)}
                  />
                </div>
              </div>

              {/* Dimensões do Pacote */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-muted/10">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  Dimensões e Peso do Pacote
                </span>
                <PackageDimensionsFields values={pkgInputs} onChange={setPkgInputs} compact />
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
