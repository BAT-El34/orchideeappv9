import React from 'react';
import { User, Mail, Shield, Building, LogOut, Calendar, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ProfileModule = () => {
  const [user, setUser] = useState<any>(null);
  const [entity, setEntity] = useState<any>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcValue, setCalcValue] = useState('');

  const calculate = (op: string) => {
    try {
      if (op === '=') {
        setCalcValue(eval(calcValue).toString());
      } else if (op === 'C') {
        setCalcValue('');
      } else {
        setCalcValue(prev => prev + op);
      }
    } catch (e) {
      setCalcValue('Erreur');
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser(userData || {
          full_name: session.user.user_metadata?.full_name || 'Utilisateur',
          email: session.user.email,
          role: 'vendeur',
          status: 'active'
        });

        if (userData?.entity_id) {
          const { data: entityData } = await supabase
            .from('entities')
            .select('*')
            .eq('id', userData.entity_id)
            .single();
          setEntity(entityData);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      localStorage.removeItem('orchidee_remember_me');
      localStorage.removeItem('orchidee_login_at');
      sessionStorage.removeItem('orchidee_session_active');
      window.location.href = '/';
    }
  };

  if (!user) return <div className="p-8 text-center text-neutral-500">Chargement du profil...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-2xl font-serif italic text-neutral-900">Mon Profil</h1>
        <p className="text-sm text-neutral-500">Informations de votre compte et de votre établissement</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
            <div className="h-24 bg-[#B45309]/10 border-b border-neutral-100" />
            <div className="px-8 pb-8">
              <div className="relative -mt-12 mb-6">
                <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                  <div className="w-full h-full rounded-full bg-[#B45309] flex items-center justify-center text-white">
                    <User size={40} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">{user.full_name}</h2>
                  <p className="text-neutral-500 flex items-center gap-2 mt-1">
                    <Mail size={14} />
                    {user.email}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-neutral-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Type de compte</label>
                    <div className="flex items-center gap-2 text-neutral-900 font-medium capitalize">
                      <Shield size={16} className="text-[#B45309]" />
                      {user.role?.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Statut</label>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-neutral-900 font-medium capitalize">{user.status || 'Actif'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Établissement</label>
                    <div className="flex items-center gap-2 text-neutral-900 font-medium">
                      <Building size={16} className="text-neutral-400" />
                      {entity?.name || 'Orchidée Nature (Défaut)'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Membre depuis</label>
                    <div className="flex items-center gap-2 text-neutral-900 font-medium">
                      <Calendar size={16} className="text-neutral-400" />
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Mars 2024'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-6 rounded-sm">
            <h3 className="text-amber-900 font-bold mb-2 flex items-center gap-2">
              <Shield size={18} />
              Sécurité du compte
            </h3>
            <p className="text-amber-800 text-sm mb-4">
              Votre compte est protégé par votre mot de passe Supabase. Pour changer votre mot de passe ou vos informations de connexion, veuillez contacter l'administrateur système.
            </p>
            <button className="text-amber-900 text-xs font-bold uppercase tracking-widest hover:underline">
              Changer mon mot de passe
            </button>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
            <h3 className="font-bold mb-4">Outils</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setShowCalculator(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors text-sm font-bold uppercase tracking-wider"
              >
                <Calculator size={18} />
                Calculatrice Commerciale
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-sm transition-colors text-sm font-bold uppercase tracking-wider"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showCalculator && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-neutral-900 p-6 rounded-2xl shadow-2xl w-full max-w-[320px]"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-bold text-sm uppercase tracking-widest">Calculatrice</h4>
                    <button onClick={() => setShowCalculator(false)} className="text-neutral-500 hover:text-white">
                      <LogOut size={18} className="rotate-180" />
                    </button>
                  </div>
                  <div className="bg-neutral-800 p-4 rounded-xl mb-4 text-right">
                    <div className="text-neutral-500 text-xs h-4 mb-1">Commercial Mode</div>
                    <div className="text-white text-3xl font-mono truncate">{calcValue || '0'}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['C', '/', '*', '-', '7', '8', '9', '+', '4', '5', '6', '=', '1', '2', '3', '0', '.'].map((btn) => (
                      <button
                        key={btn}
                        onClick={() => calculate(btn)}
                        className={cn(
                          "h-12 rounded-lg font-bold transition-colors",
                          btn === '=' ? "bg-[#B45309] text-white col-span-1 row-span-2 h-auto" :
                          ['/', '*', '-', '+', 'C'].includes(btn) ? "bg-neutral-700 text-[#B45309]" :
                          "bg-neutral-800 text-white hover:bg-neutral-700"
                        )}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
            <h3 className="font-bold mb-2 text-sm">Version du système</h3>
            <p className="text-xs text-neutral-400">Orchidée Nature POS v2.4.0-stable</p>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Développé pour Orchidée Nature. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
