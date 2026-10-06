export type ColorThemeKey =
  | 'default'
  | 'rose'
  | 'purple'
  | 'blue'
  | 'green'
  | 'orange'
  | 'coral'
  | 'indigo'
  | 'slate'
  | 'emerald'
  | 'custom';

export interface ColorTheme {
  key: ColorThemeKey;
  label: string;
  description?: string;
  /** Hex for display in UI circles */
  displayColor: string;
  /** CSS oklch/hex value applied to --primary */
  primary: string;
  /** CSS value applied to --primary-foreground */
  foreground: string;
  /** CSS value applied to --ring */
  ring: string;
  /** CSS value applied to --sidebar-primary */
  sidebarPrimary: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    key: 'default',
    label: 'Padrão do Ateliê',
    description: 'Marsala & Rosa Chá original da marca',
    displayColor: '#613d3e',
    primary: '#613d3e',
    foreground: '#ffffff',
    ring: '#e2dfff',
    sidebarPrimary: '#7b5455',
  },
  {
    key: 'rose',
    label: 'Rosa Delicado',
    description: 'Tons suaves de blush e rosa antigo',
    displayColor: '#c9868b',
    primary: '#c9868b',
    foreground: '#ffffff',
    ring: 'oklch(0.645 0.246 16.439)',
    sidebarPrimary: '#c9868b',
  },
  {
    key: 'purple',
    label: 'Lavanda & Ametista',
    description: 'Lilás criativo, moderno e suave',
    displayColor: '#8b7eaa',
    primary: '#8b7eaa',
    foreground: '#ffffff',
    ring: 'oklch(0.627 0.265 303.9)',
    sidebarPrimary: '#8b7eaa',
  },
  {
    key: 'blue',
    label: 'Azul Oceano & Céu',
    description: 'Azul sereno e estruturado para foco',
    displayColor: '#3b82f6',
    primary: '#3b82f6',
    foreground: '#ffffff',
    ring: '#93c5fd',
    sidebarPrimary: '#2563eb',
  },
  {
    key: 'green',
    label: 'Sálvia & Menta Botânica',
    description: 'Verde artesanal, natural e acolhedor',
    displayColor: '#10b981',
    primary: '#10b981',
    foreground: '#ffffff',
    ring: '#a7f3d0',
    sidebarPrimary: '#059669',
  },
  {
    key: 'orange',
    label: 'Âmbar & Mel Dourado',
    description: 'Tons solares e aconchegantes',
    displayColor: '#f59e0b',
    primary: '#f59e0b',
    foreground: '#ffffff',
    ring: '#fde68a',
    sidebarPrimary: '#d97706',
  },
  {
    key: 'coral',
    label: 'Coral & Flamingo',
    description: 'Vibrante, alegre e festivo',
    displayColor: '#f43f5e',
    primary: '#f43f5e',
    foreground: '#ffffff',
    ring: '#fecdd3',
    sidebarPrimary: '#e11d48',
  },
  {
    key: 'indigo',
    label: 'Índigo Cósmico',
    description: 'Azul profundo moderno e tecnológico',
    displayColor: '#6366f1',
    primary: '#6366f1',
    foreground: '#ffffff',
    ring: '#c7d2fe',
    sidebarPrimary: '#4f46e5',
  },
  {
    key: 'emerald',
    label: 'Esmeralda Nobre',
    description: 'Verde rico com acabamento sofisticado',
    displayColor: '#059669',
    primary: '#059669',
    foreground: '#ffffff',
    ring: '#6ee7b7',
    sidebarPrimary: '#047857',
  },
  {
    key: 'slate',
    label: 'Minimalist Slate',
    description: 'Grafite e ardósia neutro e elegante',
    displayColor: '#64748b',
    primary: '#64748b',
    foreground: '#ffffff',
    ring: '#cbd5e1',
    sidebarPrimary: '#475569',
  },
];

/** Apply a hex color directly as the primary theme color. */
export function applyCustomColorHex(hex: string) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hex);
  root.style.setProperty('--primary-foreground', 'oklch(1 0 0)');
  root.style.setProperty('--ring', hex);
  root.style.setProperty('--sidebar-primary', hex);
}

export function applyColorTheme(key: ColorThemeKey, customHex?: string) {
  if (key === 'custom') {
    if (customHex) applyCustomColorHex(customHex);
    return;
  }
  const theme = COLOR_THEMES.find((t) => t.key === key);
  if (!theme) return;
  const root = document.documentElement;
  if (key === 'default') {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--sidebar-primary');
  } else {
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-foreground', theme.foreground);
    root.style.setProperty('--ring', theme.ring);
    root.style.setProperty('--sidebar-primary', theme.sidebarPrimary);
  }
}
