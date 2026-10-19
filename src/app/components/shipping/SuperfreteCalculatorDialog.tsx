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
  Truck,
  Loader2,
  Calendar,
  AlertCircle,
  Package,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import {
  superfreteService,
  SuperfreteShippingService,
  SuperfretePackage,
} from '../../../services/superfreteService';
import { useUserSettings } from '../../../hooks/useUserSettings';

interface SuperfreteCalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  destinationZipCode?: string;
  customerName?: string;
  defaultPackage?: SuperfretePackage;
  onSelectService?: (service: SuperfreteShippingService) => void;
}

export function SuperfreteCalculatorDialog({
  isOpen,
  onClose,
  destinationZipCode = '',
  customerName,
  defaultPackage,
  onSelectService,
}: SuperfreteCalculatorDialogProps) {
  const { settings } = useUserSettings();
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<SuperfreteShippingService[]>([]);
  const [showDimensions, setShowDimensions] = useState(false);
  const [pkg, setPkg] = useState<SuperfretePackage>({
    weight: defaultPackage?.weight ?? settings?.superfreteDefaultPackage?.weight ?? 0.3,
    height: defaultPackage?.height ?? settings?.superfreteDefaultPackage?.height ?? 6,
    width: defaultPackage?.width ?? settings?.superfreteDefaultPackage?.width ?? 16,
    length: defaultPackage?.length ?? settings?.superfreteDefaultPackage?.length ?? 20,
  });

  const originCep = settings?.businessZipCode || '01153000';

  useEffect(() => {
    if (isOpen) {
      const clean = (destinationZipCode || '').replace(/\D/g, '');
      setCep(clean);
      setServices([]);
      setError(null);
      if (clean.length === 8) {
        handleCalculate(clean);
      }
    }
  }, [isOpen, destinationZipCode]);

  const handleCalculate = async (targetCep?: string) => {
    const rawCep = targetCep || cep;
    const cleanTo = rawCep.replace(/\D/g, '');
    if (cleanTo.length !== 8) {
      setError('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanFrom = originCep.replace(/\D/g, '') || '01153000';
      const result = await superfreteService.calculateShipping({
        fromPostalCode: cleanFrom,
        toPostalCode: cleanTo,
        packageDimensions: pkg,
      });

      if (result.success && Array.isArray(result.services)) {
        // Filtra serviços válidos sem erro grave de rota
        setServices(result.services);
        if (result.services.length === 0) {
          setError('Nenhum serviço de entrega disponível para este CEP.');
        }
      } else {
        setError('Não foi possível obter cotações para este endereço.');
      }
    } catch (err: any) {
      console.error('[SuperfreteCalculator] Erro na cotação:', err);
      setError(err?.message || 'Falha ao consultar cotação na SuperFrete.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (svc: SuperfreteShippingService) => {
    if (onSelectService) {
      onSelectService(svc);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              Cálculo de Frete (SuperFrete)
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              Sandbox
            </Badge>
          </div>
          <DialogDescription>
            {customerName ? `Cotação de envio para ${customerName}` : 'Consulte preços e prazos de entrega.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-2">
          {/* Campo CEP de Destino */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="dest-cep" className="text-xs font-semibold">
                CEP de Destino
              </Label>
              <Input
                id="dest-cep"
                placeholder="00000-000"
                maxLength={9}
                value={cep}
                onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
              />
            </div>
            <Button
              onClick={() => handleCalculate()}
              disabled={loading || cep.replace(/\D/g, '').length !== 8}
              className="gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Cotar'}
            </Button>
          </div>

          {/* Toggle de Dimensões Avançadas */}
          <div className="border rounded-lg p-3 bg-muted/20">
            <button
              type="button"
              onClick={() => setShowDimensions(!showDimensions)}
              className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Package className="size-3.5" />
                Dimensões do Pacote: {pkg.weight}kg ({pkg.height}x{pkg.width}x{pkg.length}cm)
              </span>
              {showDimensions ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showDimensions && (
              <div className="grid grid-cols-4 gap-2 pt-3 animate-in fade-in-50 duration-150">
                <div>
                  <span className="text-[10px] text-muted-foreground">Peso (kg)</span>
                  <Input
                    type="number"
                    step="0.05"
                    className="h-8 text-xs"
                    value={pkg.weight}
                    onChange={(e) => setPkg({ ...pkg, weight: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Alt (cm)</span>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={pkg.height}
                    onChange={(e) => setPkg({ ...pkg, height: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Larg (cm)</span>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={pkg.width}
                    onChange={(e) => setPkg({ ...pkg, width: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Comp (cm)</span>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={pkg.length}
                    onChange={(e) => setPkg({ ...pkg, length: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Lista de Opções de Frete */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Consultando transportadoras parceiras...</p>
            </div>
          )}

          {!loading && services.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    svc.error
                      ? 'opacity-50 bg-muted/20 border-muted'
                      : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer bg-card'
                  }`}
                  onClick={() => !svc.error && handleSelect(svc)}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{svc.name}</span>
                      {svc.company && (
                        <Badge variant="secondary" className="text-[10px]">
                          {svc.company}
                        </Badge>
                      )}
                    </div>
                    {svc.error ? (
                      <span className="text-[11px] text-destructive">{svc.error}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        Prazo estimado: {svc.deliveryTime} dia{svc.deliveryTime > 1 ? 's' : ''} úteis
                      </span>
                    )}
                  </div>

                  {!svc.error && (
                    <div className="text-right space-y-0.5">
                      <div className="text-sm font-bold text-primary">
                        {formatCurrency(svc.price)}
                      </div>
                      {svc.discount > 0 && (
                        <div className="text-[10px] text-muted-foreground line-through">
                          {formatCurrency(svc.originalPrice)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
