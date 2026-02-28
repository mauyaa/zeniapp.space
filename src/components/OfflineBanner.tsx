import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { network } from '../lib/enhanced-api';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const removeOffline = network.addOfflineListener(() => setIsOffline(true));
    const removeOnline = network.addOnlineListener(() => setIsOffline(false));
    return () => {
      removeOffline();
      removeOnline();
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2 text-sm font-medium shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
      <span>You're offline. Some actions may be unavailable. We'll retry when you're back online.</span>
    </div>
  );
}
