'use client';

import { Product } from '../context/CartContext';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
        >
          ✕
        </button>
        <div className="text-6xl text-center mb-4">{product.image || '☕'}</div>
        <h3 className="text-2xl font-bold text-gray-800 text-center mb-2">
          {product.name}
        </h3>
        <p className="text-gray-600 text-center mb-4">{product.description}</p>
        <div className="text-xl font-bold text-amber-600 text-center mb-6">
          {product.price.toLocaleString('vi-VN')} đ
        </div>
        <button
          onClick={() => {
            onAddToCart(product);
            onClose();
          }}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Thêm vào giỏ hàng
        </button>
      </div>
    </div>
  );
}