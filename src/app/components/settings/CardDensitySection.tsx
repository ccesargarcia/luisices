import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LayoutGrid, Loader2 } from 'lucide-react';

interface CardDensitySectionProps {
  compactCards: boolean;
  onCompactCardsChange: (compact: boolean) => void;
  onSave: (compact: boolean) => Promise<void>;
  saving: boolean;
}

export function CardDensitySection({
  compactCards,
  onCompactCardsChange,
  onSave,
  saving,
}: CardDensitySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="size-5" />
          Densidade dos Cards
        </CardTitle>
        <CardDescription>
          Escolha o estilo de exibição dos cards de pedidos e orçamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onCompactCardsChange(false)}
            className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
              !compactCards
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="mb-2 space-y-1.5">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
            <span className="text-sm font-medium">Confortável</span>
            <p className="text-xs text-muted-foreground mt-1">Mais espaçamento e informações</p>
          </button>
          <button
            type="button"
            onClick={() => onCompactCardsChange(true)}
            className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
              compactCards
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="mb-2 space-y-1">
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-2 w-3/4 rounded bg-muted" />
            </div>
            <span className="text-sm font-medium">Compacto</span>
            <p className="text-xs text-muted-foreground mt-1">Mais cards na tela</p>
          </button>
        </div>
        <Button onClick={() => onSave(compactCards)} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Densidade'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
