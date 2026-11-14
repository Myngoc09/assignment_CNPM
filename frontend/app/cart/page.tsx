
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';

export default function CartPage() {
  const router = useRouter();

  const {
    items,
    updateQty,
    removeFromCart,
    getTotalPrice,
    clearCart,
    setUserId: setCartUserId,
  } = useCartStore();

  const [loading, setLoading] = useState(false);
  const [checkingCart, setCheckingCart] = useState(true);

  // Khuyến mãi
  const [promoCode, setPromoCode] = useState('');

  // Điểm thưởng
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Khôi phục giỏ hàng theo tài khoản đăng nhập
  useEffect(() => {
    const restoreCart = async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setCartUserId(null);
        setCheckingCart(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('access_token');
            setCartUserId(null);
          }

          return;
        }

        const profile = await response.json();

        if (profile.id) {
          setCartUserId(profile.id);
        }
      } catch (error) {
        console.error('Lỗi khôi phục giỏ hàng:', error);
      } finally {
        setCheckingCart(false);
      }
    };

    restoreCart();
  }, [setCartUserId]);

  // Tải số dư điểm thưởng
  useEffect(() => {
    const loadPoints = async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setPointsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/loyalty/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Không tải được điểm thưởng');
        }

        const data = await response.json();

        setPointsBalance(
          Number(data.availablePoints ?? data.points ?? 0),
        );
      } catch (error) {
        console.error('Lỗi tải điểm thưởng:', error);
        setPointsBalance(0);
      } finally {
        setPointsLoading(false);
      }
    };

    loadPoints();
  }, []);

  // Tính số tiền giảm dự kiến từ điểm thưởng
  const pointsDiscountPreview = Math.min(
    pointsToRedeem,
    Math.max(0, getTotalPrice() - 1),
  );

  const estimatedTotal = Math.max(
    1,
    getTotalPrice() - pointsDiscountPreview,
  );

  // Tạo đơn hàng trước khi chuyển sang trang thanh toán
  const handleProceedToCheckout = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('access_token');

      if (!token) {
        alert('Vui lòng đăng nhập trước khi thanh toán!');
        router.push('/login');
        return;
      }

      if (!items || items.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
        return;
      }

      const orderPayload = {
        promoCode: promoCode.trim() || undefined,
        pointsToRedeem: Number(pointsToRedeem) || 0,
        items: items.map((item: any) => ({
          productId: String(item.productId || item.id),
          size: item.size || 'M',
          toppings: item.topping
            ? item.topping
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean)
            : [],
          qty: Number(item.qty || 1),
        })),
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      console.log('Phản hồi từ API POST /orders:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tạo đơn hàng.');
      }

      const newOrderId =
        data.id ||
        data.orderId ||
        data._id ||
        (data.data && data.data.id);

      if (!newOrderId) {
        throw new Error(
          'Server không trả về mã định danh đơn hàng (orderId).',
        );
      }

      localStorage.setItem('current_order_id', newOrderId);

      localStorage.setItem(
        'current_order_summary',
        JSON.stringify({
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          total: data.total,
          promoCode: data.promoCode,
          pointsRedeemed: data.pointsRedeemed,
          pointsDiscountAmount: data.pointsDiscountAmount,
          availablePoints: data.availablePoints,
        }),
      );

      router.push('/checkout');
    } catch (error: any) {
      console.error('Lỗi tạo đơn hàng:', error);
      alert(error.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Chờ khôi phục giỏ hàng trước khi hiển thị
  if (checkingCart) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <p className="text-[#1C2A24]">Đang khôi phục giỏ hàng...</p>
      </div>
    );
  }

  // Giỏ hàng trống
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFBF7] text-[#1C2A24]">
        <h2 className="text-2xl font-bold mb-4">
          Giỏ hàng của bạn đang trống
        </h2>

        <p className="text-gray-500 mb-6">
          Hãy quay lại thực đơn để chọn những ly đồ uống yêu thích nhé!
        </p>

        <Link
          href="/"
          className="bg-[#1C2A24] hover:bg-[#2c3e36] text-white font-semibold px-6 py-3 rounded-lg shadow transition"
        >
          Xem Thực đơn
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl mt-8 mb-20">
      {/* Tiêu đề */}
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Giỏ hàng của bạn
        </h1>

        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Xóa tất cả
        </button>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <div
            key={item.id}
            className="py-4 flex justify-between items-center"
          >
            <div className="flex items-center gap-4">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-md border"
                />
              )}

              <div>
                <h3 className="font-semibold text-lg text-gray-800">
                  {item.name}
                </h3>

                <p className="text-sm text-gray-500">
                  Size:{' '}
                  <span className="font-medium text-gray-700">
                    {item.size === 'ONE_SIZE' ? '1 size' : item.size}
                  </span>
                </p>

                {item.topping && (
                  <p className="text-sm text-gray-500">
                    Topping: {item.topping}
                  </p>
                )}

                <p className="text-amber-600 font-semibold mt-1">
                  {item.price.toLocaleString('vi-VN')}₫
                </p>
              </div>
            </div>

            {/* Điều chỉnh số lượng */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                <button
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition"
                >
                  -
                </button>

                <span className="px-4 font-semibold text-gray-800">
                  {item.qty}
                </span>

                <button
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => removeFromCart(item.id)}
                className="text-red-500 hover:text-red-700 font-medium text-sm ml-2"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mã khuyến mãi */}
      <div className="mt-6 border-t pt-4">
        <label
          htmlFor="promoCode"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Mã khuyến mãi (không bắt buộc)
        </label>

        <input
          id="promoCode"
          value={promoCode}
          onChange={(event) =>
            setPromoCode(event.target.value.toUpperCase())
          }
          placeholder="Ví dụ: BREWLITE10"
          maxLength={40}
          className="w-full border rounded-lg px-3 py-2 text-gray-800"
        />

        <p className="text-xs text-gray-500 mt-1">
          Mã demo BREWLITE10 giảm 10% cho đơn từ 30.000đ
          (tối đa 20.000đ).
        </p>
      </div>

      {/* Điểm thưởng */}
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex justify-between gap-3">
          <label
            htmlFor="pointsToRedeem"
            className="font-semibold text-gray-800"
          >
            Dùng điểm thưởng
          </label>

          <span className="text-sm font-semibold text-amber-800">
            {pointsLoading
              ? 'Đang tải...'
              : `${pointsBalance.toLocaleString('vi-VN')} điểm`}
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-600">
          1 điểm = 1₫ giảm giá. Điểm chỉ bị trừ sau khi thanh toán thành công.
        </p>

        <input
          id="pointsToRedeem"
          type="number"
          min="0"
          max={pointsBalance}
          step="1"
          value={pointsToRedeem}
          onChange={(event) =>
            setPointsToRedeem(
              Math.max(
                0,
                Math.min(
                  pointsBalance,
                  Math.floor(Number(event.target.value) || 0),
                ),
              ),
            )
          }
          disabled={pointsLoading || pointsBalance === 0}
          className="mt-3 w-full rounded-lg border bg-white px-3 py-2 text-gray-800"
          placeholder="Nhập số điểm muốn sử dụng"
        />

        <p className="mt-2 text-sm text-green-700">
          Giảm dự kiến:{' '}
          {pointsDiscountPreview.toLocaleString('vi-VN')}₫
        </p>
      </div>

      {/* Tổng tiền */}
      <div className="mt-6 border-t pt-4 space-y-2">
        <div className="flex justify-between items-center text-gray-600">
          <span>Tạm tính:</span>
          <span>{getTotalPrice().toLocaleString('vi-VN')}₫</span>
        </div>

        {pointsDiscountPreview > 0 && (
          <div className="flex justify-between items-center text-green-700">
            <span>Giảm từ điểm thưởng:</span>
            <span>
              -{pointsDiscountPreview.toLocaleString('vi-VN')}₫
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-700">
            Tổng tạm tính:
          </span>

          <span className="text-2xl font-bold text-amber-600">
            {estimatedTotal.toLocaleString('vi-VN')}₫
          </span>
        </div>

        <p className="text-xs text-gray-500">
          Mã khuyến mãi (nếu có) sẽ được máy chủ tính chính xác khi tạo đơn.
        </p>
      </div>

      {/* Nút điều hướng */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="flex-1 text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
        >
          Chọn thêm món
        </Link>

        <button
          onClick={handleProceedToCheckout}
          disabled={loading}
          className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg shadow transition disabled:bg-gray-400"
        >
          {loading
            ? 'Đang khởi tạo đơn hàng...'
            : 'Tiến hành thanh toán'}
        </button>
      </div>
    </div>
  );
}
