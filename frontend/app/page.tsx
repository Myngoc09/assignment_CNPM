'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import ProductModal, {
  type Product,
} from './components/ProductModal';

const CATEGORIES = ['Tất cả', 'Cà Phê', 'Trà', 'Bánh Ngọt'];

export default function HomePage() {
  const router = useRouter();

  const setCartUserId = useCartStore((state) => state.setUserId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState('');

  // Lấy các hàm từ Zustand store
  const addToCart = useCartStore((state) => state.addToCart);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:3001/products');
        if (!res.ok) throw new Error('Không thể tải dữ liệu thực đơn từ server');
        const data: Product[] = await res.json();
        setProducts(data);
      } catch (err: any) {
        setError(err.message || 'Lỗi kết nối đến Backend');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Lọc danh sách món ăn theo Filter Danh mục
  const filteredProducts = products.filter((product) => {
    if (selectedCategory === 'Tất cả') return true;
    return product.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Xử lý thêm vào giỏ hàng thông qua Zustand
  const handleAddToCart = async (
    product: Product,
    size: string,
    toppings: string[],
    totalPrice: number,
  ) => {
    const cartItem = {
      id: `${product.id}-${size}-${[...toppings].sort().join('-')}`,
      productId: product.id,
      name: product.name,
      price: totalPrice,
      size: size as 'S' | 'M' | 'L',
      topping: toppings.length > 0 ? toppings.join(', ') : undefined,
      qty: 1,
      imageUrl: product.imageUrl,
    };

    const token = localStorage.getItem('access_token');

    // Chua dang nhap: luu san pham tam thoi va chuyen den trang dang nhap
    if (!token) {
      sessionStorage.setItem('pending_cart_item', JSON.stringify(cartItem));
      setSelectedProduct(null);
      router.push('/profile');
      return;
    }

    try {
      // Lay thong tin tai khoan hien tai
      const response = await fetch('http://localhost:3001/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Phien dang nhap het han. Vui long dang nhap lai.');
      }

      const profile = await response.json();

      // Nap gio hang cua dung tai khoan
      setCartUserId(profile.id);

      // Them san pham vao gio hang
      addToCart(cartItem);

      setNotice(
        `Đã thêm ${product.name} size ${size} vào giỏ hàng. Giá: ${totalPrice.toLocaleString('vi-VN')}₫`,
      );
    } catch (error) {
      localStorage.removeItem('access_token');
      setCartUserId(null);

      // Giu lai san pham de them sau khi dang nhap lai
      sessionStorage.setItem('pending_cart_item', JSON.stringify(cartItem));

      setSelectedProduct(null);
      router.push('/profile');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C2A24] flex flex-col items-center pb-24 font-sans">
      <div className="w-full max-w-md min-h-screen flex flex-col relative px-5 pt-10">
        
        {/* Header / Lời chào */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B58A59] uppercase mb-1">
              CHÀO BUỔI SÁNG
            </p>
            <h1 className="text-2xl font-serif font-semibold text-[#1C2A24]">
              Thực đơn brewlite
            </h1>
          </div>
          <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Thanh chọn Danh mục (Filter Pills) */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#1C2A24] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Trạng thái Loading / Error */}
        {loading && (
          <div className="text-center py-12 text-gray-400 animate-pulse">
            Đang tải thực đơn...
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-500 font-medium">
            {error}
          </div>
        )}

        {/* Danh sách món ăn lấy trực tiếp từ Backend */}
        {!loading && !error && (
          <div className="space-y-4 flex-1">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-gray-400 py-10">
                Chưa có món thuộc danh mục này
              </p>
            ) : (
              filteredProducts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedProduct(item)}
                  className="bg-white rounded-3xl p-3.5 flex items-center gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-md transition cursor-pointer"
                >
                  <div className="w-20 h-24 rounded-2xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-semibold text-base text-[#1C2A24] truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mb-1">
                      {item.category}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                      <span className="text-amber-500">★</span>
                      <span className="font-medium">{item.rating}</span>
                    </div>
                    <p className="font-bold text-[#1C2A24] text-base">
                      {item.price.toLocaleString('vi-VN')}đ
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedProduct(item);
                    }}
                    aria-label={`Chọn ${item.name}`}
                    className="w-9 h-9 rounded-full bg-[#1C2A24] text-white flex items-center justify-center hover:bg-[#2c3e36] active:scale-95 transition flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bottom Navigation Bar - Đã bọc Link chuyển trang chính xác */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 py-3 px-6 flex justify-between items-center shadow-lg z-50">
          <Link href="/" className="flex flex-col items-center gap-1 text-[#1C2A24]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-[11px] font-bold">Thực đơn</span>
            <span className="w-1 h-1 rounded-full bg-[#B58A59]"></span>
          </Link>

          <Link href="/cart" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 12H4L5 11z" />
            </svg>
            <span className="text-[11px]">
              Giỏ hàng ({getTotalItems()})
            </span>
          </Link>

          <Link href="/orders" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[11px]">Đơn hàng</span>
          </Link>

          <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[11px]">Tài khoản</span>
          </Link>
        </nav>

        {/* Modal chi tiết sản phẩm */}
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />

        {/* Thông báo sau khi thêm vào giỏ */}
        {notice && (
          <div
            role="status"
            className="fixed left-1/2 top-5 z-[110] w-[90%] max-w-md -translate-x-1/2 rounded-xl bg-[#1C2A24] p-4 text-sm text-white shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <p>{notice}</p>
              <button
                type="button"
                onClick={() => setNotice('')}
                aria-label="Đóng thông báo"
                className="text-lg"
              >
                ×
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}