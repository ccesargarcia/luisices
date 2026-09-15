import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { DASHBOARD_CARD_CONFIGS, DEFAULT_DASHBOARD_CARDS } from '../../utils/dashboardCards';

interface DashboardPrefsSectionProps {
  selectedCards: string[];
  onSelectedCardsChange: (cards: string[]) => void;
  defaultReportPeriod: 'week' | 'month' | 'quarter' | 'year';
  onDefaultReportPeriodChange: (period: 'week' | 'month' | 'quarter' | 'year') => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function DashboardPrefsSection({
  selectedCards,
  onSelectedCardsChange,
  defaultReportPeriod,
  onDefaultReportPeriodChange,
  onSave,
  saving,
}: DashboardPrefsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="size-5" />
          Preferências do Dashboard
        </CardTitle>
        <CardDescription>
          Escolha quais cards exibir e o período padrão dos relatórios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cards visíveis */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cards / Métricas visíveis</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DASHBOARD_CARD_CONFIGS.map((card) => {
              const checked = selectedCards.includes(card.id);
              return (
                <div key={card.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`card-${card.id}`}
                    checked={checked}
                    onCheckedChange={(v) =>
                      onSelectedCardsChange(
                        v ? [...selectedCards, card.id] : selectedCards.filter((id) => id !== card.id)
                      )
                    }
                  />
                  <div className="leading-none">
                    <label
                      htmlFor={`card-${card.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {card.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectedCardsChange(DEFAULT_DASHBOARD_CARDS)}
            >
              Selecionar todos
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectedCardsChange([])}
            >
              Desmarcar todos
            </Button>
          </div>
        </div>

        {/* Período padrão dos relatórios */}
        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="default-period">
            Período padrão dos relatórios
          </Label>
          <Select
            value={defaultReportPeriod}
            onValueChange={(v) => onDefaultReportPeriodChange(v as typeof defaultReportPeriod)}
          >
            <SelectTrigger id="default-period" className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Último Mês</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="year">Último Ano</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O relatório sempre abrirá neste período por padrão
          </p>
        </div>

        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Preferências'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
