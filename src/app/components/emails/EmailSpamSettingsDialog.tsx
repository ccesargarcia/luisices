import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ShieldAlert, CheckCircle2, ShieldBan, Plus, ShieldCheck } from 'lucide-react';

export interface EmailSpamSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockedSenders: string[];
  newBlockedSenderInput: string;
  setNewBlockedSenderInput: (val: string) => void;
  handleBlockSender: (sender: string) => void;
  handleUnblockSender: (sender: string) => void;
  allowedSenders: string[];
  newAllowedSenderInput: string;
  setNewAllowedSenderInput: (val: string) => void;
  handleAllowSender: (sender: string) => void;
  handleUnallowSender: (sender: string) => void;
}

export function EmailSpamSettingsDialog({
  isOpen,
  onClose,
  blockedSenders,
  newBlockedSenderInput,
  setNewBlockedSenderInput,
  handleBlockSender,
  handleUnblockSender,
  allowedSenders,
  newAllowedSenderInput,
  setNewAllowedSenderInput,
  handleAllowSender,
  handleUnallowSender,
}: EmailSpamSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="2xl" className="max-h-[90dvh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400" />
            <span>Configuração do Filtro Antispam</span>
          </DialogTitle>
          <DialogDescription className="text-xs mt-0.5">
            Gerencie a lista de remetentes bloqueados e de confiança para proteger sua caixa de entrada contra fraudes e spam.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          {/* Explicação da Heurística */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>Como o filtro funciona</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              O Luisices analisa automaticamente os e-mails recebidos em busca de golpes, phishing, domínios descartáveis temporários e palavras apelativas. Você também pode cadastrar e-mails ou domínios inteiros (ex: <code className="text-foreground">@dominio.com</code>) para bloquear ou aprovar previamente.
            </p>
          </div>

          {/* Seção 1: Remetentes Bloqueados (Blacklist) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldBan className="size-3.5 text-destructive" />
                  <span>Remetentes Bloqueados (Blacklist)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  E-mails enviados por esses remetentes ou domínios irão direto para a pasta Spam.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {blockedSenders.length} bloqueado(s)
              </Badge>
            </div>

            {/* Input para adicionar bloqueado */}
            <div className="flex gap-2">
              <Input
                placeholder="ex: spammer@dominio.com ou @dominio.com"
                value={newBlockedSenderInput}
                onChange={(e) => setNewBlockedSenderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newBlockedSenderInput.trim()) {
                      handleBlockSender(newBlockedSenderInput.trim());
                      setNewBlockedSenderInput('');
                    }
                  }
                }}
                className="h-8 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (newBlockedSenderInput.trim()) {
                    handleBlockSender(newBlockedSenderInput.trim());
                    setNewBlockedSenderInput('');
                  }
                }}
                className="h-8 text-xs gap-1 shrink-0"
              >
                <Plus className="size-3.5" />
                <span>Bloquear</span>
              </Button>
            </div>

            {/* Lista de bloqueados */}
            <div className="rounded-lg border max-h-40 overflow-y-auto divide-y bg-card">
              {blockedSenders.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-[11px]">
                  Nenhum remetente bloqueado manualmente no momento.
                </div>
              ) : (
                blockedSenders.map((senderItem) => (
                  <div
                    key={senderItem}
                    className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                  >
                    <span className="font-mono text-[11px] text-foreground truncate">{senderItem}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnblockSender(senderItem)}
                      className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Remover
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Seção 2: Remetentes Confiáveis (Whitelist) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>Remetentes Confiáveis (Whitelist)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  E-mails desta lista nunca serão classificados como spam e chegarão direto na Entrada.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {allowedSenders.length} confiável(is)
              </Badge>
            </div>

            {/* Input para adicionar confiável */}
            <div className="flex gap-2">
              <Input
                placeholder="ex: parceiro@loja.com.br ou @loja.com.br"
                value={newAllowedSenderInput}
                onChange={(e) => setNewAllowedSenderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newAllowedSenderInput.trim()) {
                      handleAllowSender(newAllowedSenderInput.trim());
                      setNewAllowedSenderInput('');
                    }
                  }
                }}
                className="h-8 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (newAllowedSenderInput.trim()) {
                    handleAllowSender(newAllowedSenderInput.trim());
                    setNewAllowedSenderInput('');
                  }
                }}
                className="h-8 text-xs gap-1 shrink-0 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                <Plus className="size-3.5" />
                <span>Confiar</span>
              </Button>
            </div>

            {/* Lista de confiáveis */}
            <div className="rounded-lg border max-h-40 overflow-y-auto divide-y bg-card">
              {allowedSenders.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-[11px]">
                  Nenhum remetente confiável específico cadastrado.
                </div>
              ) : (
                allowedSenders.map((senderItem) => (
                  <div
                    key={senderItem}
                    className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                  >
                    <span className="font-mono text-[11px] text-foreground truncate">{senderItem}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnallowSender(senderItem)}
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Remover
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/60 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="text-xs h-8"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
