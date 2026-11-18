import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';

async function callBetaSuperfreteApi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para utilizar a SuperFrete.');
  const idToken = await user.getIdToken();
  const response = await fetch(getVercelBetaApiUrl('/api/order-tracking'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    cache: 'no-store',
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status >= 500) {
      throw new VercelInfraError(`Erro na SuperFrete (${response.status}).`, response.status);
    }
    const err = new Error(data?.error?.message || `Erro na SuperFrete (${response.status}).`);
    if (data?.error?.code) Object.assign(err, { code: data.error.code });
    if (data?.error?.details !== undefined) Object.assign(err, { details: data.error.details });
    Object.assign(err, { status: response.status });
    throw err;
  }
  return data as T;
}

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
  status: 'pending_payment' | 'payment_unconfirmed' | 'released' | 'posted' | 'delivered' | string;
  trackingCode?: string | null;
  labelPdfUrl?: string | null;
  price?: number;
  message?: string | null;
}

export class SuperfreteService {
  /**
   * Calcula cotação de frete diretamente na SuperFrete
   */
  async calculateShipping(payload: CalculateShippingPayload): Promise<CalculateShippingResponse> {
    return executeWithGcpFallback(
      'orderTrackingAdmin',
      () => callBetaSuperfreteApi<CalculateShippingResponse>('calculateSuperfreteShipping', payload as unknown as Record<string, unknown>),
      async () => {
        const callable = httpsCallable<CalculateShippingPayload, CalculateShippingResponse>(
          functions,
          'calculateSuperfreteShipping'
        );
        const result = await callable(payload);
        return result.data;
      },
      'calculateSuperfreteShipping',
    );
  }

  /**
   * Cria e emite a etiqueta no carrinho, paga com saldo e retorna o PDF
   */
  async createLabel(payload: CreateLabelPayload): Promise<CreateLabelResponse> {
    return executeWithGcpFallback(
      'orderTrackingAdmin',
      () => callBetaSuperfreteApi<CreateLabelResponse>('createSuperfreteLabel', payload as unknown as Record<string, unknown>),
      async () => {
        const callable = httpsCallable<CreateLabelPayload, CreateLabelResponse>(
          functions,
          'createSuperfreteLabel'
        );
        const result = await callable(payload);
        return result.data;
      },
      'createSuperfreteLabel',
    );
  }
}

export const superfreteService = new SuperfreteService();
