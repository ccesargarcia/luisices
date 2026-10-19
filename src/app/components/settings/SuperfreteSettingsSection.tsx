import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Truck, ShieldCheck, AlertCircle, Package, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { UserSettings } from '../../../services/firebaseSettingsService';

interface SuperfreteSettingsSectionProps {
  isAdmin: boolean;
  settings: UserSettings | null;
  onSave: (data: Partial<UserSettings>) => Promise<void>;
  saving: boolean;
}

export function SuperfreteSettingsSection({
  isAdmin,
  settings,
  onSave,
  saving,
}: SuperfreteSettingsSectionProps) {
  const [enabled, setEnabled] = useState(false);
  const [senderDocument, setSenderDocument] = useState('');
  const [defaultPackage, setDefaultPackage] = useState({
    weight: 0.3,
    height: 6,
    width: 16,
    length: 20,
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.superfreteEnabled ?? false);
      setSenderDocument(settings.superfreteSenderDocument ?? '');
      if (settings.superfreteDefaultPackage) {
        setDefaultPackage({
          weight: settings.superfreteDefaultPackage.weight ?? 0.3,
          height: settings.superfreteDefaultPackage.height ?? 6,
          width: settings.superfreteDefaultPackage.width ?? 16,
          length: settings.superfreteDefaultPackage.length ?? 20,
        });
      }
    }
  }, [settings]);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-5 text-muted-foreground" />
            Integração SuperFrete
          </CardTitle>
          <CardDescription>
            Cálculo de frete e emissão de etiquetas para uso interno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40 text-muted-foreground text-sm">
            <Lock className="size-4 shrink-0" />
            <span>Apenas administradores podem configurar e ativar as integrações logísticas.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
  };

  const handleSaveSettings = async () => {
    await onSave({
      superfreteEnabled: enabled,
      superfreteSenderDocument: senderDocument.trim(),
      superfreteDefaultPackage: {
        weight: Number(defaultPackage.weight) || 0.3,
        height: Number(defaultPackage.height) || 6,
        width: Number(defaultPackage.width) || 16,
        length: Number(defaultPackage.length) || 20,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-5 text-primary" />
            Integração SuperFrete
          </CardTitle>
          <Badge variant={enabled ? 'default' : 'secondary'} className="text-xs">
            {enabled ? 'Ativo (Sandbox)' : 'Desativado'}
          </Badge>
        </div>
        <CardDescription>
          Cálculo de cotações e emissão de etiquetas (Correios, Jadlog, Loggi) exclusivamente para uso interno em Orçamentos e Pedidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Principal de Admin */}
        <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="superfrete-toggle" className="text-sm font-semibold cursor-pointer">
                Habilitar SuperFrete no Sistema
              </Label>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Admin
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? 'A integração está ativa para cálculo e emissão de etiquetas no painel interno.'
                : 'Recurso adormecido. Nenhuma opção de frete é visível em pedidos ou orçamentos enquanto estiver desligado.'}
            </p>
          </div>
          <Switch
            id="superfrete-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {enabled && (
          <div className="space-y-6 pt-2 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Ambiente fixo: Sandbox
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Esta integração usa exclusivamente a credencial Sandbox e só fica disponível no projeto de desenvolvimento.
                </p>
              </div>

              {/* Documento do Remetente */}
              <div className="space-y-2">
                <Label htmlFor="sender-doc" className="text-sm font-medium">
                  CPF ou CNPJ do Ateliê (Remetente)
                </Label>
                <Input
                  id="sender-doc"
                  placeholder="Ex: 00.000.000/0001-00 ou CPF"
                  value={senderDocument}
                  onChange={(e) => setSenderDocument(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Obrigatório para a emissão da Declaração de Conteúdo na SuperFrete.
                </p>
              </div>
            </div>

            {/* Dados do Remetente Vinculados */}
            <div className="p-4 rounded-lg bg-muted/30 border border-muted text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Endereço de Origem (Remetente)
              </div>
              <p className="text-muted-foreground">
                Utiliza automaticamente os dados cadastrados em <strong className="text-foreground">Informações da Empresa</strong>:
              </p>
              <p className="font-mono text-muted-foreground pt-1">
                {settings?.businessName || 'Ateliê'} — {settings?.businessAddress || 'Endereço'}, {settings?.businessNumber || 'S/N'}{' '}
                — {settings?.businessCity || 'Cidade'}/{settings?.businessState || 'UF'} (CEP: {settings?.businessZipCode || 'Não informado'})
              </p>
            </div>

            {/* Pacote Padrão (Fallback) */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Package className="size-4 text-primary" />
                Dimensões Padrão da Embalagem (Fallback)
              </Label>
              <p className="text-xs text-muted-foreground">
                Utilizadas para calcular o frete quando os produtos do pedido não possuírem peso ou medidas individuais cadastradas.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Peso (kg)</span>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={defaultPackage.weight}
                    onChange={(e) =>
                      setDefaultPackage((prev) => ({ ...prev, weight: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Altura (cm)</span>
                  <Input
                    type="number"
                    step="1"
                    min="2"
                    value={defaultPackage.height}
                    onChange={(e) =>
                      setDefaultPackage((prev) => ({ ...prev, height: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Largura (cm)</span>
                  <Input
                    type="number"
                    step="1"
                    min="11"
                    value={defaultPackage.width}
                    onChange={(e) =>
                      setDefaultPackage((prev) => ({ ...prev, width: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Comprimento (cm)</span>
                  <Input
                    type="number"
                    step="1"
                    min="16"
                    value={defaultPackage.length}
                    onChange={(e) =>
                      setDefaultPackage((prev) => ({ ...prev, length: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                Para emitir etiquetas reais ou em Sandbox, certifique-se de que a carteira na SuperFrete possua saldo suficiente.
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações de Frete'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
