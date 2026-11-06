
'use client';

import { useEffect, useState } from 'react';

export interface Product {
  id: string;
  name: string;
  category: string;
  rating: number;
  price: number;
  imageUrl: string;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    size: string,
    toppings: string[],
    totalPrice: number,
  ) => void;
}

const SIZES = [
  { name: 'S', extraPrice: 0 },
  { name: 'M', extraPrice: 5000 },
  { name: 'L', extraPrice: 10000 },
];

const TOPPINGS = [
  { name: 'Trân châu', price: 5000 },
  { name: 'Kem cheese', price: 10000 },
  { name: 'Thạch cà phê', price: 5000 },
];

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  const isOneSize = product?.name
    .toLowerCase()
    .includes('croissant') ?? false;

  // Dat lai lua chon khi mo mot san pham khac
  useEffect(() => {
    if (product) {
      const isCroissant = product.name
        .toLowerCase()
        .includes('croissant');

      setSelectedSize(isCroissant ? 'ONE_SIZE' : 'M');
      setSelectedToppings([]);
    }
  }, [product]);

  // Dong cua so bang phim Escape
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  // Croissant khong co phu phi size
  const sizeExtra = isOneSize
    ? 0
    : SIZES.find((size) => size.name === selectedSize)?.extraPrice ?? 0;

  const toppingTotal = TOPPINGS
    .filter((topping) => selectedToppings.includes(topping.name))
    .reduce((total, topping) => total + topping.price, 0);

  const totalPrice = product.price + sizeExtra + toppingTotal;

  const toggleTopping = (toppingName: string) => {
    setSelectedToppings((current) =>
      current.includes(toppingName)
        ? current.filter((name) => name !== toppingName)
        : [...current, toppingName],
    );
  };

  const handleAddToCart = () => {
    onAddToCart(
      product,
      isOneSize ? 'ONE_SIZE' : selectedSize,
      selectedToppings,
      totalPrice,
    );

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết ${product.name}`}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#FDFBF7] p-5 shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Tieu de */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-serif font-semibold text-[#1C2A24]">
            Chi tiết sản phẩm
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-gray-600 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* Anh san pham */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-48 w-full rounded-2xl bg-gray-100 object-cover"
        />

        {/* Thong tin san pham */}
        <div className="mt-4">
          <p className="text-xs text-[#B58A59]">{product.category}</p>

          <h3 className="mt-1 text-xl font-semibold text-[#1C2A24]">
            {product.name}
          </h3>

          <p className="mt-1 text-lg font-bold text-[#1C2A24]">
            {product.price.toLocaleString('vi-VN')}đ
          </p>
        </div>

        {/* Chi hien thi size voi san pham co nhieu size */}
        {!isOneSize && (
          <section className="mt-5">
            <h4 className="mb-3 font-semibold text-[#1C2A24]">
              Chọn size
            </h4>

            <div className="grid grid-cols-3 gap-3">
              {SIZES.map((size) => (
                <button
                  key={size.name}
                  type="button"
                  onClick={() => setSelectedSize(size.name)}
                  className={`rounded-xl border p-3 text-sm transition ${
                    selectedSize === size.name
                      ? 'border-[#1C2A24] bg-[#1C2A24] text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <span className="block font-semibold">{size.name}</span>

                  <span className="mt-1 block text-xs">
                    {size.extraPrice === 0
                      ? 'Giá gốc'
                      : `+${size.extraPrice.toLocaleString('vi-VN')}đ`}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Chon topping */}
        <section className="mt-5">
          <h4 className="mb-3 font-semibold text-[#1C2A24]">
            Chọn topping
          </h4>

          <div className="space-y-3">
            {TOPPINGS.map((topping) => (
              <label
                key={topping.name}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white p-3"
              >
                <span className="text-sm text-gray-700">
                  {topping.name}
                </span>

                <span className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    +{topping.price.toLocaleString('vi-VN')}đ
                  </span>

                  <input
                    type="checkbox"
                    checked={selectedToppings.includes(topping.name)}
                    onChange={() => toggleTopping(topping.name)}
                    className="h-4 w-4 accent-[#1C2A24]"
                  />
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Tong tien */}
        <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="font-medium text-gray-600">
            Tổng tiền
          </span>

          <span className="text-xl font-bold text-[#1C2A24]">
            {totalPrice.toLocaleString('vi-VN')}đ
          </span>
        </div>

        {/* Nut them vao gio */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-4 w-full rounded-full bg-[#1C2A24] px-5 py-3.5 font-semibold text-white transition hover:bg-[#2c3e36] active:scale-[0.98]"
        >
          Thêm vào giỏ hàng
        </button>
      </div>
    </div>
  );
}
