import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, setDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Drop, Product, ProductVariant, SecretContent } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getLevelInfo } from '../lib/levels';
import { Lock, Unlock, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import CommunityDiscussion from '../components/community/CommunityDiscussion';

export default function DropPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  
  const [drop, setDrop] = useState<Drop | null>(null);
  const [products, setProducts] = useState<(Product & { variants: ProductVariant[] })[]>([]);
  const [secretContent, setSecretContent] = useState<SecretContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedSecrets, setUnlockedSecrets] = useState<Record<string, boolean>>({});
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [prevDrop, setPrevDrop] = useState<{slug: string, name: string} | null>(null);
  const [nextDrop, setNextDrop] = useState<{slug: string, name: string} | null>(null);

  useEffect(() => {
    async function fetchDrop() {
      if (!slug) return;
      try {
        const q = query(collection(db, 'drops'), where('slug', '==', slug));
        const snap = await getDocs(q);
        if (snap.empty) {
          setLoading(false);
          return; // not found
        }
        const dropData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Drop;
        setDrop(dropData);

        // Fetch products
        if (dropData.products && dropData.products.length > 0) {
           // naive fetch loop for MVP, in prod use 'in' query if < 10
           const prods = [];
           for (const pId of dropData.products) {
              const pDoc = await getDoc(doc(db, 'products', pId));
              if (pDoc.exists()) {
                 const pData = { id: pDoc.id, ...pDoc.data() } as Product;
                 const vQ = query(collection(db, 'productVariants'), where('productId', '==', pId));
                 const vSnap = await getDocs(vQ);
                 const variants = vSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProductVariant));
                 prods.push({ ...pData, variants });
              }
           }
           setProducts(prods);
        }

        // Fetch secret contents associated with this drop
        const scQ = query(collection(db, 'secretContent'), where('dropId', '==', dropData.id));
        const scSnap = await getDocs(scQ);
        const secrets = scSnap.docs.map(d => ({ id: d.id, ...d.data() } as SecretContent));
        setSecretContent(secrets);
        
        // Fetch unlocks if user logged in
        if (user) {
           const unQ = query(collection(db, 'userUnlocks'), where('userId', '==', user.uid));
           const unSnap = await getDocs(unQ);
           const unlocks: Record<string, boolean> = {};
           unSnap.forEach(d => { unlocks[d.data().contentId] = true; });
           setUnlockedSecrets(unlocks);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrop();
  }, [slug, user]);

  const handleUnlock = async (content: SecretContent) => {
    if (!user || !profile) return;
    
    // Check requirements on client side first (backend will also validate)
    const userPoints = profile.points || 0;
    const userLevel = getLevelInfo(userPoints).currentLevel;
    
    if (content.requiredPoints && userPoints < content.requiredPoints) return;
    if (content.requiredLevel && userLevel.order < content.requiredLevel) return;
    
    // Cinematic animation state
    setUnlocking(content.id);
    
    setTimeout(async () => {
       try {
         const token = await user.getIdToken();
         const res = await fetch('/api/unlock', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ contentId: content.id })
         });
         
         const data = await res.json();
         if (!res.ok) {
            throw new Error(data.error || 'Failed to unlock');
         }
         
         setUnlockedSecrets(prev => ({ ...prev, [content.id]: true }));
         
         // Note: profile will automatically update if we are listening to snapshot in AuthStore,
         // or user will see it on refresh if not. The store listener handles realtime profile updates.
       } catch (err) {
         console.error("Unlock error", err);
       } finally {
         setUnlocking(null);
       }
    }, 2500); // 2.5s cinematic delay
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex items-center justify-center">
        <div className="text-[10px] text-gray-500 font-heading tracking-widest uppercase animate-pulse">ACESSANDO REDE...</div>
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-heading font-bold text-white tracking-widest uppercase mb-4">DROP NÃO ENCONTRADO</h1>
        <Link to="/store" className="text-[10px] text-pupa-neon font-heading tracking-widest uppercase border border-pupa-neon/30 px-6 py-3 hover:bg-pupa-neon/10 transition-colors">
          VOLTAR AOS DROPS
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black pb-20">
      {/* Hero Section */}
      <div className="relative w-full h-[70vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/10">
         {drop.heroImage ? (
           <img src={drop.heroImage} alt={drop.name} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" />
         ) : (
           <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_80%)]"></div>
         )}
         <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black"></div>
         
         <div className="relative z-10 text-center px-6 mt-16">
            <span className="text-[10px] text-pupa-neon font-heading tracking-widest uppercase block mb-4">
              {drop.limited && "EDIÇÃO LIMITADA • "}
              {drop.noRestock && "SEM REPOSIÇÃO • "}
              {drop.status}
            </span>
            <h1 className="text-4xl md:text-7xl font-heading font-bold text-white tracking-widest uppercase mb-2">
              {drop.title || drop.name}
            </h1>
            <p className="text-xs md:text-sm text-gray-400 font-body uppercase tracking-widest max-w-xl mx-auto mt-6">
              "MAIS QUE ROUPA. UMA CULTURA EM MOVIMENTO."
            </p>
         </div>
      </div>

      {/* Manifesto */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center border-b border-white/5">
        <h2 className="text-xs text-gray-500 font-heading tracking-widest uppercase mb-8">MANIFESTO</h2>
        {drop.manifesto ? (
          <div className="text-sm md:text-base text-gray-300 font-body leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
            {drop.manifesto}
          </div>
        ) : (
          <div className="text-sm text-gray-600 font-body uppercase tracking-widest">MANIFESTO EM BREVE.</div>
        )}
      </div>

      {/* Produtos */}
      {products.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-xl font-heading font-bold text-white tracking-widest uppercase mb-8 text-center">PEÇAS DO DROP</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {products.map(product => {
                const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
                const hasPromo = product.promoPrice && product.promoPrice < product.price;
                const price = hasPromo ? product.promoPrice! : product.price;
                const pointsEarned = Math.floor(price * 10);

                return (
                  <Link key={product.id} to={`/product/${product.id}`} className="group bg-pupa-dark-gray border border-white/5 flex flex-col md:flex-row hover:border-white/20 transition-all">
                    <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-pupa-graphite relative overflow-hidden">
                       {/* Main Image placeholder or actual */}
                       <div className="absolute inset-0 bg-white/5 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    <div className="p-6 md:w-1/2 flex flex-col justify-between">
                       <div>
                         <span className="text-[9px] text-gray-500 font-heading tracking-widest uppercase mb-2 block">
                           {totalStock > 0 ? (totalStock < 10 ? 'ÚLTIMAS PEÇAS' : 'DISPONÍVEL') : 'ESGOTADO'}
                         </span>
                         <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider mb-2">{product.name}</h3>
                         <p className="text-[10px] text-gray-400 font-body uppercase tracking-widest line-clamp-2 mb-4">{product.description}</p>
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                            {hasPromo && <span className="text-xs text-gray-500 line-through">R$ {product.price.toFixed(2)}</span>}
                            <span className="font-heading font-bold text-white">R$ {price.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-pupa-neon font-heading tracking-widest uppercase mb-4">
                            <ShieldCheck className="w-3 h-3" />
                            GANHE {pointsEarned} PUPA POINTS
                          </div>
                          <div className="w-full py-3 bg-white text-black text-center font-heading font-bold text-[10px] tracking-widest uppercase group-hover:bg-gray-200 transition-colors">
                            VER PRODUTO
                          </div>
                       </div>
                    </div>
                  </Link>
                );
             })}
          </div>
        </div>
      )}

      {/* Secret Content Section */}
      {secretContent.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-xl font-heading font-bold text-white tracking-widest uppercase mb-2">ARQUIVOS CONFIDENCIAIS</h2>
            <p className="text-[10px] text-gray-500 font-body uppercase tracking-widest">DESBLOQUEIE FRAGMENTOS DO PUPAVERSO.</p>
          </div>

          <div className="flex flex-col gap-6">
            {secretContent.map(content => {
              const isUnlocked = unlockedSecrets[content.id];
              const isUnlocking = unlocking === content.id;
              
              // Validation
              const userPoints = profile?.points || 0;
              const userLevel = profile ? getLevelInfo(userPoints).currentLevel.order : 0;
              
              const canUnlock = user && (
                (!content.requiredPoints || userPoints >= content.requiredPoints) &&
                (!content.requiredLevel || userLevel >= content.requiredLevel)
              );

              return (
                <div key={content.id} className={`border p-6 md:p-8 transition-all relative overflow-hidden ${
                  isUnlocked ? 'bg-pupa-dark-gray border-pupa-neon/30' : 
                  isUnlocking ? 'bg-pupa-graphite border-white/50 animate-pulse' :
                  'bg-black border-white/10 opacity-70'
                }`}>
                  
                  {isUnlocking && (
                     <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="w-full h-1 bg-pupa-neon/20 absolute top-1/2 -translate-y-1/2 animate-scan"></div>
                        <span className="text-pupa-neon font-heading font-bold tracking-widest text-sm uppercase animate-pulse">
                          DECODIFICANDO ACESSO...
                        </span>
                     </div>
                  )}

                  {!isUnlocked && !isUnlocking && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pupa-graphite border border-white/5 flex items-center justify-center">
                           <Lock className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                           <h3 className="font-heading font-bold text-white tracking-widest uppercase text-sm mb-1">ACESSO BLOQUEADO</h3>
                           <p className="text-[9px] text-gray-500 font-body uppercase tracking-widest">
                             {content.requiredLevel ? `REQUER NÍVEL ${content.requiredLevel}` : ''}
                             {content.requiredLevel && content.requiredPoints ? ' OU ' : ''}
                             {content.requiredPoints ? `REQUER ${content.requiredPoints} PTS` : ''}
                           </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => canUnlock && handleUnlock(content)}
                        disabled={!canUnlock || isUnlocking}
                        className={`py-3 px-6 text-[10px] font-heading font-bold tracking-widest uppercase transition-colors border ${
                          canUnlock 
                            ? 'bg-transparent text-white border-white/30 hover:border-white hover:bg-white/5' 
                            : 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'
                        }`}
                      >
                        {canUnlock ? 'TENTAR DESBLOQUEIO' : 'EVOLUA PARA DESBLOQUEAR'}
                      </button>
                    </div>
                  )}

                  {isUnlocked && !isUnlocking && (
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                        <div className="w-12 h-12 bg-pupa-neon/10 border border-pupa-neon/30 flex items-center justify-center">
                           <Unlock className="w-5 h-5 text-pupa-neon" />
                        </div>
                        <div>
                           <h3 className="font-heading font-bold text-pupa-neon tracking-widest uppercase text-sm mb-1">ACESSO LIBERADO</h3>
                           <p className="text-[9px] text-gray-400 font-body uppercase tracking-widest">VOCÊ DESBLOQUEOU UM NOVO FRAGMENTO DO PUPAVERSO.</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-heading font-bold text-white tracking-widest uppercase mb-4">{content.title}</h4>
                        <div className="text-sm text-gray-300 font-body leading-relaxed whitespace-pre-line mb-6">
                          {content.description}
                        </div>
                        {content.assetUrl && (
                          <div className="w-full aspect-video bg-black border border-white/10 relative overflow-hidden">
                             {/* Assuming it's an image for now, can be conditionally rendered based on type later */}
                             <img src={content.assetUrl} alt="Secret Content" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Community Discussion Section */}
      <div className="max-w-4xl mx-auto px-6 py-16 border-t border-white/10 mt-16">
        <div className="text-center mb-12">
          <h2 className="text-xl font-heading font-bold text-white tracking-widest uppercase mb-2">COMMUNITY DISCUSSION</h2>
          <p className="text-[10px] text-gray-500 font-body uppercase tracking-widest">O QUE ESSE DROP REPRESENTA PARA VOCÊ?</p>
        </div>
        <CommunityDiscussion dropId={drop.id} dropName={drop.name} />
      </div>
    </div>
  );
}
