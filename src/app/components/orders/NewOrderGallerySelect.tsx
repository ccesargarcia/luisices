import React from 'react';
import { GalleryItem } from '../../types';
import { Label } from '../ui/label';
import { Images, Plus, X } from 'lucide-react';

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
      {galleryBrowserOpen && (() => {
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
          <div
            className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4"
            onClick={() => onGalleryBrowserOpenChange(false)}
          >
            <div
              className="bg-background rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h4 className="font-semibold text-sm">Selecionar Artes da Galeria</h4>
                <button type="button" onClick={() => onGalleryBrowserOpenChange(false)}>
                  <X className="size-4" />
                </button>
              </div>
              <div className="px-4 py-2 border-b">
                <input
                  className="w-full border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Buscar por título ou cliente..."
                  value={galleryBrowserSearch}
                  onChange={(e) => onGalleryBrowserSearchChange(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    Nenhuma arte encontrada na galeria.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-primary shadow-md scale-[0.97]'
                              : 'border-transparent hover:border-primary/40'
                          }`}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full aspect-square object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center text-xs font-bold">
                                ✓
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-1 truncate">
                            {item.title}
                          </div>
                          {item.customerName && (
                            <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1 py-0.5 rounded truncate max-w-[90%]">
                              {item.customerName}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {selectedGalleryIds.length} selecionada
                  {selectedGalleryIds.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm hover:bg-primary/90"
                  onClick={() => onGalleryBrowserOpenChange(false)}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
