import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface SuperfretePackage {
  weight: number; // kg
  height: number; // cm
  width: number;  // cm
  length: number; // cm
}

export interface SuperfreteShippingService {
  id: number;
  name: string;
  company: string;
  price: number;
  originalPrice: number;
  discount: number;
  deliveryTime: number;
  error?: string | null;
}

export interface CalculateShippingPayload {
  fromPostalCode?: string;
  toPostalCode: string;
  packageDimensions?: SuperfretePackage;
  products?: Array<{
    name?: string;
    quantity: number;
    weight?: number;
    height?: number;
    width?: number;
    length?: number;
  }>;
  services?: string;
  options?: {
    own_hand?: boolean;
    receipt?: boolean;
    insurance_value?: number;
  };
}

export interface CalculateShippingResponse {
  success: boolean;
  services: SuperfreteShippingService[];
  idealPackage?: SuperfretePackage;
}

export interface CreateLabelPayload {
  orderId: string;
  from: {
    name: string;
    address: string;
    number?: string;
    complement?: string;
    district?: string;
    city: string;
    state_abbr: string;
    postal_code: string;
    document?: string;
  };
  to: {
    name: string;
    address: string;
    number?: string;
    complement?: string;
    district?: string;
    city: string;
    state_abbr: string;
    postal_code: string;
    document: string; // Obrigatório CPF ou CNPJ
    email?: string | null;
    phone?: string | null;
  };
  service: number; // 1 = PAC, 2 = SEDEX, 17 = Mini Envios, 3 = Jadlog, etc.
  volume?: SuperfretePackage;
  products?: Array<{
    name: string;
    quantity: number;
    unitary_value: number;
  }>;
  nonCommercial?: boolean;
}

export interface CreateLabelResponse {
  success: boolean;
  tagId: string;
  status: string;
  trackingCode?: string | null;
  labelPdfUrl?: string | null;
  price?: number;
}

export class SuperfreteService {
  /**
   * Calcula cotação de frete diretamente na SuperFrete
   */
  async calculateShipping(payload: CalculateShippingPayload): Promise<CalculateShippingResponse> {
    const callable = httpsCallable<CalculateShippingPayload, CalculateShippingResponse>(
      functions,
      'calculateSuperfreteShipping'
    );
    const result = await callable(payload);
    return result.data;
  }

  /**
   * Cria e emite a etiqueta no carrinho, paga com saldo e retorna o PDF
   */
  async createLabel(payload: CreateLabelPayload): Promise<CreateLabelResponse> {
    const callable = httpsCallable<CreateLabelPayload, CreateLabelResponse>(
      functions,
      'createSuperfreteLabel'
    );
    const result = await callable(payload);
    return result.data;
  }
}

export const superfreteService = new SuperfreteService();
