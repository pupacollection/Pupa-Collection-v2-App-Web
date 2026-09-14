import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Reward, Redemption } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { getLevelInfo } from '../../lib/levels';
import { ShieldAlert, Zap, Box, Lock, CheckCircle2, AlertTriangle, Fingerprint } from 'lucide-react';

export function RewardsTerminal() {
  const { user, profile } = useAuthStore();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Record<string, Redemption>>({});
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const rQ = query(collection(db, 'rewards'), where('active', '==', true));
        const rSnap = await getDocs(rQ);
        const fetchedRewards = rSnap.docs.map(d => ({ id: d.id, ...d.data() } as Reward));
        setRewards(fetchedRewards);

        if (user) {
           const redQ = query(collection(db, 'redemptions'), where('userId', '==', user.uid));
           const redSnap = await getDocs(redQ);
           const reds: Record<string, Redemption> = {};
           redSnap.forEach(d => { 
              const data = d.data() as Redemption;
              reds[data.rewardId] = data; 
           });
           setRedemptions(reds);
        }
      } catch (err) {
        console.error("Error fetching rewards", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleRedeem = async (reward: Reward) => {
    if (!user || !profile) return;
    setRedeeming(reward.id);
    setError(null);
    setSuccess(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const token = await user.getIdToken();
      
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rewardId: reward.id, idempotencyKey })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao resgatar recompensa');
      
      setSuccess(`Recompensa resgatada com sucesso! Saldo restante: ${data.newBalance} PTS`);
      setRedemptions(prev => ({ 
        ...prev, 
        [reward.id]: data.redemption || { 
           id: 'cached', 
           userId: user.uid, 
           rewardId: reward.id, 
           pointsCost: reward.pointsCost, 
           status: 'CONFIRMED', 
           idempotencyKey, 
           createdAt: new Date().toISOString() 
        } 
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRedeeming(null);
      setTimeout(() => { setError(null); setSuccess(null); }, 5000);
    }
  };

  if (!user || !profile) return null;
  const userPoints = profile.points || 0;
  const userLevelOrder = getLevelInfo(userPoints).currentLevel.order;

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <Zap className="w-5 h-5 text-pupa-neon" />
        <h2 className="text-lg font-heading font-bold text-white tracking-widest uppercase">TERMINAL DE RECOMPENSAS</h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 mb-6 flex items-center gap-3 text-red-500 text-xs font-heading tracking-widest uppercase">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-pupa-neon/10 border border-pupa-neon/50 p-4 mb-6 flex items-center gap-3 text-pupa-neon text-xs font-heading tracking-widest uppercase">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-[10px] text-gray-500 font-heading tracking-widest uppercase animate-pulse">Sincronizando Terminal...</div>
      ) : rewards.length === 0 ? (
        <div className="border border-white/5 bg-black p-8 text-center text-[10px] text-gray-500 font-heading tracking-widest uppercase">
           Nenhuma recompensa ativa no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => {
            const isRedeemed = !!redemptions[reward.id];
            const hasPoints = userPoints >= reward.pointsCost;
            const hasLevel = !reward.requiredLevel || userLevelOrder >= reward.requiredLevel;
            const hasStock = reward.unlimited || (reward.stock && reward.stock > 0);
            
            // Can redeem if they have points, level, stock, and if it's oneTimePerUser they haven't redeemed yet.
            const canRedeem = hasPoints && hasLevel && hasStock && (!reward.oneTimePerUser || !isRedeemed);
            const isUnlocking = redeeming === reward.id;

            return (
              <div key={reward.id} className={`border p-6 relative flex flex-col ${
                isRedeemed ? 'bg-pupa-dark-gray border-white/20' : 
                isUnlocking ? 'bg-pupa-graphite border-pupa-neon/50 animate-pulse' : 
                'bg-black border-white/10 hover:border-white/30 transition-colors'
              }`}>
                
                {isUnlocking && (
                   <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
                      <Fingerprint className="w-8 h-8 text-pupa-neon animate-pulse mb-3" />
                      <span className="text-pupa-neon font-heading font-bold tracking-widest text-[10px] uppercase animate-pulse">
                        VALIDATING ACCESS...
                      </span>
                   </div>
                )}

                <div className="flex justify-between items-start mb-4">
                   <span className="text-[8px] font-heading font-bold tracking-widest uppercase bg-white/10 px-2 py-1 text-white">
                     {reward.type.replace('_', ' ')}
                   </span>
                   <span className={`text-[10px] font-heading font-bold tracking-widest uppercase ${hasPoints && !isRedeemed ? 'text-pupa-neon' : 'text-gray-500'}`}>
                     {reward.pointsCost} PTS
                   </span>
                </div>
                
                <h3 className="font-heading font-bold text-white tracking-widest uppercase text-sm mb-2">{reward.title}</h3>
                <p className="text-[10px] text-gray-400 font-body uppercase tracking-widest mb-6 flex-grow">{reward.description}</p>
                
                <div className="space-y-2 mb-6">
                   {!hasLevel && reward.requiredLevel && (
                     <div className="flex items-center gap-2 text-[8px] text-red-500 font-heading tracking-widest uppercase">
                       <Lock className="w-3 h-3" /> REQUER NÍVEL {reward.requiredLevel}
                     </div>
                   )}
                   {!reward.unlimited && (
                     <div className="flex items-center gap-2 text-[8px] text-gray-500 font-heading tracking-widest uppercase">
                       <Box className="w-3 h-3" /> ESTOQUE: {reward.stock} UNIDADES
                     </div>
                   )}
                </div>

                <button
                  onClick={() => canRedeem && handleRedeem(reward)}
                  disabled={!canRedeem || isUnlocking}
                  className={`w-full py-3 text-[10px] font-heading font-bold tracking-widest uppercase transition-all ${
                    isRedeemed && reward.oneTimePerUser ? 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed' :
                    !hasStock ? 'bg-red-500/10 text-red-500 border border-red-500/30 cursor-not-allowed' :
                    canRedeem ? 'bg-transparent text-pupa-neon border border-pupa-neon hover:bg-pupa-neon hover:text-black shadow-[0_0_10px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]' :
                    'bg-transparent text-gray-600 border border-gray-800 cursor-not-allowed'
                  }`}
                >
                  {isRedeemed && reward.oneTimePerUser ? 'RESGATADO' : 
                   !hasStock ? 'ESGOTADO' : 
                   canRedeem ? 'RESGATAR' : 
                   !hasPoints ? 'PONTOS INSUFICIENTES' : 'NÍVEL INSUFICIENTE'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
