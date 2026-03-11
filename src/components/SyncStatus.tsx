import React, { useState, useEffect } from 'react';
import { RefreshCw, CloudOff, CloudCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export const SyncStatus = () => {
  const [state, setState] = useState<SyncState>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleSyncStart = () => setState('syncing');
    const handleSyncEnd = () => {
      setState('idle');
      setLastSync(new Date());
    };
    const handleSyncError = () => setState('error');
    const handleOffline = () => setState('offline');
    const handleOnline = () => setState('idle');

    window.addEventListener('sync-start', handleSyncStart);
    window.addEventListener('sync-end', handleSyncEnd);
    window.addEventListener('sync-error', handleSyncError);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) setState('offline');

    return () => {
      window.removeEventListener('sync-start', handleSyncStart);
      window.removeEventListener('sync-end', handleSyncEnd);
      window.removeEventListener('sync-error', handleSyncError);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 rounded-full shadow-sm">
      <div className="relative">
        <AnimatePresence mode="wait">
          {state === 'syncing' && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <RefreshCw size={14} className="text-[#B45309]" />
            </motion.div>
          )}
          {state === 'offline' && (
            <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CloudOff size={14} className="text-neutral-400" />
            </motion.div>
          )}
          {state === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AlertCircle size={14} className="text-red-500" />
            </motion.div>
          )}
          {(state === 'idle') && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CloudCheck size={14} className="text-emerald-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
          {state === 'syncing' ? 'Synchronisation...' : 
           state === 'offline' ? 'Hors ligne' : 
           state === 'error' ? 'Erreur Sync' : 'Connecté'}
        </span>
        {lastSync && state === 'idle' && (
          <span className="text-[8px] text-neutral-400 mt-0.5">
            Dernière sync: {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};
