import React, { useEffect, useState } from 'react';
import { Fingerprint, Zap, Shield, Sparkles, Map, ChevronRight, Lock, Unlock, Crosshair } from 'lucide-react';
import { RewardsTerminal } from '../components/pupaverso/RewardsTerminal';

import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Drop, SecretContent } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getLevelInfo } from '../lib/levels';

export default function PupaVerso() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  
  const [drops, setDrops] = useState<Drop[]>([]);
  const [unlockedSecretsCount, setUnlockedSecretsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPupaVersoData() {
      try {
        const q = query(collection(db, 'drops'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const dropsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Drop));
        setDrops(dropsData);
        
        if (user) {
           const unlocksQ = query(collection(db, 'userUnlocks'), where('userId', '==', user.uid));
           const unSnap = await getDocs(unlocksQ);
           setUnlockedSecretsCount(unSnap.size);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPupaVersoData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-heading text-pupa-neon uppercase tracking-widest text-xs animate-pulse">
        Sincronizando PupaVerso...
      </div>
    );
  }

  const points = profile?.points || 0;
  const { currentLevel, nextLevel, pointsToNext, progressPercent } = getLevelInfo(points);
  const trophies = profile?.trophies || [];
  
  // Calculate completed drops (drops where the user has at least one unlock or bought a product - simplified to drops with an unlock for now)
  // Actually, we can just visually map them
  
  return (
    <div className="min-h-screen bg-black pt-28 pb-20 font-body relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.03)_0%,transparent_50%)] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Pupa ID / User Progression (Visually distinct from Account, focused on Universe Identity) */}
        {user && profile ? (
          <div className="mb-16 border border-white/10 bg-pupa-dark-gray/50 backdrop-blur-md p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-pupa-neon shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
               <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-black border border-pupa-neon/30 flex items-center justify-center relative overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                   {profile.avatar ? (
                     <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover grayscale opacity-80" />
                   ) : (
                     <Fingerprint className="w-10 h-10 text-pupa-neon/60" />
                   )}
                   <div className="absolute inset-0 bg-pupa-neon/5 animate-pulse"></div>
                 </div>
                 
                 <div>
                   <h2 className="font-heading font-bold text-2xl text-white tracking-widest uppercase mb-1">
                     {profile.displayName || profile.username}
                   </h2>
                   <div className="flex items-center gap-4 text-xs font-heading tracking-widest uppercase text-gray-400">
                     <span className="text-pupa-neon">ID: {profile.pupaId}</span>
                     <span>{currentLevel.name}</span>
                   </div>
                 </div>
               </div>
               
               <div className="flex-1 w-full md:w-auto md:max-w-md">
                 <div className="flex justify-between text-[10px] font-heading font-bold uppercase tracking-widest mb-2 text-gray-400">
                   <span>XP / PUPA POINTS</span>
                   <span className="text-pupa-neon">{points} PTS</span>
                 </div>
                 <div className="w-full h-1 bg-black border border-white/10 relative overflow-hidden mb-2">
                   <div 
                     className="absolute top-0 left-0 h-full bg-pupa-neon shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all duration-1000"
                     style={{ width: `${progressPercent}%` }}
                   ></div>
                 </div>
                 {nextLevel ? (
                   <p className="text-[9px] font-body uppercase text-gray-500 text-right">
                     +{pointsToNext} PTS PARA NÍVEL {nextLevel.name}
                   </p>
                 ) : (
                   <p className="text-[9px] font-body uppercase text-pupa-neon text-right">
                     NÍVEL MÁXIMO ATINGIDO
                   </p>
                 )}
               </div>
               
               <div className="flex gap-4 md:border-l border-white/10 md:pl-8">
                 <div className="text-center">
                   <div className="text-xl font-heading font-bold text-white">{trophies.length}</div>
                   <div className="text-[8px] font-heading tracking-widest uppercase text-gray-500">Troféus</div>
                 </div>
                 <div className="text-center">
                   <div className="text-xl font-heading font-bold text-white">{unlockedSecretsCount}</div>
                   <div className="text-[8px] font-heading tracking-widest uppercase text-gray-500">Unlocks</div>
                 </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="mb-16 border border-white/10 bg-black p-8 flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
               <h2 className="font-heading font-bold text-xl text-white tracking-widest uppercase mb-2">ACESSO NÃO IDENTIFICADO</h2>
               <p className="text-[10px] text-gray-500 font-body uppercase tracking-widest max-w-md">
                 Conecte-se para sincronizar seu Pupa ID e acompanhar seu progresso no universo.
               </p>
             </div>
             <Link to="/login" className="bg-white text-black font-heading font-bold text-[10px] px-6 py-3 uppercase tracking-widest hover:bg-gray-200 transition-colors">
               CONECTAR IDENTIDADE
             </Link>
          </div>
        )}

        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
          <Map className="w-5 h-5 text-pupa-neon" />
          <h2 className="text-lg font-heading font-bold text-white tracking-widest uppercase">DROP MAP / TIMELINE</h2>
        </div>

        {/* Cinematic Drops Timeline */}
        <div className="relative border-l border-white/10 ml-4 md:ml-8 space-y-12 pb-12">
           {drops.length === 0 ? (
             <div className="pl-8 text-gray-500 font-body text-xs uppercase tracking-widest">Nenhum Drop Detectado no Radar.</div>
           ) : (
             drops.map((drop, index) => {
                const isActive = drop.status === 'DISPONÍVEL' || drop.status === 'QUASE ESGOTADO';
                const isUpcoming = drop.status === 'EM BREVE';
                
                return (
                  <div key={drop.id} className="relative pl-8 md:pl-12 group">
                     {/* Timeline Node */}
                     <div className={`absolute top-0 -left-1.5 md:-left-2 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 ${
                        isActive ? 'bg-pupa-neon border-black shadow-[0_0_10px_rgba(0,240,255,0.8)]' : 
                        isUpcoming ? 'bg-black border-white animate-pulse' : 
                        'bg-black border-gray-600'
                     }`}></div>
                     
                     <div className={`grid grid-cols-1 md:grid-cols-5 gap-6 border transition-all duration-500 ${
                        isActive ? 'border-pupa-neon/30 bg-pupa-dark-gray/80 hover:border-pupa-neon/60 shadow-[0_0_30px_rgba(0,240,255,0.02)]' : 
                        isUpcoming ? 'border-white/20 bg-black hover:border-white/40' : 
                        'border-white/5 bg-black opacity-80 hover:opacity-100'
                     }`}>
                        {/* Drop Visual */}
                        <div className="md:col-span-2 aspect-video md:aspect-auto bg-pupa-graphite relative overflow-hidden">
                           {drop.heroImage || drop.coverImage ? (
                             <img src={drop.heroImage || drop.coverImage} alt={drop.name} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isActive ? 'group-hover:scale-105 opacity-90' : 'opacity-40 grayscale'}`} />
                           ) : (
                             <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,1)_0%,rgba(20,20,20,1)_100%)] flex items-center justify-center">
                               <Crosshair className={`w-8 h-8 ${isActive ? 'text-pupa-neon opacity-30' : 'text-gray-700'}`} />
                             </div>
                           )}
                           
                           {/* Overlay Status Badge */}
                           <div className="absolute top-4 left-4 bg-black/90 backdrop-blur px-3 py-1 text-[8px] font-heading font-bold tracking-widest uppercase border border-white/10 flex items-center gap-2">
                             {isActive && <div className="w-1.5 h-1.5 bg-pupa-neon rounded-full animate-pulse"></div>}
                             {isUpcoming && <Lock className="w-2.5 h-2.5 text-white" />}
                             <span className={isActive ? 'text-white' : 'text-gray-400'}>{drop.status}</span>
                           </div>
                        </div>
                        
                        {/* Drop Details */}
                        <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center">
                           <div className="text-[9px] text-gray-500 font-heading tracking-widest uppercase mb-2">
                             ID DO ARQUIVO: {drop.slug.toUpperCase()}
                           </div>
                           <h3 className={`text-2xl md:text-3xl font-heading font-bold tracking-widest uppercase mb-4 ${isActive ? 'text-white drop-shadow-md' : 'text-gray-400'}`}>
                             {drop.name}
                           </h3>
                           <p className="text-xs text-gray-400 font-body uppercase tracking-widest line-clamp-2 leading-relaxed mb-8 max-w-lg">
                             {drop.description}
                           </p>
                           
                           <div className="mt-auto">
                             <Link 
                               to={`/drop/${drop.slug}`} 
                               className={`inline-flex items-center gap-3 text-[10px] font-heading font-bold uppercase tracking-widest py-3 px-6 transition-all ${
                                 isActive 
                                   ? 'bg-pupa-neon text-black hover:bg-white hover:text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                                   : 'bg-white/10 text-white hover:bg-white hover:text-black'
                               }`}
                             >
                               {isUpcoming ? 'VER INTEL' : 'ACESSAR DROP'}
                               <ChevronRight className="w-4 h-4" />
                             </Link>
                           </div>
                        
        </div>
        
        {/* Pupa Rewards Terminal */}
        <RewardsTerminal />
      </div>
    </div>
  );
}
)
           )}
        </div>
      </div>
    </div>
  );
}
