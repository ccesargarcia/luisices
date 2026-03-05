/**
 * Validation Schemas
 * 
 * Schemas Zod para validação de formulários e dados
 */

import { z } from 'zod';

// ========== AUTHENTICATION ==========

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha muito longa'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .toLowerCase(),
});

// ========== CUSTOMERS ==========

export const customerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  phone: z
    .string()
    .min(10, 'Telefone inválido')
    .max(15, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Email inválido')
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'Endereço muito longo')
    .optional(),
  notes: z
    .string()
    .max(1000, 'Observações muito longas')
    .optional(),
});

// ========== ORDERS ==========

export const orderSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Nome do cliente é obrigatório')
    .max(100, 'Nome muito longo'),
  customerPhone: z
    .string()
    .min(10, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  productName: z
    .string()
    .min(1, 'Produto é obrigatório')
    .max(200, 'Nome do produto muito longo'),
  quantity: z
    .number()
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero')
    .max(10000, 'Quantidade máxima: 10.000'),
  price: z
    .number()
    .nonnegative('Preço não pode ser negativo')
    .max(1000000, 'Preço máximo: R$ 1.000.000'),
  deliveryDate: z
    .string()
    .min(1, 'Data de entrega é obrigatória')
    .refine((date) => {
      const deliveryDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deliveryDate >= today;
    }, 'Data de entrega não pode ser no passado'),
  notes: z
    .string()
    .max(1000, 'Observações muito longas')
    .optional(),
  paidAmount: z
    .number()
    .nonnegative('Valor pago não pode ser negativo')
    .optional(),
});

// ========== QUOTES ==========

export const quoteItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(200, 'Descrição muito longa'),
  quantity: z
    .number()
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero'),
  unitPrice: z
    .number()
    .nonnegative('Preço unitário não pode ser negativo')
    .max(100000, 'Preço unitário máximo: R$ 100.000'),
});

export const quoteSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Nome do cliente é obrigatório')
    .max(100, 'Nome muito longo'),
  customerPhone: z
    .string()
    .min(10, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  customerEmail: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  items: z
    .array(quoteItemSchema)
    .min(1, 'Adicione pelo menos um item'),
  deliveryDate: z
    .string()
    .optional(),
  validUntil: z
    .string()
    .optional(),
  notes: z
    .string()
    .max(1000, 'Observações muito longas')
    .optional(),
});

// ========== PRODUCTS ==========

export const productSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome do produto é obrigatório')
    .max(100, 'Nome muito longo'),
  category: z
    .string()
    .min(2, 'Categoria é obrigatória')
    .max(50, 'Categoria muito longa')
    .optional(),
  price: z
    .number()
    .nonnegative('Preço não pode ser negativo')
    .max(100000, 'Preço máximo: R$ 100.000')
    .optional(),
  description: z
    .string()
    .max(500, 'Descrição muito longa')
    .optional(),
});

// ========== TYPE INFERENCE ==========

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type ProductInput = z.infer<typeof productSchema>;
