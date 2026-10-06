import React, { Fragment } from 'react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number | 'all';
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number | 'all') => void;
  pageSizeOptions?: (number | 'all')[];
  itemName?: string;
  itemPluralName?: string;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 'all'],
  itemName = 'item',
  itemPluralName = 'itens',
}: PaginationControlsProps) {
  if (totalItems === 0) return null;

  const effectivePageSize = pageSize === 'all' ? totalItems : pageSize;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const endItem = Math.min(currentPage * effectivePageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
      <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
        <span>
          Mostrando <strong>{startItem}–{endItem}</strong> de <strong>{totalItems}</strong> {totalItems === 1 ? itemName : itemPluralName}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
            <span className="hidden xs:inline text-xs">Exibir:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(val === 'all' ? 'all' : Number(val))}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={String(opt)} value={String(opt)} className="text-xs">
                    {opt === 'all' ? 'Todos' : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden xs:inline">Anterior</span>
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => totalPages <= 5 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .map((page, index, array) => {
                const prev = array[index - 1];
                const hasGap = prev && page - prev > 1;
                return (
                  <Fragment key={page}>
                    {hasGap && <span className="px-1 text-xs text-muted-foreground">…</span>}
                    <Button
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className="size-8 p-0 text-xs"
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </Button>
                  </Fragment>
                );
              })}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            title="Próxima página"
          >
            <span className="hidden xs:inline">Próxima</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
