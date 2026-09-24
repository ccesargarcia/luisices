import { ArchiveItem } from './types';

export const INITIAL_ARCHIVE_ITEMS: ArchiveItem[] = [
  {
    id: 'arc-1',
    title: 'Sereia Encantada Lilás & Menta 3D',
    theme: 'Sereia / Fundo do Mar',
    category: 'infantil_3d',
    description: 'Topo com base inteiriça em lilás escuro, concha com pérola e elementos marinhos com fita banana de 2mm.',
    papers: ['Colorplus Lilás 180g', 'Lamicote Dourado 250g', 'Colorplus Verde Menta 180g', 'Fotográfico Matte 230g'],
    layersCount: 4,
    silhouetteTips: 'Rastreio externo com limiar de 75%. O Lamicote cortar com lâmina 4, força 32 e 2 passadas.',
    imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80',
    tags: ['Sereia', '3D', 'Lamicote Dourado', 'Pastel']
  },
  {
    id: 'arc-2',
    title: 'Safari Baby Real com Folhagens Tropicais',
    theme: 'Safari / Selva Baby',
    category: 'infantil_3d',
    description: 'Animais em aquarela montados sobre folhagens de costela-de-adão em camadas de verde oliva e kraft.',
    papers: ['Kraft Rústico 200g', 'Colorplus Verde Floresta 180g', 'Colorplus Mostarda 180g', 'Fotográfico Matte 230g'],
    layersCount: 3,
    silhouetteTips: 'Folhagens cortadas em velocidade 6 na Portrait. Usar esteira com aderência leve para não rasgar as pontas.',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
    tags: ['Safari', 'Leãozinho', 'Kraft', 'Folhagens']
  },
  {
    id: 'arc-3',
    title: 'Floral Luxo Rosé Gold & Margaridas',
    theme: 'Floral Clássico / Adulto',
    category: 'floral_luxo',
    description: 'Flores em espiral montadas com pinça e folhas vazadas em Lamicote Rosé Gold com aro estrutural.',
    papers: ['Lamicote Rosé 250g', 'Colorplus Rosa Chá 180g', 'Perolizado Marfim 180g'],
    layersCount: 4,
    silhouetteTips: 'Espiral floral cortada em velocidade 4 para manter a precisão das pétalas boleadas.',
    imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&q=80',
    tags: ['Floral', 'Adulto', 'Rosé Gold', 'Flores 3D']
  },
  {
    id: 'arc-4',
    title: 'Ursinho Aviador Vintage com Nuvens Shaker',
    theme: 'Aviação / Ursinho Baloeiro',
    category: 'shaker',
    description: 'Visor central em acetato com micro miçangas peroladas e estrelinhas douradas, sobreposto com aviãozinho.',
    papers: ['Acetato Cristal 20 Micron', 'Colorplus Azul Bebê 180g', 'Colorplus Branco Neve 240g', 'Lamicote Prata'],
    layersCount: 5,
    silhouetteTips: 'Acetato deve ser cortado com lâmina de corte profundo ou tesoura de precisão se a base da Portrait perder aderência.',
    imageUrl: 'https://images.unsplash.com/photo-1557308536-ee471ef2c390?auto=format&fit=crop&w=600&q=80',
    tags: ['Shaker', 'Acetato', 'Ursinho', 'Aviador']
  }
];
