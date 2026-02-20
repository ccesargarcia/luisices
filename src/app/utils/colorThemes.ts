export type ColorThemeKey = 'default' | 'rose' | 'purple' | 'blue' | 'green' | 'orange';

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
    displayColor: '#030213',
    primary: '#030213',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.708 0 0)',
    sidebarPrimary: '#030213',
  },
  {
    key: 'rose',
    label: 'Rosa',
    displayColor: '#e11d48',
    primary: 'oklch(0.645 0.246 16.439)',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.645 0.246 16.439)',
    sidebarPrimary: 'oklch(0.645 0.246 16.439)',
  },
  {
    key: 'purple',
    label: 'Roxo',
    displayColor: '#9333ea',
    primary: 'oklch(0.627 0.265 303.9)',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.627 0.265 303.9)',
    sidebarPrimary: 'oklch(0.627 0.265 303.9)',
  },
  {
    key: 'blue',
    label: 'Azul',
    displayColor: '#2563eb',
    primary: 'oklch(0.546 0.245 264.052)',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.546 0.245 264.052)',
    sidebarPrimary: 'oklch(0.546 0.245 264.052)',
  },
  {
    key: 'green',
    label: 'Verde',
    displayColor: '#16a34a',
    primary: 'oklch(0.527 0.154 150.069)',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.527 0.154 150.069)',
    sidebarPrimary: 'oklch(0.527 0.154 150.069)',
  },
  {
    key: 'orange',
    label: 'Laranja',
    displayColor: '#ea580c',
    primary: 'oklch(0.646 0.222 41.116)',
    foreground: 'oklch(1 0 0)',
    ring: 'oklch(0.646 0.222 41.116)',
    sidebarPrimary: 'oklch(0.646 0.222 41.116)',
  },
];

export function applyColorTheme(key: ColorThemeKey) {
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
