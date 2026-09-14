import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { Shield } from 'lucide-react';
import { motion } from 'motion/react';

export default function Checkout() {
  const { items, getTotals, clearCart } = useCartStore();
  const { user, profile } = useAuthStore();
  const { subtotal } = getTotals();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: profile?.displayName || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    cpf: profile?.cpf || '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'cep') {
       const cleanCep = value.replace(/\D/g, '');
       if (cleanCep.length === 8) {
          setShippingLoading(true);
          setShippingOptions([]);
          setSelectedShipping(null);
          try {
             const res = await fetch('/api/shipping/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cep: cleanCep })
             });
             const data = await res.json();
             if (res.ok && data.options) {
                setShippingOptions(data.options);
                if (data.options.length > 0) {
                   setSelectedShipping(data.options[0]);
                }
             }
          } catch(err) {
             console.error(err);
          } finally {
             setShippingLoading(false);
          }
       }
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('VOCÊ PRECISA ESTAR LOGADO PARA FINALIZAR A COMPRA.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderPayload = {
        userId: user.uid,
        shippingCode: selectedShipping ? selectedShipping.code : null,
        shippingPrice: selectedShipping ? selectedShipping.price : 0,
        items: items.map(item => ({
          productId: item.product.id,
          variantId: item.variant.id,
          quantity: item.quantity
        })),
        customerSnapshot: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf
        },
        shippingAddress: {
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state
        }
      };

      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar checkout');
      }

      // If Mercado Pago is configured, we might redirect to a URL or show PIX copy-paste
      // For now we will clear cart and redirect to success page
      clearCart();
      navigate(`/success?orderId=${data.orderId}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-160px)] pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-12">
        
        {/* Form */}
        <div className="flex-1">
          <h1 className="text-3xl font-heading font-bold text-white tracking-wider mb-8 uppercase">FINALIZAR COMPRA</h1>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 mb-8 text-sm font-body uppercase">
              {error}
            </div>
          )}
          
          <form id="checkout-form" onSubmit={handleCheckout} className="flex flex-col gap-8">
            {/* Contact */}
            <div className="bg-pupa-dark-gray border border-white/5 p-6 md:p-8">
              <h2 className="text-lg font-heading font-bold text-white tracking-widest mb-6">1. CONTATO</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">NOME COMPLETO</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">E-MAIL</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">TELEFONE</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">CPF</label>
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-pupa-dark-gray border border-white/5 p-6 md:p-8">
              <h2 className="text-lg font-heading font-bold text-white tracking-widest mb-6">2. ENDEREÇO</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">CEP</label>
                  <input type="text" name="cep" value={formData.cep} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">ENDEREÇO</label>
                  <input type="text" name="street" value={formData.street} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">NÚMERO</label>
                  <input type="text" name="number" value={formData.number} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">COMPLEMENTO (OPCIONAL)</label>
                  <input type="text" name="complement" value={formData.complement} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">BAIRRO</label>
                  <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">CIDADE</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-heading tracking-widest text-gray-400">ESTADO</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} required className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" />
                </div>
              </div>

              {shippingLoading && (
                 <div className="mt-6 text-[10px] text-pupa-neon font-heading tracking-widest uppercase animate-pulse">CALCULANDO FRETE...</div>
              )}
              {!shippingLoading && shippingOptions.length > 0 && (
                 <div className="mt-6">
                    <label className="text-[10px] font-heading tracking-widest text-gray-400 block mb-3">MÉTODO DE ENVIO</label>
                    <div className="flex flex-col gap-3">
                       {shippingOptions.map(opt => (
                          <label key={opt.code} className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${selectedShipping?.code === opt.code ? 'border-pupa-neon bg-pupa-neon/5' : 'border-white/10 bg-pupa-graphite hover:border-white/20'}`}>
                             <div className="flex items-center gap-3">
                                <input type="radio" name="shipping" value={opt.code} checked={selectedShipping?.code === opt.code} onChange={() => setSelectedShipping(opt)} className="hidden" />
                                <div className={`w-3 h-3 rounded-full border ${selectedShipping?.code === opt.code ? 'border-pupa-neon bg-pupa-neon shadow-[0_0_8px_rgba(0,240,255,0.5)]' : 'border-gray-500'}`}></div>
                                <div>
                                   <span className="font-heading font-bold text-white tracking-widest text-sm uppercase block">{opt.name}</span>
                                   <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">{opt.deadline} DIAS ÚTEIS</span>
                                </div>
                             </div>
                             <span className="font-body font-bold text-white uppercase text-sm">
                                {opt.price === 0 ? 'GRÁTIS' : `R$ ${opt.price.toFixed(2).replace('.', ',')}`}
                             </span>
                          </label>
                       ))}
                    </div>
                 </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-pupa-dark-gray border border-white/5 p-6 md:p-8">
              <h2 className="text-lg font-heading font-bold text-white tracking-widest mb-6">3. PAGAMENTO</h2>
              <div className="border border-pupa-neon/50 bg-pupa-neon/5 p-4 flex items-center justify-between">
                <span className="font-heading font-bold text-white tracking-widest text-sm">PIX</span>
                <span className="text-[10px] font-heading tracking-widest text-pupa-neon">INSTANTÂNEO</span>
              </div>
              <p className="text-[10px] text-gray-500 font-heading tracking-widest mt-4 uppercase text-center flex items-center justify-center gap-2">
                <Shield className="w-3 h-3" />
                TRANSAÇÃO SEGURA
              </p>
            </div>
          </form>
        </div>
        
        {/* Summary */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          <div className="bg-pupa-dark-gray border border-white/5 p-6 sticky top-24">
            <h3 className="font-heading font-bold text-white tracking-widest mb-6">REVISÃO</h3>
            
            <div className="flex flex-col gap-4 mb-6 max-h-60 overflow-y-auto scrollbar-none">
              {items.map(item => (
                <div key={item.cartItemId} className="flex gap-4">
                  <div className="w-16 h-20 bg-pupa-graphite shrink-0">
                    <img 
                      src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=200" 
                      alt={item.product.name} 
                      className="w-full h-full object-cover mix-blend-luminosity"
                     />
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <h4 className="text-xs font-heading font-bold text-white uppercase truncate">{item.product.name}</h4>
                    <span className="text-[9px] text-gray-500 font-heading tracking-widest uppercase mb-1">{item.variant.color} / {item.variant.size}</span>
                    <div className="flex justify-between w-full">
                      <span className="text-[10px] text-gray-400 font-heading tracking-widest">QTD: {item.quantity}</span>
                      <span className="text-[10px] font-body text-white font-bold">R$ {((item.product.promoPrice || item.product.price) * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="w-full h-px bg-white/10 mb-6" />
            
            <div className="flex justify-between text-sm font-body text-gray-400 mb-4">
              <span>SUBTOTAL</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            
            <div className="flex justify-between text-sm font-body text-gray-400 mb-6">
              <span>FRETE</span>
              <span className={selectedShipping && selectedShipping.price > 0 ? "text-white" : "text-green-500 font-bold text-xs uppercase"}>
                 {selectedShipping ? (selectedShipping.price > 0 ? `R$ ${selectedShipping.price.toFixed(2).replace('.', ',')}` : 'GRÁTIS') : 'CALCULANDO'}
              </span>
            </div>
            
            <div className="w-full h-px bg-white/10 mb-6" />
            
            <div className="flex justify-between text-lg font-body font-bold text-white mb-8">
              <span>TOTAL</span>
              <span>R$ {(subtotal + (selectedShipping ? selectedShipping.price : 0)).toFixed(2).replace('.', ',')}</span>
            </div>
            
            <button 
              type="submit"
              form="checkout-form"
              disabled={loading}
              className="w-full bg-pupa-neon text-black font-heading font-bold tracking-widest py-4 hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? 'PROCESSANDO...' : 'FINALIZAR COM PIX'}
            </button>
            <p className="text-[9px] text-gray-500 font-heading tracking-widest mt-4 text-center">
              AO FINALIZAR, VOCÊ CONCORDA COM OS TERMOS DA PUPA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
