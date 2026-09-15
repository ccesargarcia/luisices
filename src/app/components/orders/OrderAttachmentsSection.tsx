import React from 'react';
import { SafeAnchor, SafeImg } from '../SafeMedia';
import { Paperclip, Upload, ImageIcon, ExternalLink } from 'lucide-react';
import { OrderAttachment } from '../../types';

interface OrderAttachmentsSectionProps {
  attachments: OrderAttachment[];
  canEdit: boolean;
  isUploading: boolean;
  onUploadAttachment: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveAttachment: (url: string) => Promise<void>;
}

export function OrderAttachmentsSection({
  attachments,
  canEdit,
  isUploading,
  onUploadAttachment,
  onRemoveAttachment,
}: OrderAttachmentsSectionProps) {
  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Paperclip className="size-4" /> Anexos
        </h3>
        {canEdit && (
          <label className="cursor-pointer">
            <input
              type="file"
              className="sr-only"
              accept="image/*,.pdf"
              onChange={onUploadAttachment}
              disabled={isUploading}
            />
            <span className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors">
              <Upload className="size-3.5" />
              {isUploading ? 'Enviando...' : 'Enviar arquivo'}
            </span>
          </label>
        )}
      </div>

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
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full size-5 items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity flex"
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
