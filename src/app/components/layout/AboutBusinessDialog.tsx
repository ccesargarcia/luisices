import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Package2, Info } from 'lucide-react';

interface AboutBusinessDialogProps {
  businessName: string;
  logo?: string;
  businessTagline?: string;
  businessEmail?: string;
  businessPhone?: string;
  isDevEnvironment: boolean;
  appVersion: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutBusinessDialog({
  businessName,
  logo,
  businessTagline,
  businessEmail,
  businessPhone,
  isDevEnvironment,
  appVersion,
  open,
  onOpenChange,
}: AboutBusinessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <Info className="size-3" />
          v{appVersion} · © {new Date().getFullYear()} {businessName}
        </button>
      </DialogTrigger>
      <DialogContent size="md" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt={businessName} className="h-8 object-contain" />
            ) : (
              <div className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md">
                <Package2 className="size-4" />
              </div>
            )}
            {businessName}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="p-4 sm:p-6 space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Versão</span>
            <Badge variant="secondary" className="font-mono">{appVersion}</Badge>
          </div>
          {businessTagline && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Descrição</span>
              <span>{businessTagline}</span>
            </div>
          )}
          {businessEmail && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Email</span>
              <span>{businessEmail}</span>
            </div>
          )}
          {businessPhone && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Telefone</span>
              <span>{businessPhone}</span>
            </div>
          )}
          {isDevEnvironment && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Ambiente</span>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-400 font-mono">DEV</Badge>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center pt-2">
            © {new Date().getFullYear()} {businessName}. Todos os direitos reservados.
          </p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
