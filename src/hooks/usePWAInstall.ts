import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Detect dismissed state
    if (localStorage.getItem('pupa_install_dismissed') === 'true') {
      setIsDismissed(true);
    }

    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    setIsInstalled(isStandalone);

    // Detect iOS devices (Safari/iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      // Analytics: install_completed
      console.log('[Analytics] install_completed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      // If we don't have a prompt (e.g. not supported, already installed, or iOS)
      return false;
    }
    
    // Analytics: install_started
    console.log('[Analytics] install_started');
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const dismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pupa_install_dismissed', 'true');
    // Analytics: install_prompt_dismissed
    console.log('[Analytics] install_prompt_dismissed');
  };

  const showPrompt = () => {
    // Determine if we should show the prompt globally (for the banner)
    if (isInstalled || isDismissed) return false;
    if (isIOS || deferredPrompt) return true;
    // Fallback for desktop/android without beforeinstallprompt event support (rare but happens)
    return true; // We can show manual instructions
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isDismissed,
    install,
    dismiss,
    showPrompt: showPrompt()
  };
}
