// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ALL_THEME_CLASSES,
  applyCatalogTheme,
  restoreAdminTheme,
} from '@/app/pages/PublicCatalog';

describe('Desacoplamento e Isolamento de Tema da Loja Pública (PublicCatalog)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve listar todas as classes de temas conhecidos da plataforma', () => {
    expect(ALL_THEME_CLASSES).toContain('light');
    expect(ALL_THEME_CLASSES).toContain('dark');
    expect(ALL_THEME_CLASSES).toContain('deep-ocean');
    expect(ALL_THEME_CLASSES).toContain('forest-glow');
    expect(ALL_THEME_CLASSES).toContain('sunset-amber');
  });

  it('deve aplicar Modo Claro na loja limpando temas modernos do admin (deep-ocean, forest-glow, etc.)', () => {
    // Simula que o usuário admin estava navegando com tema moderno 'deep-ocean'
    document.documentElement.classList.add('deep-ocean');
    document.documentElement.setAttribute('data-theme', 'deep-ocean');

    // Ao carregar a loja no modo claro
    applyCatalogTheme(false);

    // O elemento raiz DEVE ter limpado o deep-ocean e aplicado apenas light
    expect(document.documentElement.classList.contains('deep-ocean')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('deve alternar para Modo Escuro na loja pública sem interferir em outras classes', () => {
    applyCatalogTheme(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);

    applyCatalogTheme(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('deve restaurar fielmente o tema original do admin quando sair da loja (unmount)', () => {
    // Usuário admin com tema 'forest-glow'
    localStorage.setItem('theme', 'forest-glow');

    // Usuário entra na loja e muda para claro
    applyCatalogTheme(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('forest-glow')).toBe(false);

    // Usuário sai da loja pública de volta para o dashboard
    restoreAdminTheme();

    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(document.documentElement.classList.contains('forest-glow')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('forest-glow');
  });

  it('deve restaurar tema de sistema escuro quando admin usa system e sistema prefere escuro', () => {
    localStorage.setItem('theme', 'system');
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    applyCatalogTheme(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);

    restoreAdminTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
