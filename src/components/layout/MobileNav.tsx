import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Globe, Users, User, LogIn } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuthStore();

  const links = [
    { name: 'HOME', path: '/', icon: Home },
    { name: 'STORE', path: '/store', icon: ShoppingBag },
    { name: 'PUPAVERSO', path: '/pupaverso', icon: Globe },
    { name: 'COMUNIDADE', path: '/community', icon: Users },
    { name: user ? 'CONTA' : 'ENTRAR', path: user ? '/account' : '/login', icon: user ? User : LogIn },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 bg-pupa-black/95 backdrop-blur-xl border-t border-white/5 h-20 px-6 flex items-center justify-between pb-4">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.path;
        return (
          <Link 
            key={link.path} 
            to={link.path}
            className={clsx(
              "flex flex-col items-center gap-1.5 transition-colors",
              isActive ? "text-white" : "text-gray-500"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-heading tracking-widest">{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
