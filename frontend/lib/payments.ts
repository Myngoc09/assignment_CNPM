import { apiFetch } from './api';

export type PaymentMethod = 'WALLET' | 'CARD';
export type PaymentProvider = 'MOCK' | 'VNPAY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'PAYMENT_FAILED';

export interface OrderResponse {
  orderId: string;
  status: string;
  total: number;
}

export interface PaymentResponse {
  message?: string;
  paymentId: string;
  orderId: string;
  amount?: number;
  provider?: PaymentProvider;
  method?: PaymentMethod;
  status: PaymentStatus;
  expiresAt?: string;
  paymentUrl?: string;
  qrCode?: string;
}

export function formatVnd(n: number) {
  return `${n.toLocaleString('vi-VN')}₫`;
}

export function shortOrderCode(orderId: string) {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

export function newIdempotencyKey() {
  return `brewlite-${crypto.randomUUID()}`; // 8–100 ký tự, hợp lệ với backend
}

export function createOrder(
  items: { productId: string; size: string; toppings: string[]; qty: number }[],
) {
  return apiFetch<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function createPayment(
  body: { orderId: string; method: PaymentMethod; provider: PaymentProvider },
  idempotencyKey: string,
) {
  return apiFetch<PaymentResponse>('/payments', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  });
}

export function getPayment(paymentId: string) {
  return apiFetch<PaymentResponse>(`/payments/${paymentId}`);
}
