export type OrderStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface Tag {
  name: string;
  color: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  deliveryDate: string;
  notes?: string;
  createdAt: string;
  tags?: Tag[];
}