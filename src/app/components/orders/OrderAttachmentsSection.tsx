import React from 'react';
import { SafeAnchor, SafeImg } from '../SafeMedia';
import { Paperclip, Upload, ImageIcon, ExternalLink } from 'lucide-react';
import { OrderAttachment } from '../../types';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

interface OrderAttachmentsSectionProps {
  attachments: OrderAttachment[];
  canEdit: boolean;
  isUploading: boolean;
  uploadProgress: number;
  onUploadAttachment: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveAttachment: (url: string) => Promise<void>;
}

export function OrderAttachmentsSection({
  attachments,
  canEdit,
  isUploading,
  uploadProgress,
  onUploadAttachment,
  onRemoveAttachment,
}: OrderAttachmentsSectionProps) {
  return (
    <div className="border-t pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Paperclip className="size-4" /> Anexos
        </h3>
        {canEdit && (
          <Button asChild variant="outline" size="sm" disabled={isUploading} className="shrink-0 whitespace-nowrap">
            <label className="cursor-pointer">
              <input
                type="file"
                className="sr-only"
                accept="image/*,.pdf"
                onChange={onUploadAttachment}
                disabled={isUploading}
              />
              <span className="inline-flex items-center gap-1.5">
                <Upload className="size-3.5" />
                {isUploading ? 'Enviando...' : 'Enviar arquivo'}
              </span>
            </label>
          </Button>
        )}
      </div>

      {isUploading && (
        <div className="mb-3 space-y-1.5" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Preparando e enviando arquivo</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} aria-label="Progresso do envio do anexo" />
        </div>
      )}

      {attachments.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group">
              {!att.isPdf ? (
                <SafeAnchor href={att.url} target="_blank" rel="noopener noreferrer">
                  <SafeImg
                    src={att.thumbnail ?? att.url}
                    alt={att.name ?? `Anexo ${idx + 1}`}
                    className="w-full h-20 object-cover rounded-md border hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                </SafeAnchor>
              ) : (
                <SafeAnchor
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center h-20 border rounded-md bg-muted hover:bg-muted/70 transition-colors gap-1 px-1"
                >
                  <ImageIcon className="size-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center truncate w-full px-1">
                    {att.name ?? 'PDF'}
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </SafeAnchor>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.url)}
                  aria-label={`Remover anexo ${att.name || idx + 1}`}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full size-5 items-center justify-center text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum anexo. Envie imagens ou PDFs de referência.
        </p>
      )}
    </div>
  );
}
