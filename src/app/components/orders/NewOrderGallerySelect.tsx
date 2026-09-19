import { GalleryItem } from '../../types';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { Images, Plus, X, Search, Check } from 'lucide-react';

interface NewOrderGallerySelectProps {
  galleryItems: GalleryItem[];
  selectedGalleryIds: string[];
  onSelectedGalleryIdsChange: (
    updater: string[] | ((prev: string[]) => string[])
  ) => void;
  galleryBrowserOpen: boolean;
  onGalleryBrowserOpenChange: (open: boolean) => void;
  galleryBrowserSearch: string;
  onGalleryBrowserSearchChange: (search: string) => void;
  selectedCustomer: string;
  customerName: string;
}

export function NewOrderGallerySelect({
  galleryItems,
  selectedGalleryIds,
  onSelectedGalleryIdsChange,
  galleryBrowserOpen,
  onGalleryBrowserOpenChange,
  galleryBrowserSearch,
  onGalleryBrowserSearchChange,
  selectedCustomer,
  customerName,
}: NewOrderGallerySelectProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Images className="size-3.5" /> Artes do Cliente
          {selectedGalleryIds.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({selectedGalleryIds.length} selecionada
              {selectedGalleryIds.length > 1 ? 's' : ''})
            </span>
          )}
        </Label>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors"
          onClick={() => onGalleryBrowserOpenChange(true)}
        >
          <Plus className="size-3.5" /> Vincular arte
        </button>
      </div>

      {selectedGalleryIds.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {selectedGalleryIds.map((id) => {
            const item = galleryItems.find((g) => g.id === id);
            if (!item) return null;
            return (
              <div key={id} className="relative group">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full aspect-square object-cover rounded-md border"
                  loading="lazy"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate rounded-b-md">
                  {item.title}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSelectedGalleryIdsChange((prev) => prev.filter((i) => i !== id))
                  }
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full size-5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma arte vinculada. Clique em "Vincular arte" para selecionar da galeria.
        </p>
      )}

      {/* Gallery browser dialog */}
      {(() => {
        const customerId =
          selectedCustomer && selectedCustomer !== 'new' ? selectedCustomer : undefined;
        const filtered = galleryItems.filter((g) => {
          const matchCustomer =
            !customerId || g.customerId === customerId || g.customerName === customerName;
          const matchSearch =
            !galleryBrowserSearch ||
            g.title.toLowerCase().includes(galleryBrowserSearch.toLowerCase()) ||
            (g.customerName ?? '').toLowerCase().includes(galleryBrowserSearch.toLowerCase());
          return matchCustomer && matchSearch;
        });

        return (
          <Dialog open={galleryBrowserOpen} onOpenChange={onGalleryBrowserOpenChange}>
            <DialogContent size="2xl" className="max-h-[90dvh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
                <DialogTitle>Selecionar Artes da Galeria</DialogTitle>
              </DialogHeader>

              <div className="px-4 sm:px-6 py-2.5 border-b bg-muted/20 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9 text-sm"
                    placeholder="Buscar por título ou cliente..."
                    value={galleryBrowserSearch}
                    onChange={(e) => onGalleryBrowserSearchChange(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <DialogBody className="p-4 sm:p-6">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Images className="size-10 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma arte encontrada na galeria.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filtered.map((item) => {
                      const isSelected = selectedGalleryIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            onSelectedGalleryIdsChange((prev) =>
                              isSelected
                                ? prev.filter((i) => i !== item.id)
                                : [...prev, item.id]
                            )
                          }
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20 shadow-sm scale-[0.98]'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full aspect-square object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center text-xs font-bold shadow-sm">
                                <Check className="size-3.5" />
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[11px] px-2 py-1 truncate">
                            {item.title}
                          </div>
                          {item.customerName && (
                            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded truncate max-w-[90%] font-medium">
                              {item.customerName}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </DialogBody>

              <DialogFooter className="px-4 sm:px-6 py-3 border-t bg-card/60 flex items-center justify-between sm:justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  {selectedGalleryIds.length} selecionada{selectedGalleryIds.length !== 1 ? 's' : ''}
                </span>
                <Button
                  type="button"
                  onClick={() => onGalleryBrowserOpenChange(false)}
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
