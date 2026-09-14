import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { doc, setDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';

export default function Admin() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    lowStock: 0,
    pendingOrders: 0,
    approvedPayments: 0
  });

  useEffect(() => {
    async function loadStats() {
      if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') return;
      
      try {
        const pSnap = await getDocs(collection(db, 'products'));
        const vSnap = await getDocs(collection(db, 'productVariants'));
        const oSnap = await getDocs(collection(db, 'orders'));
        
        let revenue = 0;
        let pendingOrders = 0;
        let approvedPayments = 0;
        
        oSnap.forEach(d => {
          const o = d.data();
          if (['PAGO', 'PAGAMENTO APROVADO'].includes(o.paymentStatus)) {
            revenue += o.total;
            approvedPayments++;
          }
          if (o.status === 'AGUARDANDO PAGAMENTO') {
            pendingOrders++;
          }
        });
        
        let lowStock = 0;
        vSnap.forEach(d => {
          if (d.data().stock < 10) lowStock++;
        });

        setStats({
          revenue,
          orders: oSnap.size,
          products: pSnap.size,
          lowStock,
          pendingOrders,
          approvedPayments
        });
      } catch(e) {
        console.error(e);
      }
    }
    loadStats();
  }, [profile]);

  if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="w-full min-h-screen pt-12 md:pt-32 px-6 flex items-center justify-center">
        <h1 className="text-2xl font-heading text-red-500 uppercase">ACESSO RESTRITO</h1>
      </div>
    );
  }

  const seedProducts = async () => {
    setLoading(true);
    try {
      const productId = 'pupa-essential-tshirt';
      await setDoc(doc(db, 'products', productId), {
        id: productId,
        name: 'PUPA ESSENTIAL',
        slug: 'pupa-essential',
        description: 'Camiseta Oversized. Nascida do underground.',
        price: 149.90,
        promoPrice: 129.90,
        collection: 'ESSENTIALS',
        dropId: 'DROP 001',
        badge: 'EDIÇÃO LIMITADA',
        featured: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const colors = ['OFF-BLACK', 'OFF-WHITE'];
      const sizes = ['M', 'G', 'GG'];
      
      for (const color of colors) {
        for (const size of sizes) {
          const variantId = `${productId}-${color.toLowerCase()}-${size.toLowerCase()}`;
          await setDoc(doc(db, 'productVariants', variantId), {
            id: variantId,
            productId: productId,
            color: color,
            size: size,
            sku: `PUPA-ESS-${color === 'OFF-BLACK' ? 'BLK' : 'WHT'}-${size}`,
            stock: 50,
            active: true
          });
        }
      }
      
      setMessage('Produtos e variantes criados com sucesso. Recarregue para atualizar as métricas.');
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <h1 className="text-3xl font-heading font-bold text-white mb-8 tracking-wider uppercase">PUPA // PAINEL ADMINISTRATIVO</h1>
      
      {message && <div className="p-4 bg-white/10 text-white mb-8 font-body text-sm uppercase">{message}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">FATURAMENTO</span>
           <span className="text-2xl font-body font-bold text-white">R$ {stats.revenue.toFixed(2).replace('.', ',')}</span>
         </div>
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">PEDIDOS</span>
           <span className="text-2xl font-body font-bold text-white">{stats.orders}</span>
         </div>
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">PAGAMENTOS APROVADOS</span>
           <span className="text-2xl font-body font-bold text-green-500">{stats.approvedPayments}</span>
         </div>
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">ESTOQUE BAIXO</span>
           <span className="text-2xl font-body font-bold text-pupa-neon">{stats.lowStock}</span>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-pupa-dark-gray border border-white/5 p-6">
          <h2 className="text-sm font-heading font-bold tracking-widest text-white mb-6 uppercase">Ações Rápidas</h2>
          <button 
            onClick={seedProducts}
            disabled={loading}
            className="px-6 py-3 bg-white text-black font-bold font-heading text-xs tracking-widest uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'PROCESSANDO...' : 'CRIAR PRODUTO INICIAL'}
          </button>
          
          <div className="mt-4 flex gap-4">
            <Link to="/admin/community" className="flex-1 px-6 py-3 bg-transparent border border-white/20 text-center text-white font-bold font-heading text-xs tracking-widest uppercase hover:border-white transition-colors">
              MODERAÇÃO DA COMUNIDADE
            </Link>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-pupa-dark-gray border border-white/5 p-6">
          <h2 className="text-sm font-heading font-bold tracking-widest text-white mb-6 uppercase">GERENCIAR PUPA POINTS</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const pupaId = (form.elements.namedItem('pupaId') as HTMLInputElement).value;
            const amount = parseInt((form.elements.namedItem('amount') as HTMLInputElement).value);
            const reason = (form.elements.namedItem('reason') as HTMLInputElement).value;
            const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-action');
            
            if (!pupaId || !amount || !reason) return;
            setLoading(true);
            try {
              // find user
              const q = query(collection(db, 'profiles'), where('pupaId', '==', pupaId));
              const snap = await getDocs(q);
              if (snap.empty) {
                 setMessage('Usuário não encontrado.');
                 setLoading(false);
                 return;
              }
              const userDoc = snap.docs[0];
              const userData = userDoc.data();
              const newPoints = action === 'ADD' ? (userData.points || 0) + amount : Math.max(0, (userData.points || 0) - amount);
              
              await setDoc(doc(db, 'profiles', userDoc.id), { points: newPoints }, { merge: true });
              
              await addDoc(collection(db, 'pointTransactions'), {
                userId: userDoc.id,
                adminId: profile?.uid,
                amount: action === 'ADD' ? amount : -amount,
                type: action === 'ADD' ? 'ADMIN_ADD' : 'ADMIN_REMOVE',
                source: 'ADMIN_PANEL',
                description: reason,
                balanceAfter: newPoints,
                createdAt: new Date().toISOString()
              });
              
              setMessage('Pontos atualizados com sucesso.');
              form.reset();
            } catch(err: any) {
              setMessage('Erro ao atualizar pontos.');
            } finally {
              setLoading(false);
            }
          }} className="flex flex-col gap-4">
            <div>
               <label className="text-[10px] font-heading tracking-widest text-gray-500 uppercase block mb-2">PUPA ID</label>
               <input name="pupaId" type="text" placeholder="Ex: PUPA-1234" className="w-full bg-pupa-graphite border border-white/10 p-3 text-white font-body text-sm outline-none focus:border-pupa-neon transition-colors" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-[10px] font-heading tracking-widest text-gray-500 uppercase block mb-2">QUANTIDADE</label>
                 <input name="amount" type="number" min="1" placeholder="Ex: 500" className="w-full bg-pupa-graphite border border-white/10 p-3 text-white font-body text-sm outline-none focus:border-pupa-neon transition-colors" required />
               </div>
               <div>
                 <label className="text-[10px] font-heading tracking-widest text-gray-500 uppercase block mb-2">MOTIVO</label>
                 <input name="reason" type="text" placeholder="Ex: Bônus de evento" className="w-full bg-pupa-graphite border border-white/10 p-3 text-white font-body text-sm outline-none focus:border-pupa-neon transition-colors" required />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
               <button type="submit" data-action="ADD" disabled={loading} className="py-3 bg-white text-black font-bold font-heading text-[10px] tracking-widest uppercase hover:bg-gray-200 transition-colors disabled:opacity-50">
                 ADICIONAR PONTOS
               </button>
               <button type="submit" data-action="REMOVE" disabled={loading} className="py-3 bg-transparent border border-white/20 text-white font-bold font-heading text-[10px] tracking-widest uppercase hover:border-white transition-colors disabled:opacity-50">
                 REMOVER PONTOS
               </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
