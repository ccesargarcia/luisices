import React from 'react';
import { Tag } from '../../types';
import { getTextColor } from '../../utils/tagColors';
import { Pencil, Trash2 } from 'lucide-react';

export const FOLDER_COLORS = [
  { label: 'Amarelo', value: '#F59E0B' },
  { label: 'Laranja', value: '#F97316' },
  { label: 'Vermelho', value: '#EF4444' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Roxo', value: '#8B5CF6' },
  { label: 'Índigo', value: '#6366F1' },
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Ciano', value: '#06B6D4' },
  { label: 'Verde', value: '#10B981' },
  { label: 'Lima', value: '#84CC16' },
  { label: 'Pedra', value: '#78716C' },
  { label: 'Ardósia', value: '#475569' },
];

export const DEFAULT_FOLDER_COLOR = '#F59E0B';

export function folderDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 50);
  const g = Math.max(0, ((n >> 8) & 0xff) - 50);
  const b = Math.max(0, (n & 0xff) - 50);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

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

export function FolderCard({
  name,
  count,
  color,
  cover,
  tags,
  onClick,
  onEdit,
  onDelete,
}: FolderCardProps) {
  const body = color || DEFAULT_FOLDER_COLOR;
  const tab = folderDark(body);

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
          type="button"
          onClick={onEdit}
          className="absolute top-[14%] right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white rounded-full p-1 z-10"
          title="Editar pasta"
        >
          <Pencil className="size-3" />
        </button>
        {/* Delete button — only for empty folders */}
        {onDelete && (
          <button
            type="button"
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
          {tags.map((t) => (
            <span
              key={t.name}
              className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium leading-4"
              style={{ backgroundColor: t.color, color: getTextColor(t.color) }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
