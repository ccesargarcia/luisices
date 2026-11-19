import { Clock3, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SessionSecuritySectionProps {
  value: 0 | 15 | 30 | 60;
  saving: boolean;
  onChange: (value: 0 | 15 | 30 | 60) => void;
  onSave: () => void;
}

export function SessionSecuritySection({ value, saving, onChange, onSave }: SessionSecuritySectionProps) {
  const description = value === 0
    ? 'O encerramento automático por inatividade está desativado para sua conta.'
    : `Sua conta será encerrada após ${value} minutos sem atividade. A atividade em qualquer aba reinicia o prazo nas demais.`;

  return (
    <Card className="bg-card/70 border-glass-border rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          Sessão e inatividade
        </CardTitle>
        <CardDescription>
          Defina quando a sessão deve ser encerrada automaticamente. A opção vale para sua conta em todas as abas deste navegador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="session-idle-timeout" className="flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            Encerrar após inatividade
          </Label>
          <Select value={String(value)} onValueChange={(next) => onChange(Number(next) as 0 | 15 | 30 | 60)}>
            <SelectTrigger id="session-idle-timeout" className="min-h-11 w-full sm:max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Desativado — sem limite</SelectItem>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos (padrão)</SelectItem>
              <SelectItem value="60">60 minutos</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground" aria-live="polite">{description}</p>
        </div>
        <Button type="button" onClick={onSave} disabled={saving} className="min-h-11">
          {saving ? 'Salvando…' : 'Salvar preferência'}
        </Button>
      </CardContent>
    </Card>
  );
}
