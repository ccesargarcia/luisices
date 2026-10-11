import React from 'react';
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
import { Trash2, Loader2 } from 'lucide-react';

export interface EmailDeleteConfirmDialogsProps {
  // Exclusão individual
  emailToDelete: {
    id: string;
    subject: string;
    type: 'received' | 'sent';
    isPermanent?: boolean;
  } | null;
  onCloseDeleteIndividual: () => void;
  onConfirmDeleteIndividual: () => void;

  // Exclusão em lote
  isBulkDeleteDialogOpen: boolean;
  onCloseBulkDelete: () => void;
  onConfirmBulkDelete: () => void;
  isBulkDeleting: boolean;
  selectedCount: number;
  activeFolder: string;

  // Esvaziar lixeira
  isEmptyTrashDialogOpen: boolean;
  onCloseEmptyTrash: () => void;
  onConfirmEmptyTrash: () => void;
}

export function EmailDeleteConfirmDialogs({
  emailToDelete,
  onCloseDeleteIndividual,
  onConfirmDeleteIndividual,
  isBulkDeleteDialogOpen,
  onCloseBulkDelete,
  onConfirmBulkDelete,
  isBulkDeleting,
  selectedCount,
  activeFolder,
  isEmptyTrashDialogOpen,
  onCloseEmptyTrash,
  onConfirmEmptyTrash,
}: EmailDeleteConfirmDialogsProps) {
  return (
    <>
      {/* 1. Modal de Confirmação de Exclusão Individual */}
      <AlertDialog
        open={Boolean(emailToDelete)}
        onOpenChange={(open) => {
          if (!open) onCloseDeleteIndividual();
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {emailToDelete?.isPermanent
                ? 'Excluir definitivamente'
                : emailToDelete?.type === 'received'
                ? 'Mover e-mail para a lixeira?'
                : 'Mover registro para a lixeira?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {emailToDelete?.isPermanent
                ? `Tem certeza que deseja excluir o e-mail "${emailToDelete?.subject}" definitivamente? Esta ação não pode ser desfeita.`
                : `Deseja mover o e-mail "${emailToDelete?.subject}" para a lixeira? Você poderá restaurá-lo a qualquer momento.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDeleteIndividual}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
            >
              {emailToDelete?.isPermanent ? 'Excluir definitivamente' : 'Mover para a lixeira'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Modal de Confirmação de Exclusão em Massa (Bulk Delete) */}
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) onCloseBulkDelete();
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-base">
              <Trash2 className="size-4 text-destructive" />
              {activeFolder === 'trash'
                ? `Excluir ${selectedCount} e-mail(s) definitivamente?`
                : `Mover ${selectedCount} e-mail(s) para a lixeira?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              {activeFolder === 'trash'
                ? `Esta ação removerá permanentemente os ${selectedCount} e-mails da lixeira. Esta ação não pode ser desfeita.`
                : `Os ${selectedCount} e-mails selecionados serão movidos para a lixeira. Você poderá restaurá-los se precisar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={isBulkDeleting} className="text-xs h-8">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8 gap-1.5"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{activeFolder === 'trash' ? 'Excluindo...' : 'Movendo...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>
                    {activeFolder === 'trash'
                      ? `Excluir definitivamente (${selectedCount})`
                      : `Mover para a lixeira (${selectedCount})`}
                  </span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 3. Modal de Confirmação para Esvaziar a Lixeira */}
      <AlertDialog
        open={isEmptyTrashDialogOpen}
        onOpenChange={(open) => {
          if (!open) onCloseEmptyTrash();
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-base">
              <Trash2 className="size-4 text-destructive" />
              Esvaziar lixeira?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Todos os e-mails na lixeira serão excluídos definitivamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={isBulkDeleting} className="text-xs h-8">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmEmptyTrash}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8 gap-1.5"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Esvaziando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Esvaziar Lixeira</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
