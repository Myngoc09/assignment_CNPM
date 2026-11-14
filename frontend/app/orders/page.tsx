'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

  interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  toppings: string[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  promoCode: string | null;
  pointsRedeemed: number;
  pointsDiscountAmount: number;
  rewardPointsEarned: number;
  createdAt: string;
  items: OrderItem[];
}
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Lấy lịch sử đơn hàng của tài khoản đang đăng nhập
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const token = localStorage.getItem('access_token');

      if (!token) {
        setErrorMessage('Vui lòng đăng nhập để xem lịch sử đơn hàng.');
        setOrders([]);
        return;
      }

      const response = await fetch(`${API_URL}/orders/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.message === 'string'
            ? result.message
            : 'Không thể lấy lịch sử đơn hàng.'
        );
      }

      // Backend hiện tại trả về { message, data: [...] }
      setOrders(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error('Lỗi lấy lịch sử đơn hàng:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi tải lịch sử đơn hàng.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Chuyển trạng thái kỹ thuật thành nội dung dễ hiểu
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      PENDING: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      PREPARING: 'Đang chuẩn bị',
      READY: 'Đã sẵn sàng',
      COMPLETED: 'Hoàn thành',
      PAYMENT_FAILED: 'Thanh toán thất bại',
      CANCELLED: 'Đã hủy',
    };

    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';

      case 'PREPARING':
      case 'READY':
        return 'bg-blue-100 text-blue-700';

      case 'PAYMENT_FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';

      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('vi-VN') + '₫';
  };
const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getToppingLabel = (toppings: string[]) => {
    if (!toppings || toppings.length === 0) {
      return 'Không có topping';
    }

      return toppings.join(', ');
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] px-4 py-8">
      <div className="max-w-3xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1C2A24]">
              Lịch sử đơn hàng
            </h1>

            <p className="text-gray-500 mt-1">
              Theo dõi các đơn hàng bạn đã đặt tại BrewLite.
            </p>
          </div>

          <Link
            href="/"
            className="text-sm font-semibold text-[#1C2A24] hover:underline"
          >
            Về trang chủ
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-500">
              Đang tải lịch sử đơn hàng...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-red-600 mb-4">
              {errorMessage}
            </p>

            <button
              onClick={fetchOrders}
              className="bg-[#1C2A24] text-white px-5 py-2 rounded-lg hover:bg-[#2c3e36]"
            >
              Thử lại
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Bạn chưa có đơn hàng nào
            </h2>

            <p className="text-gray-500 mb-5">
              Hãy chọn món yêu thích và đặt đơn đầu tiên nhé!
            </p>

            <Link
              href="/"
              className="inline-block bg-[#1C2A24] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2c3e36]"
            >
              Xem thực đơn
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Bạn có {orders.length} đơn hàng.
            </p>

            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">

                  <div>
                    <p className="text-sm text-gray-500">
                      Mã đơn hàng
                    </p>

                    <p className="font-semibold text-gray-800 break-all">
{order.id}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                
                
          {/* Chi tiết các sản phẩm trong đơn hàng */}
              <div className="border-t border-gray-100 mt-4 pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Chi tiết đơn hàng
                </h3>

                <div className="space-y-3">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start gap-3 bg-[#FDFBF7] rounded-lg p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800">
                             {item.productName}
                          </p>

                          <p className="text-sm text-gray-500 mt-1">
                             Size {item.size} · {getToppingLabel(item.toppings)}
                          </p>

                          <p className="text-sm text-gray-500 mt-1">
                             {formatCurrency(item.unitPrice)} × {item.qty}
                          </p>
                        </div>

                        <p className="font-semibold text-gray-800 whitespace-nowrap">
                          {formatCurrency(item.lineTotal)}
                        </p>
                    </div>
                 ))}
              </div>
          </div>

                <div className="border-t border-gray-100 mt-4 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Tạm tính</span><span>{formatCurrency(order.subtotal ?? order.total)}</span></div>
                  {order.promoCode && <div className="flex justify-between gap-3 text-green-700"><span>Mã khuyến mãi: {order.promoCode}</span><span>-{formatCurrency(order.discountAmount || 0)}</span></div>}
                  {(order.pointsRedeemed || 0) > 0 && <div className="flex justify-between gap-3 text-green-700"><span>Điểm đã sử dụng: {order.pointsRedeemed.toLocaleString('vi-VN')} điểm</span><span>-{formatCurrency(order.pointsDiscountAmount || 0)}</span></div>}
                  {order.status === 'PAID' || order.status === 'PREPARING' || order.status === 'READY' || order.status === 'COMPLETED' ? <div className="flex justify-between gap-3 text-amber-700"><span>Điểm nhận được sau thanh toán</span><span>+{(order.rewardPointsEarned || 0).toLocaleString('vi-VN')} điểm</span></div> : null}
                </div>

                <div className="border-t border-gray-100 mt-4 pt-4 flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">
                      Ngày đặt
                    </p>

                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Tổng tiền
                    </p>

                    <p className="text-lg font-bold text-amber-600 mt-1">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}