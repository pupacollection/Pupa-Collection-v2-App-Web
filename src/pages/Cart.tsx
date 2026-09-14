import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { Trash2 } from 'lucide-react';

export default function Cart() {
  const { items, removeItem, updateQuantity, getTotals } = useCartStore();
  const { subtotal, count } = getTotals();
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[calc(100vh-160px)] pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-heading font-bold text-white tracking-wider mb-8 uppercase">MEU CARRINHO</h1>
        
        {items.length === 0 ? (
          <div className="bg-pupa-dark-gray border border-white/5 p-12 flex flex-col items-center justify-center text-center">
             <span className="text-sm font-heading tracking-widest text-gray-500 mb-6 uppercase">SEU CARRINHO ESTÁ VAZIO</span>
             <Link to="/store" className="bg-white text-black font-heading font-bold px-8 py-4 tracking-widest hover:bg-gray-200 transition-colors uppercase">
               EXPLORAR DROPS
             </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1 flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex gap-4 bg-pupa-dark-gray border border-white/5 p-4">
                  <div className="w-24 h-32 bg-pupa-graphite">
                     <img 
                      src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=200" 
                      alt={item.product.name} 
                      className="w-full h-full object-cover mix-blend-luminosity"
                     />
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-heading font-bold text-white uppercase">{item.product.name}</h3>
                        <p className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">{item.variant.color} // {item.variant.size}</p>
                      </div>
                      <button onClick={() => removeItem(item.cartItemId)} className="text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="mt-auto flex justify-between items-end">
                      <div className="flex items-center border border-white/10">
                        <button 
                          onClick={() => updateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                          className="px-3 py-1 text-white hover:bg-white/5"
                        >-</button>
                        <span className="px-3 py-1 text-xs font-heading text-white">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="px-3 py-1 text-white hover:bg-white/5"
                        >+</button>
                      </div>
                      <span className="font-body font-bold text-white">
                        R$ {((item.product.promoPrice || item.product.price) * item.quantity).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="w-full lg:w-80 flex flex-col gap-6">
              <div className="bg-pupa-dark-gray border border-white/5 p-6">
                <h3 className="font-heading font-bold text-white tracking-widest mb-6 uppercase">RESUMO DO PEDIDO</h3>
                
                <div className="flex justify-between text-sm font-body text-gray-400 mb-4">
                  <span className="uppercase">SUBTOTAL ({count} ITENS)</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                
                <div className="flex justify-between text-sm font-body text-gray-400 mb-6">
                  <span className="uppercase">FRETE</span>
                  <span className="uppercase">CALCULADO NO CHECKOUT</span>
                </div>
                
                <div className="w-full h-px bg-white/10 mb-6" />
                
                <div className="flex justify-between text-lg font-body font-bold text-white mb-8">
                  <span className="uppercase">TOTAL</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                
                <button 
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-pupa-neon text-black font-heading font-bold tracking-widest py-4 hover:bg-white transition-colors uppercase"
                >
                  IR PARA O CHECKOUT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
