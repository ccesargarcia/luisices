export type AppThemeId =
  | 'light'
  | 'dark'
  | 'deep-ocean'
  | 'forest-glow'
  | 'sunset-amber'
  | 'system';

export interface ThemePreset {
  id: AppThemeId;
  name: string;
  subtitle: string;
  description: string;
  category: 'standard' | 'custom' | 'system';
  badge?: string;
  isDarkBase: boolean;
  /** Primary hex/rgba preview for UI */
  primaryColor: string;
  /** Background hex preview for UI card */
  backgroundColor: string;
  /** Card surface preview for UI card */
  cardColor: string;
  /** Text color preview for UI card */
  textColor: string;
  /** Border color preview */
  borderColor: string;
  /** Ambient gradient for preview swatch */
  gradient: string;
  iconName: 'sun' | 'moon' | 'waves' | 'trees' | 'flame' | 'monitor';
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'light',
    name: 'Claro (Warm Paper)',
    subtitle: 'Marsala & Tons Suaves de Papel',
    description: 'Tema claro original do ateliê, com conforto visual acolhedor, tons de papel linho e acabamento marsala.',
    category: 'standard',
    badge: 'Padrão Claro',
    isDarkBase: false,
    primaryColor: '#613d3e',
    backgroundColor: '#fff8f7',
    cardColor: '#ffffff',
    textColor: '#221a1a',
    borderColor: 'rgba(97, 61, 62, 0.15)',
    gradient: 'linear-gradient(135deg, #fceee9 0%, #fff8f7 50%, #ede7f6 100%)',
    iconName: 'sun',
  },
  {
    id: 'dark',
    name: 'Escuro (Midnight Velvet)',
    subtitle: 'Alto Contraste & Rosa Chá',
    description: 'Tema escuro padrão com camadas profundas de veludo grafite, contraste suave e destaques em rosa chá refinado.',
    category: 'standard',
    badge: 'Padrão Escuro',
    isDarkBase: true,
    primaryColor: '#f4b7b9',
    backgroundColor: '#161214',
    cardColor: '#1f191b',
    textColor: '#e8e0e3',
    borderColor: 'rgba(235, 205, 205, 0.16)',
    gradient: 'linear-gradient(135deg, #1f191b 0%, #161214 60%, #28192d 100%)',
    iconName: 'moon',
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    subtitle: 'Azul Abissal & Ciano Luminescente',
    description: 'Atmosfera moderna e imersiva com ardósia marinha profunda, superfícies de vidro translúcido e ciano elétrico.',
    category: 'custom',
    badge: 'Moderno',
    isDarkBase: true,
    primaryColor: '#06b6d4',
    backgroundColor: '#080e1a',
    cardColor: '#0f172a',
    textColor: '#e2e8f0',
    borderColor: 'rgba(56, 189, 248, 0.22)',
    gradient: 'linear-gradient(135deg, #0b1329 0%, #080e1a 50%, #0f2b48 100%)',
    iconName: 'waves',
  },
  {
    id: 'forest-glow',
    name: 'Forest Glow',
    subtitle: 'Verde Esmeralda & Menta Nórdica',
    description: 'Equilíbrio biofílico elegante inspirado em florestas nórdicas, com tons de pinheiro escuro, musgo e menta relaxante.',
    category: 'custom',
    badge: 'Moderno',
    isDarkBase: true,
    primaryColor: '#10b981',
    backgroundColor: '#07150e',
    cardColor: '#0a1f16',
    textColor: '#ecfdf5',
    borderColor: 'rgba(52, 211, 153, 0.22)',
    gradient: 'linear-gradient(135deg, #0b1c14 0%, #07150e 50%, #132a1e 100%)',
    iconName: 'trees',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    subtitle: 'Âmbar Dourado & Terracota',
    description: 'Calor do pôr do sol em tons de cobre fundido, âmbar solar e atmosfera crepuscular aconchegante.',
    category: 'custom',
    badge: 'Moderno',
    isDarkBase: true,
    primaryColor: '#f59e0b',
    backgroundColor: '#170f0b',
    cardColor: '#231611',
    textColor: '#fef3c7',
    borderColor: 'rgba(245, 158, 11, 0.24)',
    gradient: 'linear-gradient(135deg, #24130d 0%, #170f0b 50%, #351b14 100%)',
    iconName: 'flame',
  },
  {
    id: 'system',
    name: 'Automático (Sistema)',
    subtitle: 'Sincronizado com o Dispositivo',
    description: 'Alterna suavemente entre os modos Claro e Escuro de acordo com as preferências do seu sistema operacional.',
    category: 'system',
    badge: 'Automático',
    isDarkBase: false,
    primaryColor: '#6366f1',
    backgroundColor: '#f1f5f9',
    cardColor: '#ffffff',
    textColor: '#334155',
    borderColor: 'rgba(99, 102, 241, 0.2)',
    gradient: 'linear-gradient(135deg, #e2e8f0 0%, #ffffff 50%, #cbd5e1 100%)',
    iconName: 'monitor',
  },
];

export const AVAILABLE_THEME_IDS: AppThemeId[] = THEME_PRESETS.map((t) => t.id);

export function getThemePreset(id: string | undefined): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
}
