import { useState, useEffect } from 'react';
import { StudioPricingSettings } from '../../types';
import {
  calculateHourlyRate,
  DEFAULT_PRICING_SETTINGS,
} from '../../utils/pricingCalculations';
import { firebasePricingService } from '../../../services/firebasePricingService';
import { formatCurrency } from '../../utils/currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
  Clock,
  DollarSign,
  Briefcase,
  Zap,
  Save,
  Loader2,
  Info,
  Building,
  Percent,
} from 'lucide-react';

interface StudioSettingsTabProps {
  initialSettings?: StudioPricingSettings | null;
  onSettingsSaved?: (settings: StudioPricingSettings) => void;
}

export function StudioSettingsTab({
  initialSettings,
  onSettingsSaved,
}: StudioSettingsTabProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [desiredSalary, setDesiredSalary] = useState<number>(3000);
  const [workingDays, setWorkingDays] = useState<number>(20);
  const [workingHours, setWorkingHours] = useState<number>(6);

  // Fixed expenses
  const [rent, setRent] = useState<number>(0);
  const [electricity, setElectricity] = useState<number>(120);
  const [internet, setInternet] = useState<number>(100);
  const [meiTax, setMeiTax] = useState<number>(75);
  const [softwareSubscriptions, setSoftwareSubscriptions] = useState<number>(45);
  const [otherFixedExpenses, setOtherFixedExpenses] = useState<number>(50);

  // Default rates
  const [wasteMargin, setWasteMargin] = useState<number>(10);
  const [paymentFee, setPaymentFee] = useState<number>(4.5);
  const [profitMargin, setProfitMargin] = useState<number>(50);

  useEffect(() => {
    if (initialSettings) {
      setDesiredSalary(initialSettings.desiredSalary ?? DEFAULT_PRICING_SETTINGS.desiredSalary);
      setWorkingDays(initialSettings.workingDaysPerMonth ?? DEFAULT_PRICING_SETTINGS.workingDaysPerMonth);
      setWorkingHours(initialSettings.workingHoursPerDay ?? DEFAULT_PRICING_SETTINGS.workingHoursPerDay);

      const fixed = initialSettings.monthlyFixedExpenses || {};
      setRent(fixed.rent ?? 0);
      setElectricity(fixed.electricity ?? 120);
      setInternet(fixed.internet ?? 100);
      setMeiTax(fixed.meiTax ?? 75);
      setSoftwareSubscriptions(fixed.softwareSubscriptions ?? 45);
      setOtherFixedExpenses(fixed.otherFixedExpenses ?? 50);

      setWasteMargin(initialSettings.defaultWasteMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultWasteMarginPercent);
      setPaymentFee(initialSettings.defaultPaymentFeePercent ?? DEFAULT_PRICING_SETTINGS.defaultPaymentFeePercent);
      setProfitMargin(initialSettings.defaultProfitMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultProfitMarginPercent);
    } else {
      loadSettings();
    }
  }, [initialSettings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const s = await firebasePricingService.getStudioSettings();
      setDesiredSalary(s.desiredSalary);
      setWorkingDays(s.workingDaysPerMonth);
      setWorkingHours(s.workingHoursPerDay);

      setRent(s.monthlyFixedExpenses.rent ?? 0);
      setElectricity(s.monthlyFixedExpenses.electricity ?? 120);
      setInternet(s.monthlyFixedExpenses.internet ?? 100);
      setMeiTax(s.monthlyFixedExpenses.meiTax ?? 75);
      setSoftwareSubscriptions(s.monthlyFixedExpenses.softwareSubscriptions ?? 45);
      setOtherFixedExpenses(s.monthlyFixedExpenses.otherFixedExpenses ?? 50);

      setWasteMargin(s.defaultWasteMarginPercent);
      setPaymentFee(s.defaultPaymentFeePercent);
      setProfitMargin(s.defaultProfitMarginPercent);
    } catch (err) {
      console.error('Erro ao carregar configurações do ateliê:', err);
    } finally {
      setLoading(false);
    }
  };

  // Live calculation
  const currentHourly = calculateHourlyRate({
    desiredSalary,
    workingDaysPerMonth: workingDays,
    workingHoursPerDay: workingHours,
    monthlyFixedExpenses: {
      rent,
      electricity,
      internet,
      meiTax,
      softwareSubscriptions,
      otherFixedExpenses,
    },
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const saved = await firebasePricingService.saveStudioSettings({
        desiredSalary,
        workingDaysPerMonth: workingDays,
        workingHoursPerDay: workingHours,
        monthlyFixedExpenses: {
          rent,
          electricity,
          internet,
          meiTax,
          softwareSubscriptions,
          otherFixedExpenses,
        },
        defaultWasteMarginPercent: wasteMargin,
        defaultPaymentFeePercent: paymentFee,
        defaultProfitMarginPercent: profitMargin,
      });

      toast.success('Configurações do ateliê salvas com sucesso!');
      if (onSettingsSaved) onSettingsSaved(saved);
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Destaque: Custo por Hora e Minuto */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <Clock className="size-3.5" />
                Custo de Operação do Ateliê
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Quanto vale o seu trabalho
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl">
                Este valor é usado automaticamente para precificar cada minuto que você dedica ao corte, montagem e acabamento das encomendas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 bg-background/80 backdrop-blur-sm p-4 rounded-xl border">
              <div>
                <div className="text-xs text-muted-foreground">Valor por Hora</div>
                <div className="text-2xl sm:text-3xl font-black text-primary">
                  {formatCurrency(currentHourly.hourlyRate)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {currentHourly.monthlyHours}h produtivas/mês
                </div>
              </div>
              <div className="border-l pl-4 sm:pl-6">
                <div className="text-xs text-muted-foreground">Valor por Minuto</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(currentHourly.minuteRate)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {formatCurrency(currentHourly.minuteRate * 20)} por 20 min
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-primary/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-primary shrink-0" />
              <span>
                <strong>Pró-labore por hora:</strong> {formatCurrency(currentHourly.salaryPerHour)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="size-4 text-primary shrink-0" />
              <span>
                <strong>Despesas fixas por hora:</strong> {formatCurrency(currentHourly.fixedCostPerHour)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary shrink-0" />
              <span>
                <strong>Total despesas do ateliê:</strong> {formatCurrency(currentHourly.totalFixedExpenses)}/mês
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Mão de Obra e Jornada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="size-4 text-primary" />
              1. Jornada de Trabalho & Salário Desejado
            </CardTitle>
            <CardDescription>
              Defina quanto você deseja retirar por mês e sua disponibilidade produtiva.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="salary" className="text-xs">
                Salário Mensal Pretendido (Pró-labore) (R$)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="50"
                  className="pl-9"
                  value={desiredSalary || ''}
                  onChange={(e) => setDesiredSalary(parseFloat(e.target.value) || 0)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Remuneração líquida pelo seu tempo investido na confecção.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="days" className="text-xs">
                  Dias trabalhados por mês
                </Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="31"
                  className="mt-1"
                  value={workingDays || ''}
                  onChange={(e) => setWorkingDays(parseInt(e.target.value) || 1)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ex: 20 dias (segunda a sexta)
                </p>
              </div>
              <div>
                <Label htmlFor="hours" className="text-xs">
                  Horas produtivas por dia
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="24"
                  className="mt-1"
                  value={workingHours || ''}
                  onChange={(e) => setWorkingHours(parseFloat(e.target.value) || 1)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ex: 6 horas de foco em confecção
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Custos Fixos Mensais do Ateliê */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="size-4 text-primary" />
              2. Despesas Fixas Mensais do Ateliê
            </CardTitle>
            <CardDescription>
              Custos operacionais que você tem todo mês, independente de quantas vendas fizer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="electricity" className="text-xs">
                  Energia Elétrica (R$)
                </Label>
                <Input
                  id="electricity"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={electricity || ''}
                  onChange={(e) => setElectricity(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="internet" className="text-xs">
                  Internet / Celular (R$)
                </Label>
                <Input
                  id="internet"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={internet || ''}
                  onChange={(e) => setInternet(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mei" className="text-xs">
                  Guia DAS MEI (R$)
                </Label>
                <Input
                  id="mei"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={meiTax || ''}
                  onChange={(e) => setMeiTax(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="softwares" className="text-xs">
                  Softwares & Assinaturas (R$)
                </Label>
                <Input
                  id="softwares"
                  type="number"
                  min="0"
                  className="mt-1"
                  placeholder="Canva, Silhouette, etc."
                  value={softwareSubscriptions || ''}
                  onChange={(e) => setSoftwareSubscriptions(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rent" className="text-xs">
                  Aluguel do Espaço (R$)
                </Label>
                <Input
                  id="rent"
                  type="number"
                  min="0"
                  className="mt-1"
                  placeholder="Se for ateliê alugado"
                  value={rent || ''}
                  onChange={(e) => setRent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="other" className="text-xs">
                  Lâminas, Manutenção e Outros (R$)
                </Label>
                <Input
                  id="other"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={otherFixedExpenses || ''}
                  onChange={(e) => setOtherFixedExpenses(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Taxas e Margens Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="size-4 text-primary" />
            3. Padrões de Perda, Taxas de Pagamento e Margem de Lucro
          </CardTitle>
          <CardDescription>
            Esses percentuais serão sugeridos automaticamente ao criar novas fichas técnicas, mas podem ser ajustados individualmente por produto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="waste" className="text-xs font-semibold">
                  Perda de Material Padrão
                </Label>
                <span className="text-sm font-bold text-primary">{wasteMargin}%</span>
              </div>
              <Input
                id="waste"
                type="number"
                min="0"
                max="50"
                step="1"
                value={wasteMargin || ''}
                onChange={(e) => setWasteMargin(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[11px] text-muted-foreground">
                Cobre testes de corte, erro de impressão e sobras de folha (sugerido: 5% a 15%).
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="fee" className="text-xs font-semibold">
                  Taxa de Cartão / Maquininha
                </Label>
                <span className="text-sm font-bold text-primary">{paymentFee}%</span>
              </div>
              <Input
                id="fee"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={paymentFee || ''}
                onChange={(e) => setPaymentFee(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[11px] text-muted-foreground">
                Taxa média de maquininha ou parcelamento para não ser descontada do seu lucro.
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="profit" className="text-xs font-semibold">
                  Margem de Lucro Líquida Padrão
                </Label>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {profitMargin}%
                </span>
              </div>
              <Input
                id="profit"
                type="number"
                min="5"
                max="200"
                step="5"
                value={profitMargin || ''}
                onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[11px] text-muted-foreground">
                Lucro real que sobra para a empresa investir em crescimento e novas ferramentas.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar Configurações do Ateliê
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
