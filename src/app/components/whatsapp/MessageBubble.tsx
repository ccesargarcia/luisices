import React from 'react';
import {
  Trash2,
  CheckCheck,
  Clock,
  RotateCcw,
  Check,
  Copy,
  CheckSquare,
  MoreVertical,
} from 'lucide-react';
import { WhatsAppMessage } from '../../types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

interface MessageBubbleProps {
  msg: WhatsAppMessage;
  isMe: boolean;
  onDelete: (msg: WhatsAppMessage) => void;
  onRetry: (msg: WhatsAppMessage) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  onEnterSelectionMode?: () => void;
}

export function MessageBubble({
  msg,
  isMe,
  onDelete,
  onRetry,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onEnterSelectionMode,
}: MessageBubbleProps) {
  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      toast.success('Texto copiado!');
    }
  };

  const handleEnterSelect = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onEnterSelectionMode?.();
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onDelete(msg);
  };

  const menuItems = (
    <>
      <ContextMenuItem onClick={handleCopy} className="gap-2 text-xs cursor-pointer">
        <Copy className="size-3.5 text-muted-foreground" />
        <span>Copiar texto</span>
      </ContextMenuItem>
      <ContextMenuItem onClick={handleEnterSelect} className="gap-2 text-xs cursor-pointer">
        <CheckSquare className="size-3.5 text-muted-foreground" />
        <span>Selecionar várias</span>
      </ContextMenuItem>
      {msg.status !== 'pending' && (
        <ContextMenuItem
          onClick={handleDelete}
          className="gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        >
          <Trash2 className="size-3.5" />
          <span>Apagar para todos</span>
        </ContextMenuItem>
      )}
    </>
  );

  const dropdownItems = (
    <>
      <DropdownMenuItem onClick={handleCopy} className="gap-2 text-xs cursor-pointer">
        <Copy className="size-3.5 text-muted-foreground" />
        <span>Copiar texto</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleEnterSelect} className="gap-2 text-xs cursor-pointer">
        <CheckSquare className="size-3.5 text-muted-foreground" />
        <span>Selecionar várias</span>
      </DropdownMenuItem>
      {msg.status !== 'pending' && (
        <DropdownMenuItem
          onClick={handleDelete}
          className="gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        >
          <Trash2 className="size-3.5" />
          <span>Apagar para todos</span>
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2.5 w-full transition-colors',
        isMe ? 'justify-end' : 'justify-start',
        isSelectionMode && 'cursor-pointer hover:bg-primary/5 rounded-xl px-1.5 py-0.5'
      )}
      onClick={isSelectionMode ? onToggleSelection : undefined}
    >
      {/* Checkbox explícito no modo de seleção (à esquerda para mensagens do cliente) */}
      {isSelectionMode && !isMe && (
        <div className="shrink-0 flex items-center justify-center p-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={!!isSelected}
            onCheckedChange={onToggleSelection}
            className="size-4.5 rounded-md border-primary data-[state=checked]:bg-primary"
            aria-label="Selecionar mensagem"
          />
        </div>
      )}

      {/* Conteúdo com suporte tanto a Botão Direito (ContextMenu) quanto a Botão 3-pontos (DropdownMenu) */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-md transition-all',
              isMe
                ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-none'
                : 'luisices-glass rounded-2xl rounded-tl-none',
              isSelectionMode && isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
          >
            {/* Botão de 3 pontinhos (Mais Ações) visível no hover/touch para acesso imediato */}
            {!isSelectionMode && (
              <div
                className={cn(
                  'absolute top-1.5 z-10 transition-opacity',
                  isMe ? 'left-1.5' : 'right-1.5',
                  'opacity-80 hover:opacity-100'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'size-5.5 rounded-full flex items-center justify-center shadow-xs cursor-pointer border transition-colors',
                        isMe
                          ? 'bg-primary-hover/70 text-primary-foreground hover:bg-primary-hover border-white/20'
                          : 'bg-card/90 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted'
                      )}
                      title="Opções da mensagem"
                      aria-label="Opções da mensagem"
                    >
                      <MoreVertical className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align={isMe ? 'start' : 'end'}
                    className="w-44 z-50 bg-popover/95 backdrop-blur-md border border-border shadow-lg"
                  >
                    {dropdownItems}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Texto da Mensagem */}
            <div className={cn(!isSelectionMode && (isMe ? 'pl-4' : 'pr-4'))}>
              {msg.text}
            </div>

            {/* Metadados: Hora e Status de Envio */}
            <div
              className={cn(
                'flex items-center justify-end gap-1 mt-1 text-[10px]',
                isMe ? 'text-primary-foreground/80' : 'text-muted-foreground'
              )}
            >
              <span>
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {isMe && (
                <span>
                  {msg.status === 'read' ? (
                    <span title="Lida"><CheckCheck className="size-3 text-cyan-200" /></span>
                  ) : msg.status === 'delivered' ? (
                    <span title="Entregue"><CheckCheck className="size-3 text-primary-foreground/80" /></span>
                  ) : msg.status === 'pending' ? (
                    <span title="Enviando para o WhatsApp..."><Clock className="size-3 text-primary-foreground/80 animate-pulse" /></span>
                  ) : msg.status === 'failed' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetry(msg);
                      }}
                      className="text-red-200 hover:text-white flex items-center gap-1 cursor-pointer bg-red-500/40 px-1 py-0.5 rounded text-[9px] font-semibold tracking-wide hover:bg-red-500/60 transition-colors"
                      title="Falha ao enviar. Toque para restaurar o texto."
                    >
                      <RotateCcw className="size-2.5" />
                      <span>Falha</span>
                    </button>
                  ) : (
                    <span title="Enviada"><Check className="size-3" /></span>
                  )}
                </span>
              )}
            </div>
          </div>
        </ContextMenuTrigger>

        {/* Menu de Contexto pelo Botão Direito */}
        <ContextMenuContent className="w-48 z-50 bg-popover/95 backdrop-blur-md border border-border shadow-lg">
          {menuItems}
        </ContextMenuContent>
      </ContextMenu>

      {/* Checkbox explícito no modo de seleção (à direita para as minhas mensagens) */}
      {isSelectionMode && isMe && (
        <div className="shrink-0 flex items-center justify-center p-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={!!isSelected}
            onCheckedChange={onToggleSelection}
            className="size-4.5 rounded-md border-primary data-[state=checked]:bg-primary"
            aria-label="Selecionar mensagem"
          />
        </div>
      )}
    </div>
  );
}
