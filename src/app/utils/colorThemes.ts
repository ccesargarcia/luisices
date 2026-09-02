export type ColorThemeKey = 'default' | 'rose' | 'purple' | 'blue' | 'green' | 'orange' | 'custom';

export interface ColorTheme {
  key: ColorThemeKey;
  label: string;
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
    label: 'Padrão',
    displayColor: '#613d3e',
    primary: '#613d3e',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.708 0 0)',
    sidebarPrimary: '#030213',
  },
  {
    key: 'rose',
    label: 'Rosa',
    displayColor: '#c9868b',
    primary: '#c9868b',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.645 0.246 16.439)',
    sidebarPrimary: 'oklch(0.645 0.246 16.439)',
  },
  {
    key: 'purple',
    label: 'Roxo',
    displayColor: '#8b7eaa',
    primary: '#8b7eaa',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.627 0.265 303.9)',
    sidebarPrimary: 'oklch(0.627 0.265 303.9)',
  },
  {
    key: 'blue',
    label: 'Azul',
    displayColor: '#718fa3',
    primary: '#718fa3',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.546 0.245 264.052)',
    sidebarPrimary: 'oklch(0.546 0.245 264.052)',
  },
  {
    key: 'green',
    label: 'Verde',
    displayColor: '#759986',
    primary: '#759986',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.527 0.154 150.069)',
    sidebarPrimary: 'oklch(0.527 0.154 150.069)',
  },
  {
    key: 'orange',
    label: 'Laranja',
    displayColor: '#b18a63',
    primary: '#b18a63',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.646 0.222 41.116)',
    sidebarPrimary: 'oklch(0.646 0.222 41.116)',
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
