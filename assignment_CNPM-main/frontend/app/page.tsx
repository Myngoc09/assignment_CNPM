'use client';

import { useEffect, useState, useMemo } from 'react';
import { Product, useCart } from './context/CartContext';
import ProductModal from './components/ProductModal';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Cà Phê Muối brewlite',
    category: 'Cà Phê',
    price: 45000,
    image: '/images/cafe-muoi.jpg',
  },
  {
    id: '2',
    name: 'Trà Đào Cam Sả',
    category: 'Trà',
    price: 50000,
    image: '/images/tra-dao-cam-xa.png',
  },
  {
    id: '3',
    name: 'Bánh Croissant Bơ Tươi',
    category: 'Bánh Ngọt',
    price: 38000,
    image: '/images/croissant.png',
  },
  {
    id: '4',
    name: 'Matcha Latte Uji',
    category: 'Trà',
    price: 55000,
    image: '/images/matcha.png',
  },
];

export default function Home() {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'asc' | 'desc' | 'default'>('default');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { addToCart, totalItems, setIsCartOpen } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/products`);

        if (!res.ok) {
          throw new Error('Không thể tải danh sách sản phẩm');
        }

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      } catch (err: any) {
        setProducts(MOCK_PRODUCTS);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory =
          selectedCategory === 'All' || product.category === selectedCategory;
        const matchesSearch = product.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'asc') return a.price - b.price;
        if (sortBy === 'desc') return b.price - a.price;
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // 1. MÀN HÌNH MỞ ĐẦU (WELCOME / LOGIN HERO)
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-[#111A16] max-w-md mx-auto flex flex-col justify-between text-white relative overflow-hidden shadow-2xl">
        {/* Top Section - Status & Logo */}
        <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-4 relative">
          <div className="absolute top-4 left-6 right-6 flex justify-between text-xs text-white/80 font-semibold">
            <span>9:41</span>
            <div className="flex gap-1.5 items-center">
              <span>📶</span>
              <span>🔋</span>
            </div>
          </div>

          {/* Logo brewlite */}
          <div className="text-center mt-6 mb-4">
            <h1 className="tracking-[0.3em] text-2xl font-serif border-b border-amber-500/40 pb-1 inline-block px-4">
              BREWLITE
            </h1>
            <p className="text-[9px] tracking-[0.25em] text-amber-500/80 mt-1 uppercase">
              TEA · COFFEE ATELIER
            </p>
          </div>

          {/* Hero Image Circle */}
          <div className="w-56 h-56 rounded-full bg-[#1C2822] flex items-center justify-center my-4 shadow-2xl border border-white/5 relative p-6 overflow-hidden">
            <img 
              src="/images/logo.png" 
              alt="Brewlite Logo" 
              className="w-full h-full object-contain drop-shadow-xl animate-pulse"
            />
          </div>
        </div>

        {/* Bottom Section - Card Chào Mừng */}
        <div className="bg-[#F9F6F0] text-[#1A2421] rounded-t-[32px] p-6 pt-8 shadow-2xl space-y-5">
          <div>
            <h2 className="text-2xl font-bold font-serif text-[#1A2421] mb-1">
              Chào mừng trở lại
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Đăng nhập để tiếp tục thưởng thức những ly đồ uống tinh tuyển.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full bg-[#111A16] hover:bg-[#1C2822] text-white font-semibold py-4 rounded-2xl shadow-lg transition-all text-xs tracking-wider uppercase"
            >
              KHÁM PHÁ THỰC ĐƠN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MÀN HÌNH THỰC ĐƠN (MENU PAGE)
  return (
    <div className="min-h-screen bg-[#F9F6F0] max-w-md mx-auto pb-28 relative text-[#1A2421] font-sans shadow-2xl">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center text-xs font-semibold text-gray-800 mb-5">
          <span>9:41</span>
          <div className="flex gap-1.5 items-center text-sm">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#C59B63] uppercase mb-1">
              CHÀO BUỔI SÁNG
            </p>
            <h1 className="text-2xl font-serif font-bold text-[#1A2421]">
              Thực đơn tinh tuyển
            </h1>
          </div>
          <button
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="w-10 h-10 rounded-full bg-white border border-gray-200/70 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 transition"
          >
            🔍
          </button>
        </div>

        {/* Thanh tìm kiếm & lọc */}
        {showSearchInput && (
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Tìm món ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1A2421]"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none"
            >
              <option value="default">Mặc định</option>
              <option value="asc">Giá thấp</option>
              <option value="desc">Giá cao</option>
            </select>
          </div>
        )}

        {/* Tabs Danh mục */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as string)}
              className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#111A16] text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200/60 hover:border-gray-300'
              }`}
            >
              {cat === 'All' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      {loading && (
        <div className="px-6 space-y-3.5 mt-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-3 flex items-center gap-4 border border-gray-100 animate-pulse"
            >
              <div className="w-20 h-20 bg-gray-200 rounded-xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div className="px-6 space-y-3.5 mt-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="bg-white rounded-2xl p-3 flex items-center gap-4 shadow-sm border border-gray-100/80 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-20 h-20 rounded-xl bg-[#F2E8D9]/50 flex items-center justify-center overflow-hidden shrink-0">
                {product.image && (product.image.startsWith('/') || product.image.startsWith('http')) ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <span className="text-3xl">{product.image || '☕'}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-gray-900 truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {product.category || 'Aurelia Special'}
                </p>

                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500 font-semibold">
                  <span>★</span>
                  <span className="text-gray-700">4.8</span>
                </div>

                <p className="text-sm font-bold text-[#1A2421] mt-1">
                  {product.price.toLocaleString('vi-VN')}đ
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}
                className="w-8 h-8 rounded-full bg-[#111A16] hover:bg-[#1C2822] text-white flex items-center justify-center text-lg font-light shadow transition-transform active:scale-95 shrink-0"
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-gray-100 py-3 px-6 flex justify-between items-center z-40 shadow-lg">
        <button className="flex flex-col items-center gap-1 text-[#111A16]">
          <span className="text-base">🏠</span>
          <span className="text-[10px] font-bold">Thực đơn</span>
          <span className="w-1 h-1 bg-[#111A16] rounded-full mt-0.5"></span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-700 relative"
        >
          <span className="text-base">🛍️</span>
          <span className="text-[10px] font-medium">Giỏ hàng</span>
          {totalItems > 0 && (
            <span className="absolute -top-1 right-2 bg-amber-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowWelcome(true)}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-700"
        >
          <span className="text-base">👤</span>
          <span className="text-[10px] font-medium">Đăng nhập</span>
        </button>
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}