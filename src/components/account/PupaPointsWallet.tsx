import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PointTransaction } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

export function PupaPointsWallet() {
  const { user, profile } = useAuthStore();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchTransactions() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'pointTransactions'), 
          where('userId', '==', user.uid), 
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const fetched: PointTransaction[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as PointTransaction);
        });
        setTransactions(fetched);
      } catch (error) {
        console.error("Error fetching point transactions:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, [user]);

  const earned = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const spent = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return (
    <div className="bg-pupa-dark-gray border border-white/5 p-8 mt-6">
      <div className="flex justify-between items-end mb-8">
        <div>
           <h2 className="font-heading font-bold text-3xl text-white tracking-widest">{profile?.points || 0}</h2>
           <span className="text-[10px] text-pupa-neon font-heading tracking-widest uppercase block mt-1">PUPA POINTS</span>
        </div>
        <div className="text-right">
           <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">Seu movimento está evoluindo.</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-pupa-graphite border border-white/5 p-4">
           <span className="text-[9px] text-gray-500 font-heading tracking-widest block mb-1 uppercase">GANHOS RECENTES</span>
           <span className="font-body text-green-500 font-bold">+{earned}</span>
        </div>
        <div className="bg-pupa-graphite border border-white/5 p-4">
           <span className="text-[9px] text-gray-500 font-heading tracking-widest block mb-1 uppercase">UTILIZADOS RECENTES</span>
           <span className="font-body text-red-500 font-bold">{spent}</span>
        </div>
      </div>

      <h3 className="font-heading font-bold text-sm text-white mb-4 tracking-widest uppercase">Histórico de Pontos</h3>
      
      {loading ? (
         <div className="text-[10px] text-gray-500 font-heading tracking-widest uppercase animate-pulse">CARREGANDO HISTÓRICO...</div>
      ) : transactions.length === 0 ? (
         <div className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">NENHUMA MOVIMENTAÇÃO ENCONTRADA.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map(tx => (
            <div key={tx.id} className="flex justify-between items-center bg-pupa-graphite border border-white/5 p-4">
               <div>
                  <span className="text-[10px] text-gray-400 font-heading tracking-widest uppercase block mb-1">{tx.description}</span>
                  <span className="text-[9px] text-gray-600 font-heading uppercase">{new Date(tx.createdAt).toLocaleDateString('pt-BR')}</span>
               </div>
               <span className={`font-body font-bold text-sm ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                 {tx.amount > 0 ? '+' : ''}{tx.amount}
               </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
