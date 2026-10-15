import { create } from 'zustand';

export interface CartItem {
  id: string; // id duy nhất cho mục trong giỏ (kết hợp productId + size + topping)
  productId: string;
  name: string;
  price: number;
  size: 'S' | 'M' | 'L';
  topping?: string;
  qty: number;
  imageUrl?: string;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addToCart: (newItem) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.productId === newItem.productId && item.size === newItem.size && item.topping === newItem.topping
      );
      if (existingIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingIndex].qty += newItem.qty;
        return { items: updatedItems };
      }
      return { items: [...state.items, newItem] };
    });
  },

  removeFromCart: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  updateQty: (id, qty) => {
    set((state) => ({
      items: state.items.map((item) => 
        item.id === id ? { ...item, qty: Math.max(1, qty) } : item
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.qty, 0);
  },

  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.qty, 0);
  },
}));