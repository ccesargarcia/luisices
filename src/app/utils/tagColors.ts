export const TAG_COLORS = [
  { name: 'Vermelho', value: '#b86b6b', textColor: '#ffffff' },
  { name: 'Laranja', value: '#bf8a62', textColor: '#ffffff' },
  { name: 'Amarelo', value: '#b49a5a', textColor: '#1f1b1b' },
  { name: 'Lima', value: '#879b62', textColor: '#1f1b1b' },
  { name: 'Verde', value: '#638d75', textColor: '#ffffff' },
  { name: 'Esmeralda', value: '#5b9181', textColor: '#ffffff' },
  { name: 'Azul Claro', value: '#6e9eaa', textColor: '#ffffff' },
  { name: 'Azul', value: '#6785a8', textColor: '#ffffff' },
  { name: 'Índigo', value: '#7d7da8', textColor: '#ffffff' },
  { name: 'Roxo', value: '#8d789f', textColor: '#ffffff' },
  { name: 'Rosa', value: '#b97886', textColor: '#ffffff' },
  { name: 'Cinza', value: '#77737a', textColor: '#ffffff' },
];

export const getTextColor = (bgColor: string): string => {
  const color = TAG_COLORS.find(c => c.value === bgColor);
  return color?.textColor || '#ffffff';
};
