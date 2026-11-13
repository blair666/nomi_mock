import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print mb-3 rounded-xl border border-[#EFE0C2] bg-[#FAF3E6] px-3.5 py-2.5 text-xs text-[#7D4A10] flex items-center gap-2"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline mode — cached data is shown, and Gemini chat requires a connection.</span>
    </div>
  );
};
