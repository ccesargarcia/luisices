export interface ArchiveItem {
  id: string;
  title: string;
  theme: string;
  category: 'infantil_3d' | 'floral_luxo' | 'shaker' | 'classico' | 'mesversario';
  description: string;
  papers: string[];
  layersCount: number;
  silhouetteTips: string;
  imageUrl: string;
  tags: string[];
}

export interface GenerationRequest {
  theme: string;
  recipientName: string;
  ageOrOccasion?: string;
  category: 'infantil_3d' | 'floral_luxo' | 'shaker' | 'classico' | 'mesversario';
  cakeColor?: string;
  preferredPapers?: string[];
  referenceArchiveId?: string;
  additionalNotes?: string;
}

export interface CutSheetPreview {
  sheetIndex: number;
  sheetTitle: string;
  paperType: string;
  colorHex: string;
  colorName: string;
  bladeDepth: string;
  force: string;
  speed: string;
  passes: string;
  svgContent: string;
  piecesCount: number;
  notes: string;
}

export interface TechnicalSheet {
  title: string;
  theme: string;
  recipientName: string;
  ageOrOccasion: string;
  recommendedPapers: {
    layer: string;
    paperType: string;
    color: string;
    grammage: string;
    finish: string;
  }[];
  layerBreakdown: {
    level: number;
    name: string;
    purpose: string;
    foamTapeHeight: string;
    elements: string[];
  }[];
  silhouetteSettings: {
    bladeDepth: string;
    force: string;
    speed: string;
    passes: string;
    cutType: 'Print & Cut' | 'Corte Seco em Camadas' | 'Corte em Lamicote';
    notes: string;
  }[];
  assemblySteps: string[];
  whatsappPitch: string;
  cutSheets?: CutSheetPreview[];
}

export interface ConceptResult {
  id: string;
  createdAt: string;
  request: GenerationRequest;
  technicalSheet: TechnicalSheet;
  renderedPrompt: string;
  mockupImage?: string;
}

export type GenerationResult = ConceptResult;

export type SaaSPlanId = 'trial' | 'solo' | 'pro' | 'studio_plus';

export interface SaaSPlan {
  id: SaaSPlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  aiLimitMonth: number;
  highlighted?: boolean;
  features: string[];
}

export interface TenantQuota {
  tenantId: string;
  businessName: string;
  planId: SaaSPlanId;
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  ordersThisMonth: number;
  ordersLimit: number;
  cycleRenewalDate: string;
  estimatedCostBrl: number;
}
