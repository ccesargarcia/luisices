import React, { forwardRef } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { QUICK_TEMPLATES } from './constants';

interface ChatInputProps {
  inputText: string;
  setInputText: (val: string) => void;
  sending: boolean;
  onSend: () => void;
  activeCustomerName?: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInput({
  inputText,
  setInputText,
  sending,
  onSend,
  activeCustomerName,
  textareaRef,
}: ChatInputProps) {
  const handleApplyTemplate = (tmpl: (typeof QUICK_TEMPLATES)[0]) => {
    const generated = tmpl.getText(activeCustomerName || '');
    setInputText(generated);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <>
      <div className="px-3 py-2 border-t luisices-glass flex items-center gap-1.5 overflow-x-auto shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 uppercase tracking-wide flex items-center gap-1">
          <Sparkles className="size-3 text-amber-500" />
          Modelos Rápidos:
        </span>
        {QUICK_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => handleApplyTemplate(tmpl)}
            className="text-[11px] px-2.5 py-1 rounded-md bg-background hover:bg-primary/10 border text-foreground transition-colors shrink-0 font-medium cursor-pointer"
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      <div className="p-3 border-t luisices-glass-input flex flex-col gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            maxLength={4096}
            aria-label="Mensagem para o cliente"
            placeholder="Digite uma mensagem para o cliente... (Enter envia)"
            className="text-xs sm:text-sm bg-background min-h-[42px] max-h-32 resize-none py-2.5 leading-tight flex-1"
          />

          <Button
            type="submit"
            disabled={sending || !inputText.trim() || inputText.length > 4096}
            className="h-[42px] px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shrink-0 shadow-xs active:scale-95 cursor-pointer rounded-xl"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="hidden sm:inline">
              {sending ? 'Enviando...' : 'Enviar'}
            </span>
          </Button>
        </form>

        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground hidden sm:flex">
          <p>
            💡 <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Enter</kbd> envia · <kbd className="px-1 py-0.5 text-[9px] bg-muted border rounded font-mono">Shift+Enter</kbd> quebra linha
          </p>
          <span className={inputText.length > 3800 ? 'text-amber-600 font-medium' : ''}>
            {inputText.length}/4096
          </span>
        </div>
      </div>
    </>
  );
}
