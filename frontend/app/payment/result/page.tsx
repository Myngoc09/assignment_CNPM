'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getToken } from '@/lib/api';
import { formatVnd, getPayment, shortOrderCode, type PaymentResponse } from '@/lib/payments';

function ResultContent() {
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const paymentId = params.get('paymentId');
  const queryStatus = params.get('status');

  const [payment, setPayment] = useState<PaymentResponse | null>(null);

  // Dùng chung cho redirect từ checkout và từ VNPay Return URL (VNPAY_RESULT_REDIRECT_URL).
  // Xác nhận lại trạng thái từ server thay vì tin tham số trên URL.
  useEffect(() => {
    if (!paymentId || !getToken()) return;
    getPayment(paymentId)
      .then((p) => {
        setPayment(p);
        if (p.status === 'PAID') useCartStore.getState().clearCart();
      })
      .catch(() => {});
  }, [paymentId]);

  const status = payment?.status ?? queryStatus;
  const paid = status === 'PAID';
  const failed = status === 'PAYMENT_FAILED';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C2A24] flex justify-center">
      <div className="w-full max-w-md px-5 pt-16 text-center">
        <div
          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl text-white ${
            paid ? 'bg-green-600' : failed ? 'bg-red-500' : 'bg-gray-400'
          }`}
        >
          {paid ? '✓' : failed ? '✕' : '…'}
        </div>

        <h1 className="mt-6 text-2xl font-serif font-semibold">
          {paid ? 'Đặt hàng thành công' : failed ? 'Thanh toán thất bại' : 'Đang xử lý thanh toán'}
        </h1>

        {orderId && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm space-y-2">
            <Row label="Mã đơn" value={shortOrderCode(orderId)} />
            <Row label="Trạng thái" value={status ?? 'PENDING'} />
            {payment?.amount != null && <Row label="Số tiền" value={formatVnd(payment.amount)} />}
          </div>
        )}

        <p className="mt-5 text-gray-500 text-sm">
          {paid
            ? 'Mời bạn tới quầy lấy nước.'
            : failed
              ? 'Giỏ hàng của bạn vẫn được giữ. Bạn có thể thử thanh toán lại.'
              : 'Vui lòng đợi trong giây lát.'}
        </p>

        <div className="mt-8 space-y-3">
          {failed && (
            <Link
              href="/checkout"
              className="block w-full bg-[#1C2A24] text-white font-semibold py-3.5 rounded-xl"
            >
              Thử thanh toán lại
            </Link>
          )}
          <Link
            href="/"
            className={`block w-full font-semibold py-3.5 rounded-xl ${
              failed ? 'border border-gray-300' : 'bg-[#1C2A24] text-white'
            }`}
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">Đang tải...</div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
