import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  SendHorizontal,
  Eye,
  Sparkles,
  Tag,
  Search,
  Reply,
  Paperclip,
  Trash2,
  BookmarkPlus,
  Send,
  Loader2,
  Info,
} from 'lucide-react';
import { EmailHtmlViewer } from './EmailHtmlViewer';

export interface EmailTemplateItem {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  isCustom?: boolean;
}

export interface ComposeAttachmentItem {
  name: string;
  url: string;
  isPdf?: boolean;
  size?: number;
}

export interface ReplyQuoteItem {
  from: string;
  date: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename?: string; name?: string; downloadUrl?: string; url?: string }[];
}

export interface EmailComposerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  composeMode: 'write' | 'preview';
  setComposeMode: (mode: 'write' | 'preview') => void;
  handleSend: (e: React.FormEvent) => void;
  allTemplates: EmailTemplateItem[];
  handleSelectTemplate: (templateId: string) => void;
  customerPickerOpen: boolean;
  setCustomerPickerOpen: (open: boolean) => void;
  customerSearch: string;
  setCustomerSearch: (val: string) => void;
  selectedCustomerId: string | null;
  customers: Array<{ id: string; name: string; email?: string }>;
  handleSelectCustomer: (customerId: string) => void;
  isCustomSender: boolean;
  setIsCustomSender: (val: boolean) => void;
  customSender: string;
  setCustomSender: (val: string) => void;
  sender: string;
  setSender: (val: string) => void;
  defaultSender: string;
  isDev: boolean;
  showCcBcc: boolean;
  setShowCcBcc: (val: boolean) => void;
  recipient: string;
  setRecipient: (val: string) => void;
  cc: string;
  setCc: (val: string) => void;
  bcc: string;
  setBcc: (val: string) => void;
  subject: string;
  setSubject: (val: string) => void;
  replyQuote: ReplyQuoteItem | null;
  onRemoveReplyQuote: () => void;
  dynamicTags: Array<{ tag: string; label: string }>;
  handleInsertTag: (tag: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  body: string;
  setBody: (val: string) => void;
  attachments: ComposeAttachmentItem[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleUploadAttachment: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingAttachment: boolean;
  handleRemoveAttachment: (url: string) => void;
  generateFormattedHtml: (text: string) => string;
  handleSaveAsTemplate: () => void;
  isSending: boolean;
  dailyRemaining: number;
}

export function EmailComposerModal({
  isOpen,
  onOpenChange,
  composeMode,
  setComposeMode,
  handleSend,
  allTemplates,
  handleSelectTemplate,
  customerPickerOpen,
  setCustomerPickerOpen,
  customerSearch,
  setCustomerSearch,
  selectedCustomerId,
  customers,
  handleSelectCustomer,
  isCustomSender,
  setIsCustomSender,
  customSender,
  setCustomSender,
  sender,
  setSender,
  defaultSender,
  isDev,
  showCcBcc,
  setShowCcBcc,
  recipient,
  setRecipient,
  cc,
  setCc,
  bcc,
  setBcc,
  subject,
  setSubject,
  replyQuote,
  onRemoveReplyQuote,
  dynamicTags,
  handleInsertTag,
  textareaRef,
  body,
  setBody,
  attachments,
  fileInputRef,
  handleUploadAttachment,
  isUploadingAttachment,
  handleRemoveAttachment,
  generateFormattedHtml,
  handleSaveAsTemplate,
  isSending,
  dailyRemaining,
}: EmailComposerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent size="3xl" className="max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <SendHorizontal className="size-5 text-primary" />
                <span>Nova Mensagem</span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Envie e-mails profissionais com a assinatura oficial do ateliê
              </DialogDescription>
            </div>

            {/* Alternador Escrever / Prévia */}
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setComposeMode('write')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  composeMode === 'write' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                Escrever
              </button>
              <button
                type="button"
                onClick={() => setComposeMode('preview')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  composeMode === 'preview' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Eye className="size-3.5" />
                <span>Prévia Real</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {composeMode === 'write' ? (
            <>
              {/* Linha 1: Modelos Prontos & Cliente Cadastrado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3 text-amber-500" />
                    <span>Modelos de Papelaria:</span>
                  </label>
                  <Select onValueChange={handleSelectTemplate}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Escolher modelo rápido..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                          {tpl.name} {tpl.isCustom ? '⭐' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Tag className="size-3 text-primary" />
                    <span>Preencher com Cliente:</span>
                  </label>
                  <Popover
                    open={customerPickerOpen}
                    onOpenChange={(open) => {
                      setCustomerPickerOpen(open);
                      if (!open) setCustomerSearch('');
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerPickerOpen}
                        className="h-8 w-full justify-between bg-background px-3 text-xs font-normal"
                      >
                        <span className="truncate">
                          {selectedCustomerId
                            ? (() => {
                                const selected = customers.find((c) => c.id === selectedCustomerId);
                                return selected ? `${selected.name} (${selected.email})` : 'Selecionar cliente cadastrado...';
                              })()
                            : 'Selecionar cliente cadastrado...'}
                        </span>
                        <Search className="ml-2 size-3.5 shrink-0 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-2" align="start">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                        <Input
                          autoFocus
                          value={customerSearch}
                          onChange={(event) => setCustomerSearch(event.target.value)}
                          placeholder="Buscar por nome ou e-mail..."
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                      <div
                        className="mt-2 max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar overscroll-contain"
                        onWheel={(event) => event.stopPropagation()}
                        onTouchMove={(event) => event.stopPropagation()}
                      >
                        {customers
                          .filter((customer) => Boolean(customer.email))
                          .filter((customer) => {
                            const query = customerSearch.trim().toLowerCase();
                            return !query
                              || customer.name.toLowerCase().includes(query)
                              || (customer.email || '').toLowerCase().includes(query);
                          })
                          .map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted ${selectedCustomerId === customer.id ? 'bg-muted' : ''}`}
                              onClick={() => handleSelectCustomer(customer.id)}
                            >
                              <span className="block truncate font-medium">{customer.name}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">{customer.email}</span>
                            </button>
                          ))}
                        {customers.filter((customer) => {
                          const query = customerSearch.trim().toLowerCase();
                          return Boolean(customer.email) && (!query
                            || customer.name.toLowerCase().includes(query)
                            || (customer.email || '').toLowerCase().includes(query));
                        }).length === 0 && (
                          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                            Nenhum cliente encontrado.
                          </p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Linha 2: Remetente & Destinatário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Remetente (De):</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSender(!isCustomSender)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {isCustomSender ? 'Lista Padrão' : 'Digitar Manual'}
                    </button>
                  </div>
                  {isCustomSender ? (
                    <Input
                      placeholder="Ex: Minha Loja <contato@meudominio.com>"
                      value={customSender}
                      onChange={(e) => setCustomSender(e.target.value)}
                      className="h-9 text-xs"
                    />
                  ) : (
                    <Select value={sender} onValueChange={setSender}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={defaultSender} className="text-xs">
                          {defaultSender} (Padrão)
                        </SelectItem>
                        {isDev ? (
                          <>
                            <SelectItem value="Luisices Dev <noreply@dev.luisices.com.br>" className="text-xs">
                              Luisices Dev &lt;noreply@dev.luisices.com.br&gt;
                            </SelectItem>
                            <SelectItem value="Atendimento Dev <suporte@dev.luisices.com.br>" className="text-xs">
                              Atendimento Dev &lt;suporte@dev.luisices.com.br&gt;
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Luisices <noreply@luisices.com.br>" className="text-xs">
                              Luisices &lt;noreply@luisices.com.br&gt;
                            </SelectItem>
                            <SelectItem value="Atendimento Luisices <suporte@luisices.com.br>" className="text-xs">
                              Atendimento &lt;suporte@luisices.com.br&gt;
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Destinatário (Para):</label>
                    <button
                      type="button"
                      onClick={() => setShowCcBcc(!showCcBcc)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {showCcBcc ? 'Ocultar Cc/Cco' : '+ Adicionar Cc/Cco'}
                    </button>
                  </div>
                  <Input
                    placeholder="cliente@exemplo.com.br (vírgula para múltiplos)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Cc e Cco colapsáveis */}
              {showCcBcc && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Com Cópia (Cc):</label>
                    <Input
                      placeholder="copia@dominio.com"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Cópia Oculta (Cco):</label>
                    <Input
                      placeholder="copiaoculta@dominio.com"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Assunto */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Assunto:</label>
                <Input
                  placeholder="Ex: Seu Orçamento Personalizado - Luisices"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Banner de citação quando estiver respondendo */}
              {replyQuote && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-primary/5 border-primary/20 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Reply className="size-4 text-primary shrink-0" />
                    <span className="truncate">
                      Respondendo a <strong className="text-foreground">{replyQuote.from}</strong> (Mídia, imagens e links originais preservados no envio)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveReplyQuote}
                    className="text-xs text-muted-foreground hover:text-destructive font-medium shrink-0 ml-2"
                    title="Remover citação da mensagem original"
                  >
                    Remover citação
                  </button>
                </div>
              )}

              {/* Tags Dinâmicas Rápidas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Mensagem:</label>
                  <span className="text-[10px] text-muted-foreground">Clique numa tag para inserir:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pb-1">
                  {dynamicTags.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={`Inserir ${t.label}`}
                    >
                      {t.tag}
                    </button>
                  ))}
                </div>

                <Textarea
                  ref={textareaRef}
                  placeholder={replyQuote ? "Digite sua resposta aqui..." : "Escreva sua mensagem aqui..."}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[180px] font-sans text-xs leading-relaxed"
                  required
                />
              </div>

              {/* Anexos na Composição */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="size-3.5" />
                    <span>Anexos ({attachments.length}):</span>
                  </label>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleUploadAttachment}
                      className="hidden"
                      id="compose-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="h-7 text-xs gap-1.5"
                    >
                      {isUploadingAttachment ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="size-3" />
                          <span>Adicionar Arquivo</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att) => (
                      <div
                        key={att.url}
                        className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-xs"
                      >
                        <span className="font-medium truncate mr-2">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.url)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Remover anexo"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Prévia ao vivo */
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 text-primary text-xs">
                <Info className="size-4 shrink-0" />
                <span>
                  Pré-visualização fiel de como a mensagem chegará na caixa de entrada com a identidade da sua loja e links de anexos.
                </span>
              </div>

              <EmailHtmlViewer
                html={generateFormattedHtml(body || 'Sua mensagem aparecerá aqui.')}
              />
            </div>
          )}

          {/* Rodapé do Formulário */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAsTemplate}
                className="gap-1.5 text-xs h-8"
                title="Salvar texto atual como modelo personalizado"
              >
                <BookmarkPlus className="size-3.5" />
                <span>Salvar como Modelo</span>
              </Button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSending || dailyRemaining === 0 || isUploadingAttachment}
                className="gap-2 text-xs h-8 px-4"
              >
                {isSending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Enviar E-mail</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
