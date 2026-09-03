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
        <CardTitle className="text-destructive">Ações irreversíveis</CardTitle>
        <CardDescription>Ações irreversíveis</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Restaurar as configurações padrão removerá todas as personalizações, incluindo imagens enviadas.
          </AlertDescription>
        </Alert>
        <Button variant="destructive" className="mt-4" onClick={onReset}>
          <X className="size-4 mr-2" />
          Restaurar configurações padrão
        </Button>
      </CardContent>
    </Card>
  );
}
