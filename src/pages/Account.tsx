import { User, Trophy, Shield, Settings, History, Map, LogOut, Smartphone } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getLevelInfo } from '../lib/levels';
import { PupaPointsWallet } from '../components/account/PupaPointsWallet';
import { PupaTrophies } from '../components/account/PupaTrophies';

export default function Account() {
  const { profile, user } = useAuthStore();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen pt-32 px-6 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-heading text-white mb-6 tracking-widest uppercase">ACESSO NEGADO</h1>
        <Link to="/login" className="bg-white text-black font-heading font-bold px-8 py-4 tracking-widest uppercase">FAZER LOGIN</Link>
      </div>
    );
  }

  // Fallback defaults for missing profile info
  const points = profile?.points || 0;
  const pupaId = profile?.pupaId || 'N/A';
  const username = profile?.username || '@convidado';
  
  const { currentLevel, nextLevel, pointsToNext, progressPercent } = getLevelInfo(points);

  return (
    <div className="w-full min-h-screen pt-12 md:pt-32 px-6 md:px-12 pb-20">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl md:text-5xl font-heading font-bold text-white tracking-wider uppercase">PUPA // MINHA CONTA</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-heading font-bold tracking-widest hidden md:block uppercase">SAIR</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Profile Card */}
          <div className="bg-pupa-dark-gray border border-white/5 p-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-pupa-graphite border-2 border-pupa-neon/30 mb-6 flex items-center justify-center overflow-hidden relative">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-gray-500" />
              )}
            </div>
            
            <h2 className="font-heading font-bold text-xl text-white">{username}</h2>
            <p className="text-xs text-gray-400 font-body tracking-widest mt-1 mb-8 uppercase">PUPA ID: {pupaId}</p>
            
            <div className="w-full flex justify-between items-end mb-2">
              <span className="font-heading font-bold text-white uppercase">NÍVEL {currentLevel.name}</span>
              <span className="text-[10px] text-pupa-neon tracking-widest">{points} PTS</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-1 bg-pupa-graphite relative mb-4">
              <div 
                className="absolute top-0 left-0 h-full bg-pupa-neon shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="w-full text-right mb-8">
               <span className="text-[9px] text-gray-500 font-heading tracking-widest uppercase">{nextLevel ? `PRÓXIMO: ${nextLevel.name} (${pointsToNext} PTS)` : 'VOCÊ CHEGOU AO INNER CIRCLE'}</span>
            </div>
            
            <div className="w-full flex items-center justify-between border-t border-white/5 pt-6">
              <div className="flex flex-col items-center">
                <span className="font-heading font-bold text-lg text-white">{points}</span>
                <span className="text-[9px] tracking-widest text-gray-500 uppercase">PTS</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-heading font-bold text-lg text-white">0</span>
                <span className="text-[9px] tracking-widest text-gray-500 uppercase">DROPS</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-heading font-bold text-lg text-white">0</span>
                <span className="text-[9px] tracking-widest text-gray-500 uppercase">TROFÉUS</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link to="/account/orders" className="bg-pupa-dark-gray border border-white/5 hover:border-pupa-neon/50 p-6 flex flex-col items-center justify-center gap-4 transition-colors">
              <History className="w-6 h-6 text-pupa-neon" />
              <span className="text-[10px] font-heading font-bold tracking-widest text-white">MEUS PEDIDOS</span>
            </Link>
            {[
              { label: 'MEUS TROFÉUS', icon: Trophy, path: '/account/trophies' },
              { label: 'ENDEREÇOS', icon: Map, path: '/account/addresses' },
              { label: 'SEGURANÇA', icon: Shield, path: '/account/security' },
              { label: 'CONFIGURAÇÕES', icon: Settings, path: '/account/settings' },
            ].map((item, i) => (
              <button key={i} className="bg-pupa-dark-gray border border-white/5 hover:border-white/20 p-6 flex flex-col items-center justify-center gap-4 transition-colors">
                <item.icon className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] font-heading tracking-widest text-white">{item.label}</span>
              </button>
            ))}
          </div>
          
          <PupaPointsWallet />
          
          
          {/* Meu PupaVerso Panel */}
          <div className="bg-black border border-white/10 p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-pupa-neon/5 blur-3xl rounded-full"></div>
             <h3 className="font-heading font-bold text-xl text-white tracking-widest uppercase mb-2">SEU MOVIMENTO</h3>
             <p className="text-[10px] text-gray-500 font-body uppercase tracking-widest mb-8">NÍVEIS, DROPS E ACESSO AO PUPAVERSO.</p>
             
             <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                   <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-pupa-neon shadow-[0_0_8px_rgba(0,240,255,0.8)]"></div>
                      <span className="text-xs text-white font-heading tracking-widest uppercase">DROP 001 - PUPA ESSENTIAL</span>
                   </div>
                   <span className="text-[10px] text-gray-600 font-heading tracking-widest uppercase">🔒 EM BREVE</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-white/5 pb-4 opacity-50">
                   <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-gray-600"></div>
                      <span className="text-xs text-gray-400 font-heading tracking-widest uppercase">INNER CIRCLE</span>
                   </div>
                   <span className="text-[10px] text-gray-600 font-heading tracking-widest uppercase">BLOQUEADO</span>
                </div>
             </div>
             
             <Link to="/pupaverso" className="mt-8 inline-block text-[10px] text-pupa-neon font-heading font-bold tracking-widest uppercase hover:text-white transition-colors">
               EXPLORAR PUPAVERSO →
             </Link>
          </div>


          {/* PWA Section */}
          <div className="bg-pupa-dark-gray border border-white/5 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pupa-graphite flex items-center justify-center rounded-full border border-white/10">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-white tracking-widest uppercase mb-1">EXPERIÊNCIA PUPA</h3>
                <p className="text-[10px] text-gray-400 font-body max-w-sm uppercase">Tenha acesso rápido à sua conta, PUPA POINTS, troféus, Drops e comunidade.</p>
              </div>
            </div>
            
            {isInstalled ? (
              <div className="px-6 py-3 border border-pupa-neon/30 text-pupa-neon font-heading font-bold tracking-widest text-[10px] uppercase">
                ✓ PUPA INSTALADA
              </div>
            ) : isIOS ? (
              <div className="px-6 py-3 border border-white/20 text-gray-400 font-heading tracking-widest text-[10px] uppercase max-w-[200px] text-center">
                USE "ADICIONAR À TELA DE INÍCIO" NO COMPARTILHAR
              </div>
            ) : isInstallable ? (
              <button onClick={install} className="px-6 py-3 bg-white text-black font-heading font-bold tracking-widest text-[10px] hover:bg-gray-200 transition-colors uppercase">
                INSTALAR PUPA
              </button>
            ) : (
              <div className="px-6 py-3 border border-white/20 text-gray-400 font-heading tracking-widest text-[10px] uppercase max-w-[200px] text-center">
                INSTALE PELO MENU DO NAVEGADOR
              </div>
            )}
          </div>

          <PupaTrophies />
        </div>
      </div>
    </div>
  );
}
