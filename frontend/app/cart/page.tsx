'use client';
import { useCartStore } from '@/store/useCartStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const { items, updateQty, removeFromCart, getTotalPrice, clearCart } = useCartStore();
  const router = useRouter();

  // Hàm xử lý điều hướng sang trang checkout an toàn
  const handleProceedToCheckout = () => {
    if (items.length > 0) {
      router.push('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFBF7] text-[#1C2A24]">
        <h2 className="text-2xl font-bold mb-4">Giỏ hàng của bạn đang trống</h2>
        <p className="text-gray-500 mb-6">Hãy quay lại thực đơn để chọn những ly đồ uống yêu thích nhé!</p>
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
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Giỏ hàng của bạn</h1>
        <button 
          onClick={clearCart} 
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <div key={item.id} className="py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {item.imageUrl && (
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-16 h-16 object-cover rounded-md border" 
                />
              )}
              <div>
                <h3 className="font-semibold text-lg text-gray-800">{item.name}</h3>
                <p className="text-sm text-gray-500">Size: <span className="font-medium text-gray-700">{item.size}</span></p>
                {item.topping && <p className="text-sm text-gray-500">Topping: {item.topping}</p>}
                <p className="text-amber-600 font-semibold mt-1">
                  {item.price.toLocaleString('vi-VN')}₫
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                <button 
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition"
                >
                  -
                </button>
                <span className="px-4 font-semibold text-gray-800">{item.qty}</span>
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

      <div className="mt-6 border-t pt-4 flex justify-between items-center">
        <span className="text-lg font-semibold text-gray-700">Tổng cộng:</span>
        <span className="text-2xl font-bold text-amber-600">
          {getTotalPrice().toLocaleString('vi-VN')}₫
        </span>
      </div>

      <div className="mt-8 flex gap-4">
        <Link 
          href="/" 
          className="flex-1 text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
        >
          Chọn thêm món
        </Link>
        <button 
          onClick={handleProceedToCheckout}
          className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg shadow transition"
        >
          Tiến hành thanh toán
        </button>
      </div>
    </div>
  );
}