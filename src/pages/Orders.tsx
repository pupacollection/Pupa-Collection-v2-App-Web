import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Order } from '../types';

export default function Orders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;
      try {
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user]);

  const getStatusInPtBr = (status: string) => { return status; // Status already in PT-BR in DB
    const statuses: Record<string, string> = {
      'PENDING': 'AGUARDANDO PAGAMENTO',
      'PAID': 'PAGO',
      'PROCESSING': 'EM PROCESSAMENTO',
      'SHIPPED': 'ENVIADO',
      'DELIVERED': 'ENTREGUE',
      'CANCELLED': 'CANCELADO',
      'REFUNDED': 'REEMBOLSADO'
    };
    return statuses[status] || status;
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex items-center justify-center">
        <h1 className="text-2xl font-heading text-pupa-neon animate-pulse tracking-widest uppercase">CARREGANDO PEDIDOS...</h1>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-160px)] pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl font-heading font-bold text-white tracking-wider uppercase">MEUS PEDIDOS</h1>
           <Link to="/account" className="text-[10px] font-heading tracking-widest text-gray-500 hover:text-white transition-colors uppercase">
              VOLTAR PARA CONTA
           </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-pupa-dark-gray border border-white/5 p-12 text-center">
            <span className="text-sm font-heading tracking-widest text-gray-500 block mb-6 uppercase">NENHUM PEDIDO ENCONTRADO</span>
            <Link to="/store" className="bg-white text-black font-heading font-bold px-8 py-4 tracking-widest hover:bg-gray-200 transition-colors uppercase">
               EXPLORAR DROPS
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orders.map(order => (
              <div key={order.id} className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-1 uppercase">PEDIDO</span>
                  <span className="font-body text-white font-bold">{order.publicOrderCode || order.id}</span>
                  <span className="text-[10px] font-heading tracking-widest text-gray-500 block mt-2 uppercase">DATA</span>
                  <span className="font-body text-white">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div className="flex flex-col md:items-center">
                  <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-1 uppercase">STATUS</span>
                  <span className={`text-xs font-heading font-bold tracking-widest uppercase ${['PAGAMENTO APROVADO', 'PAGO', 'ENVIADO', 'ENTREGUE'].includes(order.status) ? 'text-green-500' : 'text-pupa-neon'}`}>
                    {getStatusInPtBr(order.status)}
                  </span>
                </div>
                
                <div className="flex flex-col md:items-end">
                  <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-1 uppercase">TOTAL</span>
                  <span className="font-body text-white font-bold">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                  <Link to={`/account/orders/${order.id}`} className="mt-4 text-[10px] font-heading tracking-widest text-white border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition-colors uppercase">
                    VER DETALHES
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
