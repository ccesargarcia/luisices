import React from 'react';
import { Button } from '../ui/button';
import { UserProfile } from '../../types';
import { UserCheck, ArchiveRestore, Archive, Trash2 } from 'lucide-react';

interface DashboardBulkBarProps {
  selectedOrderIds: string[];
  totalTabOrders: number;
  pagedOrdersLength: number;
  pageSize: number | 'all';
  allVisibleOrdersSelected: boolean;
  allTabOrdersSelected: boolean;
  userProfile: UserProfile | null;
  activeTab: 'all' | 'pending' | 'in-progress' | 'completed' | 'archived';
  canArchive: boolean;
  canUnarchive: boolean;
  bulkArchiving: boolean;
  bulkOrderDeleting: boolean;
  hasDeletePermission: boolean;
  onToggleSelectAllVisibleOrders: () => void;
  onToggleSelectAllTabOrders: () => void;
  onClearSelection: () => void;
  onOpenBulkAssign: () => void;
  onBulkArchiveOrders: () => void;
  onBulkUnarchiveOrders: () => void;
  onOpenBulkDelete: () => void;
}

export function DashboardBulkBar({
  selectedOrderIds,
  totalTabOrders,
  pagedOrdersLength,
  pageSize,
  allVisibleOrdersSelected,
  allTabOrdersSelected,
  userProfile,
  activeTab,
  canArchive,
  canUnarchive,
  bulkArchiving,
  bulkOrderDeleting,
  hasDeletePermission,
  onToggleSelectAllVisibleOrders,
  onToggleSelectAllTabOrders,
  onClearSelection,
  onOpenBulkAssign,
  onBulkArchiveOrders,
  onBulkUnarchiveOrders,
  onOpenBulkDelete,
}: DashboardBulkBarProps) {
  if (selectedOrderIds.length === 0) return null;

  return (
    <div className="glass-chip flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-primary font-medium">
          {selectedOrderIds.length} selecionado{selectedOrderIds.length === 1 ? '' : 's'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSelectAllVisibleOrders}
          className="h-8 text-xs sm:text-sm"
        >
          {allVisibleOrdersSelected
            ? `Desmarcar página (${pagedOrdersLength})`
            : `Selecionar página (${pagedOrdersLength})`}
        </Button>
        {pageSize !== 'all' && totalTabOrders > pagedOrdersLength && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSelectAllTabOrders}
            className="h-8 text-xs text-muted-foreground hover:text-foreground underline decoration-dotted"
          >
            {allTabOrdersSelected
              ? `Desmarcar todos os ${totalTabOrders} da aba`
              : `Selecionar todos os ${totalTabOrders} da aba`}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {userProfile?.role === 'admin' && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-xs sm:text-sm font-medium"
            onClick={onOpenBulkAssign}
          >
            <UserCheck className="size-4 text-primary shrink-0" />
            <span>Atribuir ({selectedOrderIds.length})</span>
          </Button>
        )}

        {activeTab === 'archived' && canUnarchive && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
            onClick={onBulkUnarchiveOrders}
            disabled={bulkArchiving}
          >
            <ArchiveRestore className="size-4 shrink-0" />
            <span>Desarquivar ({selectedOrderIds.length})</span>
          </Button>
        )}

        {activeTab !== 'archived' && canArchive && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-xs sm:text-sm font-medium"
            onClick={onBulkArchiveOrders}
            disabled={bulkArchiving}
          >
            <Archive className="size-4 text-primary shrink-0" />
            <span>Arquivar ({selectedOrderIds.length})</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs sm:text-sm"
          onClick={onClearSelection}
        >
          Limpar
        </Button>

        {hasDeletePermission && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2 h-9 text-xs sm:text-sm"
            onClick={onOpenBulkDelete}
            disabled={bulkOrderDeleting}
          >
            <Trash2 className="size-4 shrink-0" />
            Excluir selecionados
          </Button>
        )}
      </div>
    </div>
  );
}
