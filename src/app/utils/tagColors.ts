export const TAG_COLORS = [
  { name: 'Vermelho', value: '#ef4444', textColor: '#ffffff' },
  { name: 'Laranja', value: '#f97316', textColor: '#ffffff' },
  { name: 'Amarelo', value: '#eab308', textColor: '#000000' },
  { name: 'Lima', value: '#84cc16', textColor: '#000000' },
  { name: 'Verde', value: '#22c55e', textColor: '#ffffff' },
  { name: 'Esmeralda', value: '#10b981', textColor: '#ffffff' },
  { name: 'Azul Claro', value: '#06b6d4', textColor: '#ffffff' },
  { name: 'Azul', value: '#3b82f6', textColor: '#ffffff' },
  { name: 'Índigo', value: '#6366f1', textColor: '#ffffff' },
  { name: 'Roxo', value: '#a855f7', textColor: '#ffffff' },
  { name: 'Rosa', value: '#ec4899', textColor: '#ffffff' },
  { name: 'Cinza', value: '#6b7280', textColor: '#ffffff' },
];

export const getTextColor = (bgColor: string): string => {
  const color = TAG_COLORS.find(c => c.value === bgColor);
  return color?.textColor || '#ffffff';
};
