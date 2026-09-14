import { create } from 'zustand';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const q = query(collection(db, 'products'), where('active', '==', true));
      const querySnapshot = await getDocs(q);
      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() } as Product);
      });
      set({ products, isLoading: false });
    } catch (error) {
      console.error("Error fetching products:", error);
      set({ isLoading: false });
    }
  }
}));
