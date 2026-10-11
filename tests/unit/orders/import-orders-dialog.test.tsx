import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImportOrdersDialog } from '../../../src/app/components/orders/ImportOrdersDialog';

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-1', email: 'test@luisices.com.br' },
    isAdmin: true,
    hasPermission: () => true,
  }),
}));

describe('Componente ImportOrdersDialog', () => {
  it('deve renderizar o botão de disparo de importação do Excel corretamente', () => {
    const html = renderToStaticMarkup(
      <ImportOrdersDialog onImportSuccess={vi.fn()} />
    );

    expect(html).toContain('Importar Excel');
    expect(html).toContain('button');
  });

  it('deve renderizar com botão customizado quando passado via triggerButton', () => {
    const html = renderToStaticMarkup(
      <ImportOrdersDialog
        triggerButton={<button id="custom-import-btn">Importar Planilha</button>}
      />
    );

    expect(html).toContain('custom-import-btn');
    expect(html).toContain('Importar Planilha');
  });
});
