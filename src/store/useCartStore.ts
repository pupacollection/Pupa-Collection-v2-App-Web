import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductVariant } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotals: () => { subtotal: number; total: number; count: number };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, variant, quantity) => set((state) => {
        const existingItemIndex = state.items.findIndex(item => item.variant.id === variant.id);
        if (existingItemIndex >= 0) {
          const newItems = [...state.items];
          newItems[existingItemIndex].quantity += quantity;
          return { items: newItems };
        }
        return {
          items: [...state.items, { cartItemId: `${product.id}-${variant.id}-${Date.now()}`, product, variant, quantity }]
        };
      }),
      removeItem: (cartItemId) => set((state) => ({
        items: state.items.filter(item => item.cartItemId !== cartItemId)
      })),
      updateQuantity: (cartItemId, quantity) => set((state) => ({
        items: state.items.map(item => item.cartItemId === cartItemId ? { ...item, quantity } : item)
      })),
      clearCart: () => set({ items: [] }),
      getTotals: () => {
        const items = get().items;
        const subtotal = items.reduce((acc, item) => acc + (item.product.promoPrice || item.product.price) * item.quantity, 0);
        const total = subtotal; // Assuming free shipping or add shipping later
        const count = items.reduce((acc, item) => acc + item.quantity, 0);
        return { subtotal, total, count };
      }
    }),
    {
      name: 'pupa-cart-storage',
    }
  )
);
