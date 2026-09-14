import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import MobileNav from './MobileNav';
import { PupaInstallPrompt } from '../pwa/PupaInstallPrompt';

export default function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 w-full max-w-[1440px] mx-auto pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      <PupaInstallPrompt />
    </div>
  );
}
