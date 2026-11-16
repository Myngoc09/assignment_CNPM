'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useAuthSession } from '@/lib/useAuthSession';
import {
  createOrder,
  createPayment,
  formatVnd,
  getPayment,
  newIdempotencyKey,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentResponse,
} from '@/lib/payments';

type Step = 'review' | 'processing' | 'qr';

const METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'WALLET', label: 'Ví điện tử', hint: 'Momo, VNPay, ZaloPay...' },
  { value: 'CARD', label: 'Thẻ ngân hàng', hint: 'ATM nội địa / Visa / Master' },
];

const PROVIDERS: { value: PaymentProvider; label: string; hint: string }[] = [
  { value: 'VNPAY', label: 'VNPay (mã QR)', hint: 'Quét QR bằng điện thoại' },
  { value: 'MOCK', label: 'Ngân hàng giả lập', hint: 'Trang xác nhận giả lập, dùng để demo' },
];

const POLL_MS = 3000;

export default function CheckoutPage() {
  const router = useRouter();
  const ready = useAuthSession();

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = items.reduce((t, i) => t + i.price * i.qty, 0);

  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [provider, setProvider] = useState<PaymentProvider>('VNPAY');
  const [step, setStep] = useState<Step>('review');
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Giữ đơn + Idempotency-Key giữa các lần bấm để thử lại không tạo đơn/giao dịch mới.
  const orderRef = useRef<{ id: string; signature: string } | null>(null);
  const keyRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const goToResult = useCallback(
    (status: string, orderId: string, paymentId: string) => {
      setFinished(true);
      if (status === 'PAID') clearCart();
      router.replace(
        `/payment/result?status=${status}&orderId=${orderId}&paymentId=${paymentId}`,
      );
    },
    [clearCart, router],
  );

  const handlePay = async () => {
    if (submittingRef.current || items.length === 0) return;
    submittingRef.current = true;
    setError('');
    setStep('processing');

    try {
      // Giá do backend tính lại từ DB; client chỉ gửi productId/size/topping/qty.
      const payloadItems = items.map((i) => ({
        productId: i.productId,
        size: i.size,
        toppings: i.topping ? i.topping.split(', ') : [],
        qty: i.qty,
      }));
      const signature = JSON.stringify(payloadItems);

      if (!orderRef.current || orderRef.current.signature !== signature) {
        const order = await createOrder(payloadItems);
        orderRef.current = { id: order.orderId, signature };
        keyRef.current = null;
      }
      if (!keyRef.current) keyRef.current = newIdempotencyKey();

      const res = await createPayment(
        { orderId: orderRef.current.id, method, provider },
        keyRef.current,
      );

      if (res.status === 'PAID') {
        goToResult('PAID', res.orderId, res.paymentId);
      } else if (res.status === 'PAYMENT_FAILED') {
        keyRef.current = null; // lần thử lại là giao dịch mới
        setError('Thanh toán không thành công. Giỏ hàng vẫn được giữ, bạn có thể thử lại.');
        setStep('review');
      } else if (res.provider === 'MOCK' && res.paymentUrl) {
        // Mock Bank: chuyển sang trang xác nhận của ngân hàng giả lập.
        // Sau khi bấm nút, Mock Bank chuyển trình duyệt về /payment/result.
        setFinished(true);
        window.location.href = res.paymentUrl;
      } else {
        setPayment(res); // VNPay: PENDING, hiển thị QR
        setStep('qr');
      }
    } catch (e) {
      // Lỗi mạng/server: giữ nguyên key để bấm lại vẫn là cùng một giao dịch.
      setError(e instanceof Error ? e.message : 'Không thể thanh toán. Vui lòng thử lại.');
      setStep('review');
    } finally {
      submittingRef.current = false;
    }
  };

  // Polling kết quả VNPay mỗi 3 giây.
  useEffect(() => {
    if (step !== 'qr' || !payment) return;
    const id = payment.paymentId;
    const timer = setInterval(async () => {
      try {
        const p = await getPayment(id);
        if (p.status === 'PAID') {
          clearInterval(timer);
          goToResult('PAID', p.orderId, p.paymentId);
        } else if (p.status === 'PAYMENT_FAILED') {
          clearInterval(timer);
          keyRef.current = null;
          setPayment(null);
          setError('Thanh toán VNPay thất bại hoặc đã bị hủy. Bạn có thể thử lại.');
          setStep('review');
        }
      } catch {
        /* lỗi tạm thời: thử lại ở lần polling sau */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [step, payment, goToResult]);

  // Đếm ngược hạn của mã QR.
  useEffect(() => {
    if (step !== 'qr' || !payment?.expiresAt) return;
    const expires = new Date(payment.expiresAt).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.round((expires - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step, payment]);

  const cancelQr = () => {
    setPayment(null);
    setStep('review');
  };

  const expired = secondsLeft === 0;

  if (!ready || finished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-gray-400 animate-pulse">
        Đang tải...
      </div>
    );
  }

  if (items.length === 0 && step === 'review') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFBF7] text-[#1C2A24]">
        <h2 className="text-2xl font-bold mb-4">Giỏ hàng đang trống</h2>
        <Link href="/" className="bg-[#1C2A24] text-white font-semibold px-6 py-3 rounded-lg">
          Xem thực đơn
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C2A24] flex justify-center">
      <div className="w-full max-w-md px-5 pt-8 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/cart"
            aria-label="Quay lại giỏ hàng"
            className={`w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center ${
              step !== 'review' ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            ←
          </Link>
          <h1 className="text-2xl font-serif font-semibold">Thanh toán</h1>
        </div>

        {step === 'qr' && payment ? (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500 mb-1">Tổng thanh toán</p>
            <p className="text-3xl font-bold mb-4">{formatVnd(payment.amount ?? total)}</p>

            {payment.qrCode && !expired ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={payment.qrCode}
                alt="Mã QR thanh toán VNPay"
                className="w-60 h-60 mx-auto rounded-xl border"
              />
            ) : (
              <div className="w-60 h-60 mx-auto rounded-xl border bg-gray-50 flex items-center justify-center text-gray-500 px-4">
                Mã QR đã hết hạn. Vui lòng quay lại và tạo giao dịch mới.
              </div>
            )}

            <p className="mt-4 text-sm text-gray-600">
              Quét mã bằng ứng dụng ngân hàng / ví điện tử để thanh toán
            </p>
            {secondsLeft !== null && !expired && (
              <p className="mt-1 text-sm text-[#B58A59] font-medium">
                Mã hết hạn sau {Math.floor(secondsLeft / 60)}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </p>
            )}
            <p className="mt-3 text-xs text-gray-400 animate-pulse">
              Đang chờ xác nhận thanh toán...
            </p>

            {payment.paymentUrl && !expired && (
              <a
                href={payment.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block w-full border border-[#1C2A24] text-[#1C2A24] font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
              >
                Hoặc mở trang thanh toán VNPay
              </a>
            )}
            <button
              onClick={cancelQr}
              className="mt-3 w-full text-gray-500 py-2 text-sm hover:text-gray-700"
            >
              Quay lại chọn phương thức
            </button>
          </section>
        ) : (
          <>
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-5">
              <h2 className="font-semibold mb-3">Đơn hàng</h2>
              <ul className="divide-y divide-gray-100 text-sm">
                {items.map((i) => (
                  <li key={i.id} className="py-2 flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium">
                        {i.name} ({i.size}) x{i.qty}
                      </span>
                      {i.topping && (
                        <span className="block text-xs text-gray-400 truncate">{i.topping}</span>
                      )}
                    </span>
                    <span className="whitespace-nowrap">{formatVnd(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-xl font-bold text-[#B58A59]">{formatVnd(total)}</span>
              </div>
            </section>

            <OptionGroup
              title="Phương thức"
              options={METHODS}
              value={method}
              onChange={setMethod}
              disabled={step === 'processing'}
            />
            <OptionGroup
              title="Cổng thanh toán"
              options={PROVIDERS}
              value={provider}
              onChange={setProvider}
              disabled={step === 'processing'}
            />

            <p className="text-xs text-gray-400 mb-4">Không dùng tiền mặt</p>

            {error && (
              <div role="alert" className="mb-4 rounded-xl bg-red-50 text-red-600 text-sm p-3">
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={step === 'processing'}
              className="w-full bg-[#1C2A24] hover:bg-[#2c3e36] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl shadow transition"
            >
              {step === 'processing' ? 'Đang xử lý...' : `Xác nhận trả ${formatVnd(total)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
  disabled,
}: {
  title: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="mb-5" disabled={disabled}>
      <legend className="font-semibold mb-2">{title}</legend>
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
              value === o.value ? 'border-[#1C2A24] bg-white shadow-sm' : 'border-gray-200 bg-white/60'
            }`}
          >
            <input
              type="radio"
              name={title}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="accent-[#1C2A24]"
            />
            <span>
              <span className="block font-medium text-sm">{o.label}</span>
              <span className="block text-xs text-gray-400">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
