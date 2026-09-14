import React from 'react';
import { Trophy, Star, Shield, Package, Zap, Crown } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { getLevelInfo } from '../../lib/levels';

export const TROPHY_DICTIONARY = [
  { id: 'first_purchase', name: 'FIRST PURCHASE', description: 'Realizou a primeira compra oficial.', icon: Package },
  { id: 'first_drop', name: 'FIRST DROP', description: 'Participou do primeiro drop da marca.', icon: Trophy },
  { id: 'pupa_member', name: 'PUPA MEMBER', description: 'O início de tudo. Cadastro concluído.', icon: Shield },
  { id: 'drop_hunter', name: 'DROP HUNTER', description: 'Adquiriu itens de drops limitados.', icon: Zap },
  { id: 'inner_access', name: 'INNER ACCESS', description: 'Chegou ao nível INNER.', icon: Star },
  { id: 'pupa_og', name: 'PUPA OG', description: 'Participou desde as fundações do movimento.', icon: Crown },
];

export function PupaTrophies() {
  const { profile } = useAuthStore();
  
  // Deriving trophies for visual purpose in this version, ideally these come from DB
  const level = profile ? getLevelInfo(profile.points).currentLevel.name : 'SIGNAL';
  const hasPurchased = (profile?.points || 0) > 0;
  
  const unlockedTrophies = profile?.trophies ? [...profile.trophies] : [];
  
  // Auto-award some based on state if not present
  if (!unlockedTrophies.find(t => t.trophyId === 'pupa_member')) {
    unlockedTrophies.push({ trophyId: 'pupa_member', unlockedAt: profile?.createdAt || new Date().toISOString() });
  }

  if ((level === 'INNER' || level === 'INNER CIRCLE') && !unlockedTrophies.find(t => t.trophyId === 'inner_access')) {
    unlockedTrophies.push({ trophyId: 'inner_access', unlockedAt: new Date().toISOString() });
  }
  
  // Notice we now rely on DB trophies for purchases (like first_purchase, first_drop) 
  // but if we want retroactive mock for older users, we can keep the hasPurchased block for testing
  if (hasPurchased && !unlockedTrophies.find(t => t.trophyId === 'first_purchase')) {
     unlockedTrophies.push({ trophyId: 'first_purchase', unlockedAt: new Date().toISOString() });
     unlockedTrophies.push({ trophyId: 'first_drop', unlockedAt: new Date().toISOString() });
  }

  return (
    <div className="bg-pupa-dark-gray border border-white/5 p-8 mt-6">
      <h3 className="font-heading font-bold text-sm text-white mb-6 tracking-widest uppercase">Meus Troféus</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {TROPHY_DICTIONARY.map(trophyConfig => {
          const unlocked = unlockedTrophies.find(t => t.trophyId === trophyConfig.id);
          const Icon = trophyConfig.icon;
          
          return (
            <div 
              key={trophyConfig.id} 
              className={`aspect-square p-4 flex flex-col items-center justify-center text-center border transition-all ${
                unlocked 
                  ? 'bg-pupa-graphite border-pupa-neon/30 text-white' 
                  : 'bg-transparent border-white/5 text-gray-600 opacity-50'
              }`}
            >
              <Icon className={`w-8 h-8 mb-4 ${unlocked ? 'text-pupa-neon' : 'text-gray-600'}`} />
              <span className="text-[9px] font-heading font-bold tracking-widest uppercase block mb-1">
                {trophyConfig.name}
              </span>
              <span className="text-[8px] font-body uppercase leading-tight hidden sm:block opacity-70">
                {trophyConfig.description}
              </span>
              {unlocked && (
                <span className="text-[7px] text-gray-400 font-heading tracking-widest uppercase mt-2">
                  {new Date(unlocked.unlockedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
