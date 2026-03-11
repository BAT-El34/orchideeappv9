import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Lock, 
  Fingerprint, 
  User as UserIcon, 
  ArrowRight,
  Calculator,
  History,
  AlertCircle,
  Banknote,
  X
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User, type CashSession } from '../offline/dexie';
import { AutoFilterSelect } from '../components/AutoFilterSelect';
import { supabase } from '../lib/supabase';

import { BillingModule } from './BillingModule';

export const CashierModule = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const users = useLiveQuery(() => db.users.toArray());
  const activeSession = useLiveQuery(() => db.cash_sessions.where('status').equals('OPEN').first());
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (userData) setCurrentUser(userData);
      }
    };
    fetchUser();
  }, []);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'user' | 'pin'>('user');
  const [openingAmount, setOpeningAmount] = useState('0');
  const [showOpenModal, setShowOpenModal] = useState(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await db.users.get(selectedUserId);
    if (user && pin === '1234') { // In real app, we would hash and compare
      setShowOpenModal(true);
    } else {
      alert('PIN incorrect (Utilisez 1234 pour la démo)');
      setPin('');
    }
  };

  const handleOpenSession = async () => {
    if (!selectedUserId) return;
    
    const newSession: CashSession = {
      id: crypto.randomUUID(),
      entity_id: currentUser?.entity_id,
      cashier_id: selectedUserId,
      opening_amount: parseFloat(openingAmount),
      opened_at: new Date().toISOString(),
      status: 'OPEN'
    };

    await db.cash_sessions.add(newSession);
    await db.sync_queue.add({
      table_name: 'cash_sessions',
      operation: 'INSERT',
      payload: newSession,
      created_at: Date.now()
    });
    
    setShowOpenModal(false);
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    
    const updatedSession = {
      ...activeSession,
      status: 'CLOSED',
      closed_at: new Date().toISOString()
    };

    await db.cash_sessions.put(updatedSession);
    await db.sync_queue.add({
      table_name: 'cash_sessions',
      operation: 'UPDATE',
      payload: updatedSession,
      created_at: Date.now()
    });
  };

  if (!activeSession) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-sm border border-neutral-200 shadow-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-[#B45309]/10 text-[#B45309] rounded-full mb-4">
              <Wallet size={32} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Session de Caisse</h1>
            <p className="text-neutral-500 text-sm text-center mt-2">
              Veuillez vous identifier pour ouvrir la session
            </p>
          </div>

          {step === 'user' ? (
            <div className="space-y-6">
              <AutoFilterSelect 
                label="Sélectionner votre nom"
                options={users?.map(u => ({ id: u.id, label: u.full_name, sublabel: u.role })) || []}
                value={selectedUserId}
                onChange={setSelectedUserId}
                placeholder="Chercher votre nom..."
              />
              <button 
                disabled={!selectedUserId}
                onClick={() => setStep('pin')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <span>Continuer</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <label className="label-sm">Code PIN</label>
              <div className="input-icon-wrapper">
                <input 
                  autoFocus
                  type="password" 
                  maxLength={4}
                  className="input-field pl-11 text-center text-2xl tracking-[1em]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
                <Lock className="input-icon" size={18} />
              </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setStep('user')}
                  className="flex-1 px-4 py-2 border border-neutral-200 rounded-sm text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  Retour
                </button>
                <button 
                  type="submit"
                  disabled={pin.length < 4}
                  className="flex-1 btn-primary"
                >
                  Valider
                </button>
              </div>
            </form>
          )}
        </div>

        {showOpenModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-md p-6 rounded-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Ouverture de Caisse</h2>
                <button onClick={() => setShowOpenModal(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label-sm">Fond de caisse initial (FCFA)</label>
                  <div className="input-icon-wrapper">
                  <input 
                    type="number" 
                    className="input-field pl-11 text-xl font-mono"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                  />
                  <Banknote className="input-icon" size={18} />
                </div>
              </div>
              <button 
                  onClick={handleOpenSession}
                  className="btn-primary w-full py-3"
                >
                  Ouvrir la session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const sessionCashier = users?.find(u => u.id === activeSession.cashier_id);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caisse Active</h1>
          <p className="text-neutral-500 text-sm">Session ouverte par {sessionCashier?.full_name}</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-white border border-neutral-200 rounded-sm text-neutral-500 hover:text-[#B45309] transition-colors">
            <Calculator size={20} />
          </button>
          <button className="p-2 bg-white border border-neutral-200 rounded-sm text-neutral-500 hover:text-[#B45309] transition-colors">
            <History size={20} />
          </button>
          <button 
            onClick={handleCloseSession}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-sm text-sm font-bold uppercase tracking-wider"
          >
            Clôturer
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          <BillingModule />
        </div>
      </div>
    </div>
  );
};
