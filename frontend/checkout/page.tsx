'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore'; // Import Zustand store hoặc context giỏ hàng của dự án

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore(); // Lấy dữ liệu giỏ hàng
  
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    orderId: string;
    status: string;
  } | null>(null);

  // Tính tổng tiền đơn hàng
  const totalAmount = totalPrice ? totalPrice() : 0;

  const handlePayment = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Lấy token xác thực từ localStorage hoặc cookies
      const token = localStorage.getItem('access_token');
      if (!token) {
        setErrorMessage('Vui lòng đăng nhập để thực hiện thanh toán.');
        setLoading(false);
        return;
      }

      // Giả sử đã có orderId từ bước tạo đơn trước đó hoặc truyền qua context/state
      const currentOrderId = localStorage.getItem('current_order_id') || 'ORDER-TEST-001';

      // 2. Gọi API Backend POST /payments
      // LƯU Ý: Đối chiếu file backend/src/payments/dto/create-payment.dto.ts trước khi chốt body
      const response = await fetch('http://localhost:3001/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: currentOrderId,
          method: paymentMethod,
          provider: paymentMethod, // Hoặc theo quy định trong DTO backend
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Thanh toán thất bại. Vui lòng thử lại.');
      }

      // 3. Xử lý khi thanh toán thành công
      if (data.status === 'PAID' || data.paymentStatus === 'PAID') {
        setPaymentSuccess({
          orderId: data.orderId || currentOrderId,
          status: 'PAID',
        });
        clearCart(); // Xóa giỏ hàng sau khi thanh toán thành công
      } else {
        setErrorMessage('Thanh toán không hoàn tất hoặc đang chờ xử lý.');
      }
    } catch (err: any) {
      // 4. Xử lý khi thất bại (Giữ nguyên giỏ hàng để khách thử lại)
      setErrorMessage(err.message || 'Có lỗi xảy ra trong quá trình thanh toán.');
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
            {items.map((item: any) => (
              <li key={item.id} className="py-2 flex justify-between">
                <span>{item.name} (x{item.quantity})</span>
                <span className="font-medium">{(item.price * item.quantity).toLocaleString('vi-VN')} đ</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Giỏ hàng trống.</p>
        )}
        <div className="flex justify-between font-bold text-lg mt-4 pt-2 border-t">
          <span>Tổng tiền:</span>
          <span className="text-blue-600">{totalAmount.toLocaleString('vi-VN')} đ</span>
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