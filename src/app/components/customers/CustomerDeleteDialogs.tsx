import React from 'react';
import { Customer } from '../../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface SingleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  activeOrdersCount: number;
  loading: boolean;
  onConfirmDelete: () => Promise<void>;
}

export function SingleCustomerDeleteDialog({
  open,
  onOpenChange,
  customer,
  activeOrdersCount,
  loading,
  onConfirmDelete,
}: SingleDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activeOrdersCount > 0 ? 'Não é possível excluir' : 'Confirmar exclusão'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {activeOrdersCount > 0 ? (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="size-4 text-orange-500 mt-0.5 shrink-0" />
                <span>
                  O cliente <strong>{customer?.name}</strong> possui{' '}
                  <strong>
                    {activeOrdersCount} pedido{activeOrdersCount > 1 ? 's' : ''} ativo
                    {activeOrdersCount > 1 ? 's' : ''}
                  </strong>{' '}
                  (pendente ou em produção). Conclua ou cancele esses pedidos antes de excluir o
                  cliente.
                </span>
              </div>
            ) : (
              <span>
                Tem certeza que deseja excluir o cliente <strong>{customer?.name}</strong>?
                Esta ação não pode ser desfeita.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {activeOrdersCount === 0 && (
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  blockedCustomers: { id: string; name: string; count: number }[];
  loading: boolean;
  onConfirmDelete: () => Promise<void>;
}

export function BulkCustomerDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  blockedCustomers,
  loading,
  onConfirmDelete,
}: BulkDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir clientes selecionados</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedCount === 0 ? (
              'Nenhum cliente selecionado.'
            ) : blockedCustomers.length > 0 ? (
              <div className="space-y-2 text-sm">
                <p>
                  Não é possível excluir <strong>{blockedCustomers.length}</strong> cliente
                  {blockedCustomers.length !== 1 ? 's' : ''} porque possuem pedidos ativos.
                </p>
                <ul className="list-disc list-inside text-sm">
                  {blockedCustomers.map((c) => (
                    <li key={c.id}>
                      {c.name} ({c.count} pedido{c.count !== 1 ? 's' : ''} ativo
                      {c.count !== 1 ? 's' : ''})
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <span>
                Tem certeza que deseja excluir <strong>{selectedCount}</strong> cliente
                {selectedCount !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            className="bg-destructive text-destructive-foreground"
            disabled={loading || selectedCount === 0 || blockedCustomers.length > 0}
          >
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Excluir selecionados
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
