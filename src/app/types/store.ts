export interface ProductFinish {
  id: string;
  name: string;
  category: 'foil' | 'paper' | 'seal' | 'ribbon';
  description: string;
  badge: string;
  extraPrice: number;
  previewUrl: string;
  swatchHex?: string;
}

export interface StoreProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: 'casamentos' | 'maternidade' | 'debutantes' | 'corporativo' | 'topos_3d';
  categoryLabel: string;
  description: string;
  details: string[];
  basePrice: number;
  minQuantity: number;
  unitLabel: string;
  rating: number;
  reviewsCount: number;
  mainImage: string;
  galleryImages: string[];
  tags: string[];
  materials: string[];
  estimatedDaysToProduce: number;
  isBestseller?: boolean;
  availableFinishes: ProductFinish[];
}

export interface CustomizationState {
  productId: string;
  quantity: number;
  selectedFinishes: Record<string, string>; // category -> finishId
  celebrationDate: string; // YYYY-MM-DD
  namesOrInitials: string;
  monogramText?: string;
  colorPaletteNotes?: string;
  customerNotes?: string;
  paymentMethod: 'split_50_50' | 'pix_full_discount';
}

export interface CostBreakdownItem {
  label: string;
  sublabel: string;
  amount: number;
}
