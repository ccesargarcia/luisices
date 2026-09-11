import React, { useState, useEffect, useRef } from 'react';
import { GalleryItem, Tag } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { TagInput } from '../TagInput';
import { Upload, X } from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
import { FOLDER_COLORS } from './FolderCard';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

interface EditFolderDialogProps {
  open: boolean;
  onClose: () => void;
  folderName: string;
  currentColor: string;
  currentCover?: string;
  currentTags?: Tag[];
  folderItems: GalleryItem[];
  userId: string;
  onSaved: (update: { color: string; cover: string | null; tags: Tag[] }) => void;
}

export function EditFolderDialog({
  open,
  onClose,
  folderName,
  currentColor,
  currentCover,
  currentTags,
  folderItems,
  userId,
  onSaved,
}: EditFolderDialogProps) {
  const [color, setColor] = useState(currentColor);
  const [cover, setCover] = useState<string | null>(currentCover ?? null);
  const [tags, setTags] = useState<Tag[]>(currentTags ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setColor(currentColor);
      setCover(currentCover ?? null);
      setTags(currentTags ?? []);
      setUploadPreview(null);
      setUploadFile(null);
    }
  }, [open, currentColor, currentCover, currentTags]);

  const pickCoverFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error('Máximo 15MB');
      return;
    }
    setUploadFile(f);
    setUploadPreview(URL.createObjectURL(f));
    setCover(null);
  };

  const handleSave = async () => {
    let finalCover = cover;
    if (uploadFile) {
      setUploading(true);
      try {
        finalCover = await firebaseGalleryService.uploadImage(
          uploadFile,
          userId,
          `cover_${Date.now()}`
        );
      } catch {
        toast.error('Erro ao enviar imagem de capa');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }
    onSaved({ color, cover: finalCover, tags });
    onClose();
  };

  const displayCover = uploadPreview ?? cover;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pasta — {folderName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Cover photo */}
          <div className="space-y-2">
            <Label>Foto de capa</Label>

            {displayCover ? (
              <div className="relative rounded-xl overflow-hidden border aspect-video">
                <img
                  src={displayCover}
                  alt="capa"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCover(null);
                    setUploadFile(null);
                    setUploadPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 rounded-xl aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors"
              >
                <Upload className="size-6 opacity-50" />
                <span className="text-sm">Fazer upload de capa</span>
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickCoverFile(f);
              }}
            />

            {/* Pick from folder items */}
            {folderItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Ou escolher uma arte da pasta:</p>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {folderItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCover(item.imageUrl);
                        setUploadFile(null);
                        setUploadPreview(null);
                      }}
                      className={cn(
                        'relative rounded-lg overflow-hidden aspect-square border-2 transition-all',
                        cover === item.imageUrl && !uploadPreview
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-muted-foreground/40'
                      )}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Cor da pasta</Label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map((fc) => (
                <button
                  key={fc.value}
                  type="button"
                  title={fc.label}
                  onClick={() => setColor(fc.value)}
                  className="size-8 rounded-full transition-all hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: fc.value,
                    boxShadow:
                      color === fc.value
                        ? `0 0 0 2px white, 0 0 0 3.5px ${fc.value}`
                        : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags da pasta</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={uploading}>
            {uploading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
