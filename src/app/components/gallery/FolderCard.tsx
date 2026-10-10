import React from 'react';
import { Tag } from '../../types';
import { getTextColor } from '../../utils/tagColors';
import { Pencil, Trash2, Images, FolderHeart, Sparkles } from 'lucide-react';
import { cn } from '../ui/utils';

export const FOLDER_COLORS = [
  { label: 'Rosewood', value: '#613D3E' },
  { label: 'Rose Blush', value: '#D9777F' },
  { label: 'Lavanda', value: '#8C7BA6' },
  { label: 'Índigo Lavanda', value: '#5D5C76' },
  { label: 'Lilás Suave', value: '#A594C6' },
  { label: 'Dourado Nobre', value: '#C89D4B' },
  { label: 'Argila / Terracota', value: '#B85C43' },
  { label: 'Pêssego Aveludado', value: '#E0876A' },
  { label: 'Sálvia / Alecrim', value: '#5E8271' },
  { label: 'Verde Oliva', value: '#6E7A4A' },
  { label: 'Azul Hortênsia', value: '#5C789E' },
  { label: 'Fendi / Linho', value: '#8C7F72' },
];

export const DEFAULT_FOLDER_COLOR = '#8C7BA6';

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
  const accentColor = color || DEFAULT_FOLDER_COLOR;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative w-full rounded-2xl overflow-hidden luisices-glass border border-white/60 dark:border-white/10 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col text-left focus:outline-hidden focus:ring-2 focus:ring-primary/40 select-none"
    >
      {/* Área da Capa / Banner do Álbum */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted/40">
        {cover ? (
          <img
            src={cover}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${accentColor}cc 0%, ${accentColor}66 100%)`,
            }}
          >
            {/* Padrão visual elegante de fundo */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xs group-hover:scale-110 transition-transform duration-300">
              <FolderHeart className="size-6" />
            </div>
          </div>
        )}

        {/* Gradiente sutil para garantir legibilidade dos badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Badge superior esquerdo: Contagem de Artes */}
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/55 text-white backdrop-blur-md border border-white/20 flex items-center gap-1 shadow-xs">
            <Images className="size-3 shrink-0" />
            <span>{count} {count === 1 ? 'arte' : 'artes'}</span>
          </span>
        </div>

        {/* Botões de Ação no topo direito (Editar / Excluir) */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="size-7 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            title={`Editar capa e cor do álbum "${name}"`}
            aria-label={`Editar capa e cor do álbum "${name}"`}
          >
            <Pencil className="size-3" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="size-7 rounded-full bg-black/55 hover:bg-destructive text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title={`Remover pasta vazia "${name}"`}
              aria-label={`Remover pasta vazia "${name}"`}
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>

        {/* Indicador de Identidade Visual / Selo da Coleção */}
        <div className="absolute bottom-2 left-2.5 z-10 flex items-center gap-1.5">
          <span
            className="size-2 rounded-full ring-2 ring-white/60 shadow-xs"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-[10px] font-semibold text-white/90 drop-shadow-xs uppercase tracking-wider">
            Coleção
          </span>
        </div>
      </div>

      {/* Conteúdo Inferior do Álbum */}
      <div className="p-3 sm:p-3.5 space-y-1.5 bg-card/85 backdrop-blur-md flex-1 flex flex-col justify-between">
        <div className="space-y-0.5">
          <h3 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight">
            {name}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate">
            {count === 0 ? 'Nenhuma arte adicionada' : `${count} peças catalogadas`}
          </p>
        </div>

        {/* Tags da Coleção */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium luisices-chip leading-none border"
                style={{
                  backgroundColor: `${t.color}15`,
                  borderColor: `${t.color}35`,
                  color: t.color,
                }}
              >
                #{t.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[9px] text-muted-foreground self-center">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Barra de Acabamento com a cor da coleção */}
      <div
        className="h-1 w-full shrink-0 transition-opacity"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
}
