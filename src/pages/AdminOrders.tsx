import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Search, Clock, Box } from 'lucide-react';

export default function AdminOrders() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
       navigate('/');
    }
  }, [profile, navigate]);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm(`Tem certeza que deseja CANCELAR o pedido ${order.publicOrderCode}? O estoque será devolvido.`)) return;
    try {
      await runTransaction(db, async (t) => {
         const orderRef = doc(db, 'orders', order.id);
         const orderSnap = await t.get(orderRef);
         if (!orderSnap.exists()) throw new Error("Pedido não encontrado");
         
         const currentData = orderSnap.data();
         if (currentData.status === 'CANCELADO') return; // Already cancelled

         // Restore stock
         if (currentData.items && Array.isArray(currentData.items)) {
            for (const item of currentData.items) {
               const variantRef = doc(db, 'productVariants', item.variantId);
               const vSnap = await t.get(variantRef);
               if (vSnap.exists()) {
                  t.update(variantRef, { stock: vSnap.data().stock + item.quantity });
               }
            }
         }

         t.update(orderRef, {
            status: 'CANCELADO',
            paymentStatus: 'CANCELADO',
            updatedAt: new Date().toISOString()
         });
      });
      fetchOrders();
    } catch (e) {
       console.error(e);
       alert("Erro ao cancelar pedido.");
    }
  };

  const handleShipOrder = async (order: Order) => {
    const trackingCode = window.prompt(`Informe o código de rastreio para o pedido ${order.publicOrderCode}:`);
    if (trackingCode === null) return;
    
    try {
       await updateDoc(doc(db, 'orders', order.id), {
          status: 'ENVIADO',
          trackingCode,
          updatedAt: new Date().toISOString()
       });
       fetchOrders();
    } catch(e) {
       console.error(e);
       alert("Erro ao enviar pedido.");
    }
  };

  const filteredOrders = orders.filter(o => 
     o.publicOrderCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
     o.customerSnapshot?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     o.customerSnapshot?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 px-6 font-body text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-heading font-bold uppercase tracking-widest mb-8 border-b border-white/10 pb-4">
          Gestão de Pedidos
        </h1>

        <div className="mb-6 relative">
           <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
           <input 
              type="text" 
              placeholder="Buscar por ID, Email ou Nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-pupa-dark-gray border border-white/10 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-pupa-neon transition-colors"
           />
        </div>

        {loading ? (
           <div className="text-[10px] text-pupa-neon font-heading tracking-widest uppercase animate-pulse">CARREGANDO PEDIDOS...</div>
        ) : (
           <div className="grid grid-cols-1 gap-4">
              {filteredOrders.map(order => (
                 <div key={order.id} className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-col lg:flex-row gap-6 justify-between hover:border-white/20 transition-colors">
                    
                    <div className="flex-1 space-y-4">
                       <div className="flex items-center gap-3">
                          <span className="font-heading font-bold uppercase tracking-widest text-lg">{order.publicOrderCode}</span>
                          <span className={`px-2 py-1 text-[9px] font-heading tracking-widest uppercase border ${
                             order.status === 'CANCELADO' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
                             order.status === 'ENVIADO' ? 'text-blue-500 border-blue-500/30 bg-blue-500/10' :
                             order.status === 'PAGAMENTO APROVADO' ? 'text-green-500 border-green-500/30 bg-green-500/10' :
                             'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
                          }`}>
                             {order.status}
                          </span>
                       </div>
                       
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-400">
                          <div>
                             <span className="block text-[9px] uppercase tracking-widest text-gray-600 mb-1">DATA</span>
                             {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                          <div>
                             <span className="block text-[9px] uppercase tracking-widest text-gray-600 mb-1">CLIENTE</span>
                             <span className="truncate block max-w-[150px]">{order.customerSnapshot?.name}</span>
                          </div>
                          <div>
                             <span className="block text-[9px] uppercase tracking-widest text-gray-600 mb-1">VALOR</span>
                             R$ {order.total.toFixed(2).replace('.', ',')}
                          </div>
                          <div>
                             <span className="block text-[9px] uppercase tracking-widest text-gray-600 mb-1">FRETE</span>
                             {order.shippingCode} - R$ {order.shipping?.toFixed(2).replace('.', ',') || '0,00'}
                          </div>
                       </div>

                       <div className="text-[10px] uppercase tracking-widest text-gray-500">
                          {order.items.length} ITENS: {order.items.map(i => `${i.quantity}x ${i.name.replace('PUPA ESSENTIAL - ', '')} (${i.size})`).join(', ')}
                       </div>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                       {order.status !== 'CANCELADO' && order.status !== 'ENVIADO' && (
                          <>
                             {order.status === 'PAGAMENTO APROVADO' && (
                                <button onClick={() => handleShipOrder(order)} className="px-4 py-2 bg-pupa-neon/10 border border-pupa-neon/30 text-pupa-neon text-[10px] font-heading font-bold uppercase tracking-widest hover:bg-pupa-neon hover:text-black transition-colors flex items-center justify-center gap-2">
                                   <Box className="w-4 h-4" />
                                   MARCAR COMO ENVIADO
                                </button>
                             )}
                             <button onClick={() => handleCancelOrder(order)} className="px-4 py-2 bg-transparent border border-red-500/30 text-red-500 text-[10px] font-heading tracking-widest uppercase hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                                <XCircle className="w-4 h-4" />
                                CANCELAR & DEVOLVER ESTOQUE
                             </button>
                          </>
                       )}
                       {order.status === 'CANCELADO' && (
                          <div className="px-4 py-2 border border-red-500/20 text-red-500/50 text-[10px] font-heading tracking-widest uppercase text-center">
                             ESTOQUE DEVOLVIDO
                          </div>
                       )}
                       {order.status === 'ENVIADO' && (
                          <div className="px-4 py-2 border border-blue-500/20 text-blue-500 text-[10px] font-heading tracking-widest uppercase text-center flex flex-col gap-1">
                             <span>PACOTE EM TRÂNSITO</span>
                             <span className="text-[8px] text-gray-500">{order.trackingCode}</span>
                          </div>
                       )}
                    </div>
                 </div>
              ))}
              {filteredOrders.length === 0 && (
                 <div className="text-center py-12 text-xs font-heading tracking-widest uppercase text-gray-500 border border-white/5">
                    NENHUM PEDIDO ENCONTRADO.
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
