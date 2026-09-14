import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product as ProductType, ProductVariant } from '../types';
import { useCartStore } from '../store/useCartStore';

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function fetchProductData() {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as ProductType);
          
          const vQuery = query(collection(db, 'productVariants'), where('productId', '==', id), where('active', '==', true));
          const vSnap = await getDocs(vQuery);
          const fetchedVariants: ProductVariant[] = [];
          vSnap.forEach(v => fetchedVariants.push({ id: v.id, ...v.data() } as ProductVariant));
          
          setVariants(fetchedVariants);
          if (fetchedVariants.length > 0) {
            setSelectedColor(fetchedVariants[0].color);
            setSelectedSize(fetchedVariants[0].size);
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex items-center justify-center">
        <h1 className="text-2xl font-heading text-pupa-neon animate-pulse tracking-widest uppercase">CARREGANDO PRODUTO...</h1>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex items-center justify-center">
        <h1 className="text-2xl font-heading text-red-500 tracking-widest uppercase">PRODUTO NÃO ENCONTRADO.</h1>
      </div>
    );
  }

  const availableColors = Array.from(new Set(variants.map(v => v.color)));
  const availableSizes = Array.from(new Set(variants.filter(v => v.color === selectedColor).map(v => v.size)));
  
  const currentVariant = variants.find(v => v.color === selectedColor && v.size === selectedSize);
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;

  const handleAddToCart = () => {
    if (currentVariant && !isOutOfStock) {
      addItem(product, currentVariant, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    }
  };

  return (
    <div className="w-full min-h-screen pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12">
        
        {/* Gallery Placeholder */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="w-full aspect-[3/4] bg-pupa-graphite relative overflow-hidden border border-white/5">
            {product.badge && (
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-heading tracking-widest bg-white text-black px-3 py-1 font-bold">{product.badge}</span>
              </div>
            )}
            <img 
              src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800" 
              alt={product.name} 
              className="w-full h-full object-cover mix-blend-luminosity"
            />
          </div>
        </div>

        {/* Info */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="mb-2">
            <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">{product.dropId} // {product.collection}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-white tracking-wider mb-4 uppercase">{product.name}</h1>
          
          <div className="mb-8">
            <span className="text-2xl font-bold font-body text-white">R$ {(product.promoPrice || product.price).toFixed(2).replace('.', ',')}</span>
            {product.promoPrice && (
              <span className="text-sm text-gray-500 line-through ml-3">R$ {product.price.toFixed(2).replace('.', ',')}</span>
            )}
          </div>
          
          <div className="w-full h-px bg-white/10 mb-8" />
          
          {/* Colors */}
          <div className="mb-8">
            <h3 className="text-xs font-heading tracking-widest text-gray-400 mb-3">COR</h3>
            <div className="flex gap-3">
              {availableColors.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    // Reset size if the new color doesn't have the currently selected size
                    const newSizes = variants.filter(v => v.color === color).map(v => v.size);
                    if (!newSizes.includes(selectedSize) && newSizes.length > 0) {
                      setSelectedSize(newSizes[0]);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-heading tracking-widest border transition-colors ${
                    selectedColor === color 
                      ? 'border-white text-black bg-white' 
                      : 'border-white/20 text-white hover:border-white/50'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-heading tracking-widest text-gray-400">TAMANHO</h3>
              <button className="text-[10px] font-heading tracking-widest text-gray-500 underline hover:text-white transition-colors">GUIA DE MEDIDAS</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {['P', 'M', 'G', 'GG'].map(size => {
                const isAvailable = availableSizes.includes(size);
                return (
                  <button
                    key={size}
                    disabled={!isAvailable}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 flex items-center justify-center text-xs font-heading tracking-widest border transition-colors ${
                      selectedSize === size 
                        ? 'border-white text-black bg-white' 
                        : isAvailable 
                          ? 'border-white/20 text-white hover:border-white/50' 
                          : 'border-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-8 text-[10px] font-heading tracking-widest text-pupa-neon uppercase">
            {currentVariant ? (
              currentVariant.stock > 0 
                ? `APENAS ${currentVariant.stock.toString().padStart(2, '0')} DISPONÍVEIS` 
                : 'ESGOTADO'
            ) : 'SELECIONE AS OPÇÕES'}
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full py-5 text-sm font-heading font-bold tracking-widest transition-colors ${
              isOutOfStock 
                ? 'bg-pupa-graphite text-gray-500 cursor-not-allowed border border-white/10'
                : added
                  ? 'bg-green-500 text-black border border-green-500'
                  : 'bg-white text-black hover:bg-gray-200 border border-white'
            }`}
          >
            {isOutOfStock ? 'FORA DE ESTOQUE' : added ? 'ADICIONADO AO CARRINHO' : 'ADICIONAR AO CARRINHO'}
          </button>
          
          {currentVariant && (
            <p className="text-[10px] text-gray-500 font-heading tracking-widest mt-4 uppercase text-center">
              SKU: {currentVariant.sku}
            </p>
          )}
          
          <div className="w-full h-px bg-white/10 my-8" />
          
          <div>
            <h3 className="text-xs font-heading tracking-widest text-white mb-3">DESCRIÇÃO</h3>
            <p className="text-sm font-body text-gray-400 leading-relaxed">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
