import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Images, Plus, Search, X, Trash2, Upload, Tag as TagIcon, User, ChevronLeft, ChevronRight, ZoomIn, FolderOpen, LayoutGrid, ArrowLeft, Palette, Pencil } from 'lucide-react';
import { getTextColor } from '../utils/tagColors';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { TagInput } from '../components/TagInput';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import type { GalleryItem, Customer, Tag } from '../types';
import { cn } from '../components/ui/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (item: GalleryItem) => void;
  customers: Customer[];
  userId: string;
  initialCustomerId?: string;
}

function UploadDialog({ open, onClose, onSaved, customers, userId, initialCustomerId }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '');
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTitle('');
    setDescription('');
    setCustomerId(initialCustomerId ?? '');
    setTags([]);
    setSaving(false);
    setDragging(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const pickFile = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (f.size > 15 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo: 15MB'); return; }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const handleSave = async () => {
    if (!file) { toast.error('Selecione uma imagem'); return; }
    if (!title.trim()) { toast.error('Título é obrigatório'); return; }
    setSaving(true);
    try {
      const tempId = `${Date.now()}`;
      const imageUrl = await firebaseGalleryService.uploadImage(file, userId, tempId);
      const customer = customers.find(c => c.id === customerId);
      const item = await firebaseGalleryService.createItem(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl,
        customerId: customer?.id,
        customerName: customer?.name,
        tags,
      });
      toast.success('Arte adicionada à galeria');
      onSaved(item);
      handleClose();
    } catch (err) {
      toast.error('Erro ao salvar arte');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Arte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg transition-colors cursor-pointer',
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/60',
              preview ? 'p-1' : 'p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground'
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {preview ? (
              <>
                <img
          src={preview}
          alt="preview"
          className="w-full max-h-64 object-contain rounded"
          loading="lazy"
        />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                  onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); }}
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <Upload className="size-8 opacity-50" />
                <span className="text-sm font-medium">Clique ou arraste uma imagem</span>
                <span className="text-xs">PNG, JPG, WEBP — até 15MB</span>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="gallery-title">Título <span className="text-destructive">*</span></Label>
            <Input id="gallery-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome da arte" />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="gallery-desc">Descrição</Label>
            <Textarea id="gallery-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Notas sobre a arte..." rows={2} />
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Select value={customerId || '__none__'} onValueChange={v => setCustomerId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} placeholder="Adicionar tag..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !file}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lightbox Dialog ──────────────────────────────────────────────────────────

interface LightboxProps {
  items: GalleryItem[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (item: GalleryItem) => void;
}

function Lightbox({ items, initialIndex, onClose, onDelete }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = items[idx];

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(items.length - 1, i + 1)), [items.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  if (!item) return null;

  return (
    <>
      <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col" hideClose>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <DialogTitle className="text-base font-semibold truncate flex-1">{item.title}</DialogTitle>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Image area */}
            <div className="relative flex-1 flex items-center justify-center bg-black/90 min-h-48">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain"
                loading="lazy"
              />
              {items.length > 1 && (
                <>
                  <button onClick={prev} disabled={idx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 disabled:opacity-20 hover:bg-black/70">
                    <ChevronLeft className="size-5" />
                  </button>
                  <button onClick={next} disabled={idx === items.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 disabled:opacity-20 hover:bg-black/70">
                    <ChevronRight className="size-5" />
                  </button>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
                    {idx + 1} / {items.length}
                  </span>
                </>
              )}
            </div>

            {/* Info panel */}
            <div className="md:w-64 px-4 py-4 space-y-3 overflow-y-auto border-l bg-card text-sm shrink-0">
              {item.description && (
                <p className="text-muted-foreground">{item.description}</p>
              )}
              {item.customerName && (
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{item.customerName}</span>
                </div>
              )}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map(t => (
                    <Badge key={t.name} style={{ backgroundColor: t.color, color: '#fff' }} className="text-xs">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
              <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-1">
                  <ZoomIn className="size-3" /> Abrir original
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arte?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirmDelete(false); onDelete(item); onClose(); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Gallery Card ─────────────────────────────────────────────────────────────

interface GalleryCardProps {
  item: GalleryItem;
  onClick: () => void;
}

function GalleryCard({ item, onClick }: GalleryCardProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      onClick={onClick}
      className="group rounded-lg overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {!loaded && <Skeleton className="absolute inset-0" />}
        <img
          src={item.imageUrl}
          alt={item.title}
          onLoad={() => setLoaded(true)}
          className={cn('w-full h-full object-cover transition-transform duration-200 group-hover:scale-105', !loaded && 'opacity-0')}
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="size-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.customerName && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <User className="size-3" /> {item.customerName}
          </p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.tags.slice(0, 3).map(t => (
              <span key={t.name} style={{ backgroundColor: t.color }} className="text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                {t.name}
              </span>
            ))}
            {item.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Folder colors ────────────────────────────────────────────────────────────

const FOLDER_COLORS = [
  { label: 'Amarelo',  value: '#F59E0B' },
  { label: 'Laranja',  value: '#F97316' },
  { label: 'Vermelho', value: '#EF4444' },
  { label: 'Rosa',     value: '#EC4899' },
  { label: 'Roxo',     value: '#8B5CF6' },
  { label: 'Índigo',   value: '#6366F1' },
  { label: 'Azul',     value: '#3B82F6' },
  { label: 'Ciano',    value: '#06B6D4' },
  { label: 'Verde',    value: '#10B981' },
  { label: 'Lima',     value: '#84CC16' },
  { label: 'Pedra',    value: '#78716C' },
  { label: 'Ardósia',  value: '#475569' },
];

const DEFAULT_FOLDER_COLOR = '#F59E0B';

// ─── Folder Card ────────────────────────────────────────────────────────────────

interface FolderCardProps {
  name: string;
  count: number;
  color: string;
  cover?: string;
  tags?: Tag[];
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

function folderDark(hex: string) {
  // Darken hex by ~20% for folder tab
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 50);
  const g = Math.max(0, ((n >> 8) & 0xff) - 50);
  const b = Math.max(0, (n & 0xff) - 50);
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function FolderCard({ name, count, color, cover, tags, onClick, onEdit, onDelete }: FolderCardProps) {
  const body = color || DEFAULT_FOLDER_COLOR;
  const tab  = folderDark(body);

  return (
    <div className="group relative w-full space-y-2">
      {/* Folder shape */}
      <div
        className="relative w-full cursor-pointer"
        style={{ paddingTop: '80%' }}
        onClick={onClick}
      >
        {/* Tab */}
        <div
          className="absolute top-0 left-0 w-[42%] h-[16%] rounded-tl-lg"
          style={{ backgroundColor: tab, borderRadius: '6px 14px 0 0' }}
        />
        {/* Body */}
        <div
          className="absolute left-0 right-0 bottom-0 rounded-b-xl rounded-tr-xl overflow-hidden shadow-sm group-hover:shadow-lg transition-shadow"
          style={{ top: '11%', backgroundColor: body }}
        >
          {cover && (
            <img
              src={cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          )}
          {/* Hover tint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Edit button — top right on hover */}
        <button
          onClick={onEdit}
          className="absolute top-[14%] right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white rounded-full p-1 z-10"
          title="Editar pasta"
        >
          <Pencil className="size-3" />
        </button>
        {/* Delete button — only for empty folders */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute bottom-[14%] right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-red-600 text-white rounded-full p-1 z-10"
            title="Remover pasta vazia"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>

      {/* Label row */}
      <div className="flex items-center justify-between gap-1 px-0.5">
        <p className="text-sm font-medium truncate flex-1">{name}</p>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0">
          {count} {count === 1 ? 'arte' : 'artes'}
        </span>
      </div>
      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-0.5">
          {tags.map(t => (
            <span
              key={t.name}
              className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium leading-4"
              style={{ backgroundColor: t.color, color: getTextColor(t.color) }}
            >{t.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit Folder Dialog ──────────────────────────────────────────────────────────

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

function EditFolderDialog({ open, onClose, folderName, currentColor, currentCover, currentTags, folderItems, userId, onSaved }: EditFolderDialogProps) {
  const [color, setColor] = useState(currentColor);
  const [cover, setCover] = useState<string | null>(currentCover ?? null);
  const [tags, setTags] = useState<Tag[]>(currentTags ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // reset when dialog opens
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
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (f.size > 15 * 1024 * 1024) { toast.error('Máximo 15MB'); return; }
    setUploadFile(f);
    setUploadPreview(URL.createObjectURL(f));
    setCover(null); // will be replaced after upload
  };

  const handleSave = async () => {
    let finalCover = cover;
    if (uploadFile) {
      setUploading(true);
      try {
        finalCover = await firebaseGalleryService.uploadImage(uploadFile, userId, `cover_${Date.now()}`);
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
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
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
                <img src={displayCover} alt="capa" className="w-full h-full object-cover" loading="lazy" />
                <button
                  type="button"
                  onClick={() => { setCover(null); setUploadFile(null); setUploadPreview(null); }}
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
              onChange={e => { const f = e.target.files?.[0]; if (f) pickCoverFile(f); }}
            />

            {/* Pick from folder items */}
            {folderItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Ou escolher uma arte da pasta:</p>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {folderItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setCover(item.imageUrl); setUploadFile(null); setUploadPreview(null); }}
                      className={cn(
                        'relative rounded-lg overflow-hidden aspect-square border-2 transition-all',
                        cover === item.imageUrl && !uploadPreview
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-muted-foreground/40'
                      )}
                    >
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
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
              {FOLDER_COLORS.map(fc => (
                <button
                  key={fc.value}
                  title={fc.label}
                  onClick={() => setColor(fc.value)}
                  className="size-8 rounded-full transition-all hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: fc.value,
                    boxShadow: color === fc.value ? `0 0 0 2px white, 0 0 0 3.5px ${fc.value}` : undefined,
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
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={uploading}>
            {uploading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  existingFolderIds: string[];
  onSaved: (folder: { customerId: string; customerName: string; color: string; tags: Tag[] }) => void;
}

function NewFolderDialog({ open, onClose, customers, existingFolderIds, onSaved }: NewFolderDialogProps) {
  const [customerId, setCustomerId] = useState('');
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR);
  const [tags, setTags] = useState<Tag[]>([]);

  const available = customers.filter(c => !existingFolderIds.includes(c.id));

  const reset = () => { setCustomerId(''); setColor(DEFAULT_FOLDER_COLOR); setTags([]); };
  const handleClose = () => { reset(); onClose(); };

  const handleSave = () => {
    if (!customerId) { toast.error('Selecione um cliente'); return; }
    const customer = customers.find(c => c.id === customerId)!;
    onSaved({ customerId: customer.id, customerName: customer.name, color, tags });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Pasta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Cliente <span className="text-destructive">*</span></Label>
            <Select value={customerId || '__none__'} onValueChange={v => setCustomerId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Selecione —</SelectItem>
                {available.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground">Todos os clientes já possuem pasta.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map(fc => (
                <button
                  key={fc.value}
                  title={fc.label}
                  onClick={() => setColor(fc.value)}
                  className="size-8 rounded-full transition-all hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: fc.value,
                    boxShadow: color === fc.value ? `0 0 0 2px white, 0 0 0 3.5px ${fc.value}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!customerId}>Criar Pasta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Gallery() {
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'flat'>('folders');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [colorPickerFolder, setColorPickerFolder] = useState<string | null>(null);
  const [folderColors, setFolderColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_folder_colors') || '{}'); } catch { return {}; }
  });
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState<string | null>(null); // folderId
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_folder_covers') || '{}'); } catch { return {}; }
  });
  const [folderTags, setFolderTagsState] = useState<Record<string, Tag[]>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_folder_tags') || '{}'); } catch { return {}; }
  });
  const [filterFolderTag, setFilterFolderTag] = useState('');
  const [manualFolders, setManualFolders] = useState<Array<{ customerId: string; customerName: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_manual_folders') || '[]'); } catch { return []; }
  });

  // Load data
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [galleryItems, cList] = await Promise.all([
          firebaseGalleryService.getItems(user.uid),
          firebaseCustomerService.getCustomers(user.uid),
        ]);
        setItems(galleryItems);
        setCustomers(cList);
      } catch (err) {
        toast.error('Erro ao carregar galeria');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Group items into folders by customer, merging with manual empty folders
  const folders = useMemo(() => {
    const map = new Map<string, { name: string; items: GalleryItem[] }>();
    for (const item of items) {
      const key = item.customerId || '__none__';
      const name = item.customerName || 'Sem cliente';
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(item);
    }
    // Add manual folders that don't already have items
    for (const mf of manualFolders) {
      if (!map.has(mf.customerId)) {
        map.set(mf.customerId, { name: mf.customerName, items: [] });
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, items: v.items }))
      .sort((a, b) => {
        if (a.id === '__none__') return 1;
        if (b.id === '__none__') return -1;
        return b.items.length - a.items.length;
      });
  }, [items, manualFolders]);

  // All distinct tags (for flat view)
  const allTags = useMemo(() =>
    Array.from(new Set(items.flatMap(i => (i.tags ?? []).map(t => t.name)))).sort(),
    [items]
  );

  // Currently open folder
  const openFolder = openFolderId !== null ? folders.find(f => f.id === openFolderId) : null;

  // Items displayed in items grid (flat view or inside a folder)
  const displayedItems = useMemo(() => {
    if (viewMode === 'folders' && openFolderId !== null) {
      const base = openFolder?.items ?? [];
      const q = search.toLowerCase();
      return q ? base.filter(i => i.title.toLowerCase().includes(q)) : base;
    }
    const q = search.toLowerCase();
    return items.filter(item => {
      const matchSearch = !q || item.title.toLowerCase().includes(q) || (item.customerName ?? '').toLowerCase().includes(q);
      const matchCustomer = !filterCustomer || item.customerId === filterCustomer;
      const matchTag = !filterTag || (item.tags ?? []).some(t => t.name === filterTag);
      return matchSearch && matchCustomer && matchTag;
    });
  }, [items, viewMode, openFolderId, openFolder, search, filterCustomer, filterTag]);

  // Folders shown in root view (filtered by name search and tag filter)
  const displayedFolders = useMemo(() => {
    let result = folders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }
    if (filterFolderTag) {
      result = result.filter(f => (folderTags[f.id] ?? []).some(t => t.name === filterFolderTag));
    }
    return result;
  }, [folders, search, filterFolderTag, folderTags]);

  // All distinct tags across all folders
  const allFolderTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(folderTags).forEach(tags => tags.forEach(t => set.add(t.name)));
    return Array.from(set).sort();
  }, [folderTags]);

  const handleDelete = async (item: GalleryItem) => {
    try {
      await firebaseGalleryService.deleteItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Arte removida');
    } catch {
      toast.error('Erro ao remover arte');
    }
  };

  const setFolderColor = (folderId: string, color: string) => {
    const next = { ...folderColors, [folderId]: color };
    setFolderColors(next);
    try { localStorage.setItem('gallery_folder_colors', JSON.stringify(next)); } catch {}
  };

  const setFolderCover = (folderId: string, cover: string | null) => {
    const next = { ...folderCovers };
    if (cover) next[folderId] = cover; else delete next[folderId];
    setFolderCovers(next);
    try { localStorage.setItem('gallery_folder_covers', JSON.stringify(next)); } catch {}
  };

  const setFolderTags = (folderId: string, tags: Tag[]) => {
    const next = { ...folderTags, [folderId]: tags };
    setFolderTagsState(next);
    try { localStorage.setItem('gallery_folder_tags', JSON.stringify(next)); } catch {}
  };

  const handleEditFolder = (update: { color: string; cover: string | null; tags: Tag[] }) => {
    if (!editFolderOpen) return;
    setFolderColor(editFolderOpen, update.color);
    setFolderCover(editFolderOpen, update.cover);
    setFolderTags(editFolderOpen, update.tags);
  };

  const handleNewFolder = (folder: { customerId: string; customerName: string; color: string; tags: Tag[] }) => {
    const next = [...manualFolders.filter(f => f.customerId !== folder.customerId), { customerId: folder.customerId, customerName: folder.customerName }];
    setManualFolders(next);
    try { localStorage.setItem('gallery_manual_folders', JSON.stringify(next)); } catch {}
    setFolderColor(folder.customerId, folder.color);
    setFolderTags(folder.customerId, folder.tags);
    toast.success('Pasta criada');
  };

  const handleDeleteEmptyFolder = (folderId: string) => {
    const next = manualFolders.filter(f => f.customerId !== folderId);
    setManualFolders(next);
    try { localStorage.setItem('gallery_manual_folders', JSON.stringify(next)); } catch {}
    toast.success('Pasta removida');
  };

  const goToRoot = () => { setOpenFolderId(null); setSearch(''); };
  const hasFilters = !!(search || filterCustomer || filterTag);

  const isRootFolders = viewMode === 'folders' && openFolderId === null;
  const isInsideFolder = viewMode === 'folders' && openFolderId !== null;
  const isFlatView = viewMode === 'flat';

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 min-w-0">
          {isInsideFolder && (
            <Button variant="ghost" size="icon" onClick={goToRoot} className="-ml-1 shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="min-w-0">
            {isInsideFolder ? (
              <>
                <div className="flex items-center gap-1 text-sm">
                  <button
                    onClick={goToRoot}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Galeria
                  </button>
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold truncate">{openFolder?.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {openFolder?.items.length ?? 0} {(openFolder?.items.length ?? 0) === 1 ? 'arte' : 'artes'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight">Galeria de Artes</h1>
                <p className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? 'arte' : 'artes'}
                  {isRootFolders && folders.length > 0 && ` · ${folders.length} ${folders.length === 1 ? 'pasta' : 'pastas'}`}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle — only at root or flat */}
          {!isInsideFolder && (
            <div className="flex rounded-md border overflow-hidden">
              <Button
                variant={viewMode === 'folders' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-0 gap-1.5 px-3"
                onClick={() => { setViewMode('folders'); setSearch(''); setFilterCustomer(''); setFilterTag(''); }}
              >
                <FolderOpen className="size-4" />
                <span className="hidden sm:inline text-xs">Pastas</span>
              </Button>
              <Button
                variant={viewMode === 'flat' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-0 border-l gap-1.5 px-3"
                onClick={() => { setViewMode('flat'); setSearch(''); }}
              >
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline text-xs">Grade</span>
              </Button>
            </div>
          )}
          {hasPermission(p => p.gallery?.create ?? false) && (
            <>
              <Button variant="outline" onClick={() => setNewFolderOpen(true)} className="gap-2">
                <FolderOpen className="size-4" />
                <span className="hidden sm:inline">Nova Pasta</span>
              </Button>
              <Button onClick={() => setUploadOpen(true)} className="gap-2">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nova Arte</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search / Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              isRootFolders ? 'Buscar pasta...' :
              isInsideFolder ? 'Buscar arte na pasta...' :
              'Buscar por título ou cliente...'
            }
            className="pl-9"
          />
        </div>
        {isFlatView && (
          <>
            <Select value={filterCustomer || '__all__'} onValueChange={v => setFilterCustomer(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-44">
                <User className="size-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os clientes</SelectItem>
                {customers.filter(c => items.some(i => i.customerId === c.id)).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={filterTag || '__all__'} onValueChange={v => setFilterTag(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-36">
                  <TagIcon className="size-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as tags</SelectItem>
                  {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </>
        )}
        {isRootFolders && allFolderTags.length > 0 && (
          <Select value={filterFolderTag || '__all__'} onValueChange={v => setFilterFolderTag(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-36">
              <TagIcon className="size-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as tags</SelectItem>
              {allFolderTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(hasFilters || filterFolderTag) && (
          <Button variant="ghost" size="icon" onClick={() => { setSearch(''); setFilterCustomer(''); setFilterTag(''); setFilterFolderTag(''); }}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : isRootFolders ? (
        // ─── Folders grid ─────────────────────────────────────────────────────
        displayedFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Images className="size-12 opacity-30" />
            <p className="text-base font-medium">
              {search ? 'Nenhuma pasta encontrada' : 'Galeria vazia'}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2 mt-1">
                <Plus className="size-4" /> Adicionar primeira arte
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayedFolders.map(folder => (
              <FolderCard
                key={folder.id}
                name={folder.name}
                count={folder.items.length}
                color={folderColors[folder.id] || DEFAULT_FOLDER_COLOR}
                cover={folderCovers[folder.id]}
                tags={folderTags[folder.id]}
                onClick={() => { setEditFolderOpen(null); setOpenFolderId(folder.id); setSearch(''); }}
                onEdit={e => { e.stopPropagation(); setEditFolderOpen(folder.id); }}
                onDelete={folder.items.length === 0 ? e => { e.stopPropagation(); handleDeleteEmptyFolder(folder.id); } : undefined}
              />
            ))}
          </div>
        )
      ) : (
        // ─── Items grid (inside folder or flat mode) ───────────────────────────
        displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Images className="size-12 opacity-30" />
            <p className="text-base font-medium">
              {hasFilters || search ? 'Nenhuma arte encontrada' : 'Pasta vazia'}
            </p>
            {!hasFilters && !search && hasPermission(p => p.gallery?.create ?? false) && (
              <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2 mt-1">
                <Plus className="size-4" /> Adicionar arte
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayedItems.map((item, i) => (
              <GalleryCard key={item.id} item={item} onClick={() => setLightboxIdx(i)} />
            ))}
          </div>
        )
      )}

      {/* Edit Folder dialog */}
      {editFolderOpen && user && (() => {
        const f = folders.find(x => x.id === editFolderOpen);
        if (!f) return null;
        return (
          <EditFolderDialog
            open
            onClose={() => setEditFolderOpen(null)}
            folderName={f.name}
            currentColor={folderColors[f.id] || DEFAULT_FOLDER_COLOR}
            currentCover={folderCovers[f.id]}
            currentTags={folderTags[f.id]}
            folderItems={f.items}
            userId={user.uid}
            onSaved={handleEditFolder}
          />
        );
      })()}

      {/* New Folder dialog */}
      {newFolderOpen && (
        <NewFolderDialog
          open={newFolderOpen}
          onClose={() => setNewFolderOpen(false)}
          customers={customers}
          existingFolderIds={folders.map(f => f.id)}
          onSaved={handleNewFolder}
        />
      )}

      {/* Upload dialog */}
      {uploadOpen && user && (
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSaved={item => setItems(prev => [item, ...prev])}
          customers={customers}
          userId={user.uid}
          initialCustomerId={openFolder && openFolder.id !== '__none__' ? openFolder.id : undefined}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          items={displayedItems}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
