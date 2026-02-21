'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to handle PWA install prompt
 * Detects when user can install the app and manages the install flow
 */
export function useInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App is already installed');
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('📱 Install prompt available');
      e.preventDefault();
      setPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ App installed successfully');
      setIsInstallable(false);
      setIsInstalled(true);
      setPrompt(null);
    };

    // Listen for display mode changes
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      console.log('📱 Display mode changed:', e.matches);
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', handleDisplayModeChange);

    // Cleanup
    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      window
        .matchMedia('(display-mode: standalone)')
        .removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const install = async () => {
    if (!prompt) {
      console.warn('⚠️ Install prompt not available');
      return;
    }

    console.log('▶️ Showing install prompt...');

    try {
      // Show the prompt
      await prompt.prompt();

      // Wait for user response
      const { outcome } = await prompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ User accepted install prompt');
        setIsInstallable(false);
        setPrompt(null);

        // Show success message
        return true;
      } else {
        console.log('❌ User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
      return false;
    }
  };

  const dismiss = () => {
    console.log('✕ Dismissing install prompt');
    setIsInstallable(false);
    setPrompt(null);
  };

  return {
    isInstallable,
    isInstalled,
    install,
    dismiss,
    prompt,
  };
}
