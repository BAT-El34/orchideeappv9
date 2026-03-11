import React, { useState } from 'react';
import { ArrowRight, Flower2, AlertCircle, CheckCircle2, UserPlus, KeyRound, ArrowLeft, Mail, Lock as LockIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface LoginModuleProps {
  onToggleDebug: () => void;
  isDebug: boolean;
}

type View = 'login' | 'forgot-password' | 'request-account';

export const LoginModule: React.FC<LoginModuleProps> = ({ onToggleDebug, isDebug }) => {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState('vendeur');
  const [newPasswordDesired, setNewPasswordDesired] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  const roles = [
    { id: 'admin', label: 'Administrateur' },
    { id: 'manager', label: 'Manager' },
    { id: 'vendeur', label: 'Vendeur' },
    { id: 'caissier', label: 'Caissier' },
    { id: 'production', label: 'Production / Cuisine' },
    { id: 'agency', label: 'Gestionnaire Agence' },
    { id: 'treasury', label: 'Trésorerie' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt started for:', email);
    setLoading(true);
    setError(null);
    
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase n\'est pas configuré. Utilisez le mode débogage ou configurez les clés.');
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Auth response received:', { user: data?.user?.id, error: authError?.message });

      if (authError) throw authError;

      if (data.user) {
        // Handle "Stay logged in" logic
        if (rememberMe) {
          localStorage.setItem('orchidee_remember_me', 'true');
          localStorage.setItem('orchidee_login_at', Date.now().toString());
        } else {
          localStorage.removeItem('orchidee_remember_me');
          localStorage.removeItem('orchidee_login_at');
          // Mark session as active for this browser tab only
          sessionStorage.setItem('orchidee_session_active', 'true');
        }
        
        // We don't call onLogin here anymore, App.tsx will catch the SIGNED_IN event
        // and update the user state, which will unmount this component.
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          type: 'ALERT',
          message: `Demande de réinitialisation de mot de passe pour ${email}. Nouveau mot de passe souhaité : ${newPasswordDesired}`,
          to_role: 'super_admin',
          status: 'pending'
        }]);

      if (notifError) throw notifError;
      setSuccess('Votre demande a été envoyée au Super Administrateur.');
      setTimeout(() => {
        setView('login');
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de la demande.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          type: 'VALIDATION',
          message: `Nouvelle demande de compte : ${fullName} (${email}). Rôle souhaité : ${requestedRole}`,
          to_role: 'super_admin',
          status: 'pending'
        }]);

      if (notifError) throw notifError;
      setSuccess('Votre demande de création de compte a été envoyée.');
      setTimeout(() => {
        setView('login');
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de la demande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfaf7] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#B45309] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#B45309] blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-white/70 backdrop-blur-xl p-10 rounded-3xl border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="p-4 bg-stone-50 text-[#B45309] rounded-2xl shadow-sm border border-stone-100">
              <Flower2 size={40} strokeWidth={1.5} />
            </div>
          </motion.div>
          <h1 className="text-4xl font-serif italic text-stone-900 mb-2 tracking-tight">Orchidée</h1>
          <div className="flex items-center gap-3 w-full">
            <div className="h-[1px] flex-1 bg-stone-200" />
            <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-stone-400 whitespace-nowrap">
              Cosmétiques & Epices
            </p>
            <div className="h-[1px] flex-1 bg-stone-200" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isSupabaseConfigured && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 text-amber-700 text-xs leading-relaxed"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Configuration manquante</p>
                <p>Les clés Supabase ne sont pas configurées. Veuillez les ajouter dans les secrets de l'application (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY).</p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-xs leading-relaxed"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-600 text-xs leading-relaxed"
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <p>{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#B45309] transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50/50 border border-stone-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all placeholder:text-stone-300"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Mot de passe</label>
                <button 
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="text-[10px] font-bold text-[#B45309] hover:underline uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
                >
                  Oublié ?
                </button>
              </div>
              <div className="relative group">
                <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#B45309] transition-colors" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50/50 border border-stone-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all placeholder:text-stone-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-1">
              <input 
                type="checkbox" 
                id="rememberMe"
                className="w-4 h-4 rounded border-stone-200 text-[#B45309] focus:ring-[#B45309]/20 transition-all cursor-pointer"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe" className="text-[10px] font-bold uppercase tracking-wider text-stone-400 cursor-pointer select-none">
                Rester connecté (48h)
              </label>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-stone-800 active:scale-[0.98] transition-all shadow-lg shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button 
              type="button"
              onClick={onToggleDebug}
              className={`w-full py-3 border-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                isDebug 
                  ? "bg-amber-50 border-amber-200 text-amber-600" 
                  : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
              }`}
            >
              {isDebug ? "Désactiver Débogage" : "Mode Débogage (Sans Login)"}
            </button>

            <div className="text-center pt-4">
              <button 
                type="button"
                onClick={() => setView('request-account')}
                className="text-[10px] font-bold text-stone-400 hover:text-[#B45309] transition-colors flex items-center justify-center gap-2 mx-auto uppercase tracking-widest"
              >
                <UserPlus size={14} />
                Demander un compte
              </button>
            </div>
          </form>
        )}

        {view === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold text-stone-900">Mot de passe oublié</h2>
              <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                Votre demande sera envoyée au Super Administrateur pour validation manuelle.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Votre Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3.5 bg-stone-50/50 border border-stone-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Mot de passe souhaité</label>
                <input 
                  type="password" 
                  required
                  className="w-full px-4 py-3.5 bg-stone-50/50 border border-stone-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all"
                  placeholder="••••••••"
                  value={newPasswordDesired}
                  onChange={(e) => setNewPasswordDesired(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setView('login')}
                className="flex-1 px-4 py-3.5 border border-stone-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                Retour
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-[2] py-3.5 bg-stone-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
              >
                {loading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </form>
        )}

        {view === 'request-account' && (
          <form onSubmit={handleRequestAccount} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-stone-900">Demander un compte</h2>
              <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                Remplissez vos informations pour soumettre votre demande d'accès.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Nom complet</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3.5 bg-stone-50/50 border border-stone-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Email professionnel</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3.5 bg-stone-50/50 border border-stone-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all"
                  placeholder="jean@orchidee.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Rôle souhaité</label>
                <select 
                  className="w-full px-4 py-3.5 bg-stone-50/50 border border-stone-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all appearance-none"
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={() => setView('login')}
                className="flex-1 px-4 py-3.5 border border-stone-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                Retour
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-[2] py-3.5 bg-stone-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
              >
                {loading ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-10 pt-8 border-t border-stone-100 text-center">
          <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
            Orchidée Nature Management v2.5
          </p>
        </div>
      </motion.div>
    </div>
  );
};
