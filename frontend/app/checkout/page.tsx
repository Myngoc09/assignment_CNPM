'use client';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [orderSummary, setOrderSummary] = useState<{ subtotal?: number; discountAmount?: number; total?: number; promoCode?: string | null; pointsRedeemed?: number; pointsDiscountAmount?: number } | null>(null);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    orderId: string;
    status: string;
  } | null>(null);

  // [Chức năng] Đọc orderId an toàn sau khi component mount (tránh lỗi SSR Hydration)
  useEffect(() => {
    const orderId = localStorage.getItem('current_order_id') || '';
    setCurrentOrderId(orderId);
    try { setOrderSummary(JSON.parse(localStorage.getItem('current_order_summary') || 'null')); } catch { setOrderSummary(null); }
  }, []);

  // Tính tổng tiền đơn hàng
  const totalAmount = getTotalPrice ? getTotalPrice() : 0;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handlePayment = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = localStorage.getItem('access_token');
      const orderId = currentOrderId || localStorage.getItem('current_order_id');

      if (!orderId) {
        throw new Error('Không tìm thấy đơn hàng. Vui lòng quay lại giỏ hàng.');
      }

      let idempotencyKey = localStorage.getItem(`payment_idempotency_${orderId}`);
      if (!idempotencyKey) {
        idempotencyKey = `checkout-${crypto.randomUUID()}`;
        localStorage.setItem(`payment_idempotency_${orderId}`, idempotencyKey);
      }

      const paymentRes = await axios.post(
        `${API_URL}/payments`,
        {
          orderId,
          method: paymentMethod,
          provider: 'MOCK',
        },
        { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': idempotencyKey } }
      );

      const { data } = paymentRes;

      if (data.status === 'PAID') {
        setPaymentSuccess({ orderId: data.orderId, status: data.status });
        setRewardPoints(Number(data.rewardPointsEarned || 0));
        localStorage.removeItem('current_order_id');
        localStorage.removeItem('current_order_summary');
        localStorage.removeItem(`payment_idempotency_${orderId}`);
        clearCart();
      } else {
        if (data.status === 'PAYMENT_FAILED') {
          // Mỗi lần thử thanh toán thất bại là một giao dịch mới, dùng key mới.
          localStorage.removeItem(`payment_idempotency_${orderId}`);
        }
        setErrorMessage(data.message || 'Thanh toán thất bại, vui lòng thử lại.');
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || error.message || 'Thanh toán thất bại, vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Màn hình hiển thị kết quả thành công
  if (paymentSuccess) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-green-700 mb-2">Thanh toán thành công!</h2>
        <p className="text-gray-700 mb-1">Mã đơn hàng: <strong>{paymentSuccess.orderId}</strong></p>
        <p className="text-gray-700 mb-2">Điểm thưởng nhận được: <strong>{rewardPoints} điểm</strong></p>
        <p className="text-gray-700 mb-4">Trạng thái: <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">{paymentSuccess.status}</span></p>
        <button
          onClick={() => router.push('/')}
          className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded-lg mt-6">
      <h1 className="text-2xl font-bold mb-6">Xác nhận & Thanh toán</h1>

      {/* Hiển thị sản phẩm trong giỏ hàng */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Đơn hàng của bạn</h2>
        {items && items.length > 0 ? (
          <ul className="divide-y">
            {items.map((item: any, index: number) => {
              // Sửa lại cách lấy số lượng và giá an toàn tránh lỗi NaN
              const quantity = Number(item.qty || item.quantity || 1);
              const price = Number(item.price || 0);
              const uniqueKey = `${item.id}-${item.size || 'M'}-${index}`;

              return (
                <li key={uniqueKey} className="py-2 flex justify-between">
                  <span>
                    {item.name} (x{quantity}) {item.size ? `- Size: ${item.size}` : ''}
                  </span>
                  <span className="font-medium">
                    {(price * quantity).toLocaleString('vi-VN')} đ
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">Giỏ hàng trống.</p>
        )}
        {orderSummary?.subtotal !== undefined && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Tạm tính:</span><span>{Number(orderSummary.subtotal).toLocaleString('vi-VN')} đ</span></div>
            {Number(orderSummary.discountAmount || 0) > 0 && <div className="flex justify-between text-green-700"><span>Khuyến mãi ({orderSummary.promoCode}):</span><span>-{Number(orderSummary.discountAmount).toLocaleString('vi-VN')} đ</span></div>}
            {Number(orderSummary.pointsDiscountAmount || 0) > 0 && <div className="flex justify-between text-green-700"><span>Điểm đã sử dụng ({Number(orderSummary.pointsRedeemed || 0).toLocaleString('vi-VN')} điểm):</span><span>-{Number(orderSummary.pointsDiscountAmount).toLocaleString('vi-VN')} đ</span></div>}
          </div>
        )}
        <div className="flex justify-between font-bold text-lg mt-4 pt-2 border-t">
          <span>Tổng tiền:</span>
          <span className="text-blue-600">{Number(orderSummary?.total ?? totalAmount).toLocaleString('vi-VN')} đ</span>
        </div>
      
        </div>
      

      {/* Chọn phương thức thanh toán */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Phương thức thanh toán</h2>
        <div className="space-y-3">
          <label className={`flex items-center p-3 border rounded cursor-pointer ${paymentMethod === 'WALLET' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="WALLET"
              checked={paymentMethod === 'WALLET'}
              onChange={() => setPaymentMethod('WALLET')}
              className="mr-3"
            />
            <div>
              <p className="font-semibold">Thanh toán qua Ví (WALLET)</p>
              <p className="text-sm text-gray-500">Sử dụng ví điện tử liên kết</p>
            </div>
          </label>

          <label className={`flex items-center p-3 border rounded cursor-pointer ${paymentMethod === 'CARD' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="CARD"
              checked={paymentMethod === 'CARD'}
              onChange={() => setPaymentMethod('CARD')}
              className="mr-3"
            />
            <div>
              <p className="font-semibold">Thanh toán qua Thẻ (CARD)</p>
              <p className="text-sm text-gray-500">Thẻ ATM / Thẻ quốc tế</p>
            </div>
          </label>
        </div>
      </div>

      {/* Thông báo lỗi nếu thất bại */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {/* Nút thanh toán */}
      <button
        onClick={handlePayment}
        disabled={loading || !items || items.length === 0}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
      >
        {loading ? 'Đang xử lý thanh toán...' : 'Thanh toán ngay'}
      </button>
    </div>
  );
}  