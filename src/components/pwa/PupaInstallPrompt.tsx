import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Share, PlusSquare, Download, X } from 'lucide-react';

export const PupaInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isDismissed, install, dismiss, showPrompt } = usePWAInstall();
  const [hasViewed, setHasViewed] = useState(false);

  useEffect(() => {
    if (showPrompt && !hasViewed) {
      console.log('[Analytics] install_prompt_viewed');
      setHasViewed(true);
    }
  }, [showPrompt, hasViewed]);

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-[380px] z-50 bg-pupa-dark-gray border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6 relative">
          <button 
            onClick={dismiss} 
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-pupa-graphite flex items-center justify-center rounded-sm">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-white tracking-widest text-sm uppercase">ENTRE PARA A PUPA</h3>
              <p className="text-[10px] font-heading tracking-widest text-pupa-neon uppercase">APP OFICIAL</p>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 font-body mb-6 leading-relaxed">
            Instale a PUPA COLLECTION no seu dispositivo e tenha uma experiência mais rápida, imersiva e exclusiva.
          </p>

          {isIOS ? (
            <div className="bg-pupa-black/50 border border-white/5 p-4 mb-4">
               <h4 className="font-heading font-bold text-[10px] text-white tracking-widest uppercase mb-3">INSTALE A PUPA NO SEU IPHONE</h4>
               <ol className="text-[11px] text-gray-400 font-body space-y-2">
                 <li className="flex items-center gap-2">
                   <span>1. Toque no botão Compartilhar</span>
                   <Share className="w-3 h-3 inline text-white" />
                 </li>
                 <li className="flex items-center gap-2">
                   <span>2. Escolha "Adicionar à Tela de Início"</span>
                   <PlusSquare className="w-3 h-3 inline text-white" />
                 </li>
                 <li>3. Toque em "Adicionar"</li>
               </ol>
            </div>
          ) : isInstallable ? (
            <button
              onClick={install}
              className="w-full bg-white text-black font-heading font-bold tracking-widest text-xs py-3 px-4 mb-3 hover:bg-gray-200 transition-colors uppercase active:scale-[0.98]"
            >
              INSTALAR PUPA
            </button>
          ) : (
            <div className="bg-pupa-black/50 border border-white/5 p-4 mb-4">
               <h4 className="font-heading font-bold text-[10px] text-white tracking-widest uppercase mb-3">COMO INSTALAR</h4>
               <ol className="text-[11px] text-gray-400 font-body space-y-2">
                 <li>1. Abra o menu do navegador</li>
                 <li>2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"</li>
                 <li>3. Confirme a instalação</li>
               </ol>
            </div>
          )}

          {!isInstallable && !isIOS && (
             <button
                onClick={dismiss}
                className="w-full text-center text-[10px] font-heading tracking-widest text-gray-500 hover:text-white transition-colors uppercase mt-2"
              >
                AGORA NÃO
              </button>
          )}

          {isInstallable && (
            <button
              onClick={dismiss}
              className="w-full text-center text-[10px] font-heading tracking-widest text-gray-500 hover:text-white transition-colors uppercase"
            >
              AGORA NÃO
            </button>
          )}
          
          {isIOS && (
             <button
              onClick={dismiss}
              className="w-full text-center text-[10px] font-heading tracking-widest text-gray-500 hover:text-white transition-colors uppercase"
            >
              AGORA NÃO
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
