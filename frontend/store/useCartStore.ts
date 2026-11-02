
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  size: 'S' | 'M' | 'L';
  topping?: string;
  qty: number;
  imageUrl?: string;
}

interface CartState {
  userId: string | null;
  items: CartItem[];
  carts: Record<string, CartItem[]>;

  setUserId: (userId: string | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      userId: null,
      items: [],
      carts: {},

      setUserId: (userId) => {
        set((state) => ({
          userId,
          items: userId ? (state.carts[userId] || []) : [],
        }));
      },

      addToCart: (newItem) => {
        const userId = get().userId;

        if (!userId) return;

        set((state) => {
          const currentItems = state.carts[userId] || [];
          const existingIndex = currentItems.findIndex(
            (item) =>
              item.productId === newItem.productId &&
              item.size === newItem.size &&
              item.topping === newItem.topping
          );

          let updatedItems: CartItem[];

          if (existingIndex > -1) {
            updatedItems = [...currentItems];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              qty: updatedItems[existingIndex].qty + newItem.qty,
            };
          } else {
            updatedItems = [...currentItems, newItem];
          }

          return {
            items: updatedItems,
            carts: {
              ...state.carts,
              [userId]: updatedItems,
            },
          };
        });
      },

      removeFromCart: (id) => {
        const userId = get().userId;
        if (!userId) return;

        set((state) => {
          const updatedItems = (state.carts[userId] || []).filter(
            (item) => item.id !== id
          );

          return {
            items: updatedItems,
            carts: {
              ...state.carts,
              [userId]: updatedItems,
            },
          };
        });
      },

      updateQty: (id, qty) => {
        const userId = get().userId;
        if (!userId) return;

        set((state) => {
          const updatedItems = (state.carts[userId] || []).map((item) =>
            item.id === id ? { ...item, qty: Math.max(1, qty) } : item
          );

          return {
            items: updatedItems,
            carts: {
              ...state.carts,
              [userId]: updatedItems,
            },
          };
        });
      },

      clearCart: () => {
        const userId = get().userId;
        if (!userId) return;

        set((state) => ({
          items: [],
          carts: {
            ...state.carts,
            [userId]: [],
          },
        }));
      },

      getTotalItems: () =>
        get().items.reduce((total, item) => total + item.qty, 0),

      getTotalPrice: () =>
        get().items.reduce((total, item) => total + item.price * item.qty, 0),
    }),
    {
      name: 'brewlite-cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ carts: state.carts }),
    }
  )
);
