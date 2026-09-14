import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Order } from '../types';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!user || !id) return;
      try {
        const docRef = doc(db, 'orders', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Order;
          if (data.userId === user.uid) {
            setOrder({ id: docSnap.id, ...data });
          }
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id, user]);

  const getStatusInPtBr = (status: string) => { return status; // Status already in PT-BR in DB
    const statuses: Record<string, string> = {
      'PENDING': 'AGUARDANDO PAGAMENTO',
      'PAID': 'PAGO',
      'PROCESSING': 'EM PROCESSAMENTO',
      'SHIPPED': 'ENVIADO',
      'DELIVERED': 'ENTREGUE',
      'CANCELLED': 'CANCELADO',
      'REFUNDED': 'REEMBOLSADO',
      'APPROVED': 'APROVADO'
    };
    return statuses[status] || status;
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex items-center justify-center">
        <h1 className="text-2xl font-heading text-pupa-neon animate-pulse tracking-widest uppercase">CARREGANDO...</h1>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-heading text-red-500 tracking-widest mb-6 uppercase">PEDIDO NÃO ENCONTRADO</h1>
        <Link to="/account/orders" className="bg-white text-black font-heading font-bold px-8 py-4 tracking-widest uppercase">
           VOLTAR PARA PEDIDOS
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-160px)] pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex justify-between items-center">
           <h1 className="text-3xl font-heading font-bold text-white tracking-wider uppercase">DETALHES DO PEDIDO</h1>
           <Link to="/account/orders" className="text-[10px] font-heading tracking-widest text-gray-500 hover:text-white transition-colors uppercase">
              VOLTAR
           </Link>
        </div>

        <div className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-wrap gap-12">
          <div>
            <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-1 uppercase">PEDIDO</span>
            <span className="font-body text-white font-bold">{order.publicOrderCode || order.id}</span>
          </div>
          <div>
            <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-1 uppercase">DATA</span>
            <span className="font-body text-white">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-1 uppercase">STATUS DO PEDIDO</span>
            <span className="text-xs font-heading font-bold text-white tracking-widest uppercase">{getStatusInPtBr(order.status)}</span>
          </div>
          <div>
            <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-1 uppercase">PAGAMENTO</span>
            <span className={`text-xs font-heading font-bold tracking-widest uppercase ${['PAGAMENTO APROVADO', 'PAGO'].includes(order.paymentStatus) ? 'text-green-500' : 'text-pupa-neon'}`}>
              {getStatusInPtBr(order.paymentStatus)}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
           <div className="flex-1 bg-pupa-dark-gray border border-white/5 p-6">
             <h2 className="text-sm font-heading font-bold text-white tracking-widest mb-6">ITENS</h2>
             <div className="flex flex-col gap-6">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-16 h-20 bg-pupa-graphite">
                      <img 
                        src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=200" 
                        alt={item.name} 
                        className="w-full h-full object-cover mix-blend-luminosity"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                       <h3 className="font-heading font-bold text-white uppercase text-xs truncate">{item.name}</h3>
                       <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase mb-1">{item.color} / {item.size}</span>
                       <div className="flex justify-between w-full">
                         <span className="text-[10px] text-gray-400 font-heading tracking-widest">QTD: {item.quantity}</span>
                         <span className="text-[10px] font-body text-white font-bold">R$ {item.subtotal.toFixed(2).replace('.', ',')}</span>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
           </div>

           <div className="w-full md:w-80 flex flex-col gap-8">
             <div className="bg-pupa-dark-gray border border-white/5 p-6">
               <h2 className="text-sm font-heading font-bold text-white tracking-widest mb-6">RESUMO</h2>
               <div className="flex justify-between text-sm font-body text-gray-400 mb-4">
                 <span>SUBTOTAL</span>
                 <span>R$ {order.subtotal.toFixed(2).replace('.', ',')}</span>
               </div>
               <div className="flex justify-between text-sm font-body text-gray-400 mb-6">
                 <span>FRETE</span>
                 <span>R$ {order.shipping.toFixed(2).replace('.', ',')}</span>
               </div>
               <div className="w-full h-px bg-white/10 mb-6" />
               <div className="flex justify-between text-lg font-body font-bold text-white">
                 <span>TOTAL</span>
                 <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
               </div>
             </div>

             <div className="bg-pupa-dark-gray border border-white/5 p-6">
               <h2 className="text-sm font-heading font-bold text-white tracking-widest mb-6">ENDEREÇO DE ENTREGA</h2>
               <div className="text-xs font-body text-gray-400 flex flex-col gap-1 uppercase">
                 <span className="font-bold text-white">{order.customerSnapshot?.name || ''}</span>
                 <span>{order.shippingAddress.street}, {order.shippingAddress.number}</span>
                 {order.shippingAddress.complement && <span>{order.shippingAddress.complement}</span>}
                 <span>{order.shippingAddress.neighborhood} - {order.shippingAddress.city}/{order.shippingAddress.state}</span>
                 <span>CEP: {order.shippingAddress.cep}</span>
               </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
