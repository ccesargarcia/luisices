import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { X } from 'lucide-react';

interface DangerZoneSectionProps {
  onReset: () => Promise<void>;
}

export function DangerZoneSection({ onReset }: DangerZoneSectionProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
        <CardDescription>Ações irreversíveis</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Resetar as configurações irá remover todas as personalizações, incluindo imagens enviadas.
          </AlertDescription>
        </Alert>
        <Button variant="destructive" className="mt-4" onClick={onReset}>
          <X className="size-4 mr-2" />
          Resetar Todas as Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
