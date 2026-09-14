import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function Home() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  return (
    <div className="w-full flex flex-col pt-0 md:pt-20">
      {/* Hero Section */}
      <section className="relative w-full h-[100dvh] md:h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden bg-pupa-off-black">
        {/* Background Image / Lighting */}
        <div className="absolute inset-0 z-0">
          {/* We'll use a placeholder structure for the character */}
          <div className="absolute inset-0 bg-gradient-to-t from-pupa-black via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.05)_0%,transparent_50%)] z-10" />
        </div>
        
        <div className="relative z-20 flex flex-col items-center text-center px-4 max-w-4xl mt-12 md:mt-0">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-7xl font-bold font-heading text-white tracking-tighter leading-[1.1] mb-6"
          >
            NASCIDA DO UNDERGROUND.<br />
            <span className="text-gray-400">FEITA PARA AS RUAS.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm md:text-base font-body text-gray-400 tracking-[0.2em] uppercase mb-10"
          >
            MAIS QUE ROUPA. UMA CULTURA EM MOVIMENTO.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link to="/pupaverso" className="px-8 py-4 bg-white text-black font-heading font-bold tracking-widest text-sm hover:bg-gray-200 transition-colors w-full sm:w-auto text-center">
              ENTRAR NO MOVIMENTO
            </Link>
            <Link to="/store" className="px-8 py-4 border border-white/20 text-white font-heading font-bold tracking-widest text-sm hover:bg-white/5 transition-colors w-full sm:w-auto text-center">
              EXPLORAR O DROP
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Next Drop Section */}
      <section className="w-full py-24 px-6 md:px-12 bg-pupa-black flex flex-col items-center border-t border-white/5">
        <h2 className="text-xl md:text-2xl font-heading text-white tracking-widest mb-12 text-center uppercase">
          O próximo drop está chegando.
        </h2>
        <div className="flex gap-4 md:gap-8">
          {[
            { label: 'DIAS', value: '07' },
            { label: 'HORAS', value: '12' },
            { label: 'MINS', value: '45' },
            { label: 'SEGS', value: '30' }
          ].map((time, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-3xl md:text-6xl font-heading font-bold text-white mb-2">{time.value}</span>
              <span className="text-[10px] md:text-xs font-heading tracking-widest text-gray-500">{time.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PWA Section */}
      {(!isInstalled && (isInstallable || isIOS)) && (
        <section className="w-full py-24 px-6 md:px-12 bg-pupa-dark-gray border-t border-white/5 flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-4xl font-heading font-bold text-white tracking-wider mb-4 uppercase">
            ENTRE PARA O MOVIMENTO
          </h2>
          <p className="text-sm text-gray-400 font-body mb-8 max-w-lg">
            Instale a PUPA COLLECTION e leve o universo PUPA com você. Uma experiência nativa, rápida e exclusiva.
          </p>
          {isInstallable && (
            <button 
              onClick={install}
              className="bg-white text-black font-heading font-bold px-8 py-4 tracking-widest hover:bg-gray-200 transition-colors uppercase"
            >
              INSTALAR
            </button>
          )}
          {isIOS && (
            <div className="text-[10px] text-gray-500 font-heading tracking-widest max-w-sm uppercase">
              NO IPHONE, USE O BOTÃO COMPARTILHAR DO SAFARI E SELECIONE "ADICIONAR À TELA DE INÍCIO" PARA INSTALAR.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
