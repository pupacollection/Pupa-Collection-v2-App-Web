import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProductStore } from '../store/useProductStore';

export default function Store() {
  const { products, isLoading, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="w-full min-h-screen pt-12 md:pt-32 px-6 md:px-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-white tracking-wider mb-2">PUPA // STORE</h1>
          <p className="text-gray-400 font-body text-sm tracking-widest uppercase">PRODUTOS • DROP 001</p>
        </div>
        
        <div className="flex gap-4 overflow-x-auto w-full md:w-auto pb-2 scrollbar-none">
          {['DROP', 'CATEGORIA', 'COR', 'TAMANHO'].map(filter => (
            <button key={filter} className="text-xs font-heading tracking-widest border border-white/10 px-4 py-2 hover:bg-white/5 whitespace-nowrap text-white">
              {filter} ▾
            </button>
          ))}
        </div>
      </div>
      
      {isLoading ? (
        <div className="w-full flex justify-center py-20 text-pupa-neon font-heading tracking-widest">
          CARREGANDO DROP...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <Link to={`/product/${product.id}`} key={product.id} className="group flex flex-col bg-pupa-dark-gray border border-white/5 hover:border-white/20 transition-all">
              <div className="relative aspect-[3/4] bg-pupa-graphite overflow-hidden p-4">
                {product.badge && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="text-[9px] font-heading tracking-widest bg-white text-black px-2 py-1 font-bold">{product.badge}</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 z-10 text-[9px] font-heading tracking-widest text-gray-400">
                  {product.dropId}
                </div>
                {/* Fallback image for now until we store real images */}
                <img src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800" alt={product.name} className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-500" />
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-heading font-bold text-lg text-white mb-1 uppercase">{product.name}</h3>
                <p className="text-xs text-gray-500 font-body mb-4 line-clamp-2">{product.description}</p>
                
                <div className="mt-auto flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold font-body text-white">
                      R$ {(product.promoPrice || product.price).toFixed(2).replace('.', ',')}
                    </span>
                    {product.promoPrice && (
                      <span className="text-xs text-gray-500 line-through ml-2">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                    )}
                  </div>
                  <button className="text-[10px] font-heading font-bold tracking-widest border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition-colors text-white">
                    VER PRODUTO
                  </button>
                </div>
              </div>
            </Link>
          ))}
          {products.length === 0 && (
             <div className="col-span-full py-20 text-center text-gray-500 font-heading tracking-widest uppercase">
                Nenhum produto encontrado neste drop.
             </div>
          )}
        </div>
      )}
    </div>
  );
}
