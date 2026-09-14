import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { getTotals } = useCartStore();

  const links = [
    { name: 'HOME', path: '/' },
    { name: 'STORE', path: '/store' },
    { name: 'PUPAVERSO', path: '/pupaverso' },
    { name: 'COMUNIDADE', path: '/community' },
  ];

  return (
    <header className="hidden md:flex fixed top-0 w-full z-50 bg-pupa-black/80 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between w-full max-w-[1440px] mx-auto px-8 h-20">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center">
             <span className="font-heading font-bold text-3xl tracking-widest text-white leading-none mt-1">PUPA<sup className="text-[12px] ml-1">®</sup></span>
          </div>
        </Link>
        
        <nav className="flex items-center gap-8">
          {links.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className={clsx(
                "font-heading text-sm font-medium tracking-[0.1em] transition-colors hover:text-white uppercase",
                location.pathname === link.path ? "text-white" : "text-gray-500"
              )}
            >
              {link.name}
            </Link>
          ))}
          <Link 
            to={user ? "/account" : "/login"}
            className={clsx(
              "font-heading text-sm font-medium tracking-[0.1em] transition-colors hover:text-white uppercase",
              location.pathname === (user ? "/account" : "/login") ? "text-white" : "text-gray-500"
            )}
          >
            MINHA CONTA
          </Link>
        </nav>
        
        <div className="flex items-center gap-6 text-gray-400">
          <button className="hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
          <Link to="/cart" className="hover:text-white transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            {getTotals().count > 0 && (
              <span className="absolute -top-2 -right-2 bg-pupa-neon text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {getTotals().count}
              </span>
            )}
          </Link>
          <Link to={user ? "/account" : "/login"} className="hover:text-white transition-colors"><User className="w-5 h-5" /></Link>
          <button className="flex items-center gap-2 text-xs font-heading font-bold tracking-widest border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition-colors ml-4">
            INSTALAR PWA
          </button>
        </div>
      </div>
    </header>
  );
}
