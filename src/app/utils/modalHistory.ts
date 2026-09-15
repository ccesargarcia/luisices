/**
 * Gerenciador de histórico do navegador/celular para Modais, Dialogs, Alert-Dialogs e Sheets.
 *
 * Permite que o botão físico ou gesto de 'Voltar' do celular (Android/iOS)
 * feche o modal atualmente aberto, em vez de descarregar a página atual
 * ou retornar para a tela anterior (ex: login).
 */

import * as React from 'react';

interface ModalEntry {
  id: string;
  originUrl: string;
  close: () => void;
}

const modalStack: ModalEntry[] = [];
let pendingProgrammaticPops = 0;
let isPopstateDispatching = false;
let popTimeout: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // Se o popstate veio de um history.back() disparado programaticamente por nós, ignore
    if (pendingProgrammaticPops > 0) {
      pendingProgrammaticPops--;
      if (popTimeout) {
        clearTimeout(popTimeout);
        popTimeout = null;
      }
      return;
    }

    // Fecha o modal do topo da pilha se houver algum aberto
    if (modalStack.length > 0) {
      const topModal = modalStack.pop();
      if (topModal) {
        isPopstateDispatching = true;
        try {
          topModal.close();
        } finally {
          isPopstateDispatching = false;
        }
      }
    }
  });
}

/**
 * Registra a abertura de um modal na pilha.
 * Insere um estado no histórico para interceptar o botão voltar do celular.
 */
export function registerModal(id: string, close: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const originUrl = window.location.pathname + window.location.search;

  try {
    const currentState = window.history.state || {};
    window.history.pushState({ ...currentState, __modalId: id }, '', window.location.href);
  } catch (err) {
    console.warn('Não foi possível registrar estado no histórico para o modal:', err);
  }

  modalStack.push({ id, originUrl, close });

  return () => {
    const index = modalStack.findIndex((m) => m.id === id);
    if (index !== -1) {
      const entry = modalStack[index];
      modalStack.splice(index, 1);

      // Se foi fechado programaticamente (usuário clicou em X, Salvar, Cancelar, etc.)
      // e ainda estamos na mesma URL onde o modal foi aberto, removemos a entrada do histórico
      if (!isPopstateDispatching) {
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl === entry.originUrl) {
          pendingProgrammaticPops++;
          if (popTimeout) clearTimeout(popTimeout);
          popTimeout = setTimeout(() => {
            pendingProgrammaticPops = 0;
          }, 500);

          try {
            window.history.back();
          } catch (err) {
            console.warn('Erro ao restaurar histórico após fechar modal:', err);
          }
        }
      }
    }
  };
}

/**
 * Hook do React para sincronizar o estado aberto de um modal com o histórico do navegador.
 */
export function useModalHistory(isOpen: boolean, onClose?: () => void) {
  const id = React.useId();
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!isOpen) return;

    return registerModal(id, () => {
      onCloseRef.current?.();
    });
  }, [isOpen, id]);
}
