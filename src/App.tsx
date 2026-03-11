import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { Clock, XCircle, AlertCircle } from 'lucide-react';
import { LoadingScreen } from './components/LoadingScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProductsModule } from './modules/ProductsModule';
import { TutoModule } from './modules/TutoModule';
import { CashierModule } from './modules/CashierModule';
import { BillingModule } from './modules/BillingModule';
import { ReportsModule } from './modules/ReportsModule';
import { OrdersModule } from './modules/OrdersModule';
import { NotificationsModule } from './modules/NotificationsModule';
import { ExpensesModule } from './modules/ExpensesModule';
import { SuppliersModule } from './modules/SuppliersModule';
import { CustomersModule } from './modules/CustomersModule';
import { ProfileModule } from './modules/ProfileModule';
import { UserManagementModule } from './modules/UserManagementModule';
import { ProductionModule } from './modules/ProductionModule';
import { ChatModule } from './modules/ChatModule';
import { AgencyStockModule } from './modules/AgencyStockModule';
import { TreasuryModule } from './modules/TreasuryModule';
import { ProofModule } from './modules/ProofModule';
import { LoginModule } from './modules/LoginModule';
import { syncAll } from './offline/sync-engine';
import { supabase } from './lib/supabase';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(localStorage.getItem('orchidee_debug_mode') === 'true');

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        if (debugMode) {
          // Fetch a real entity ID for debug mode
          const { data: entities } = await supabase.from('entities').select('id').limit(1);
          const entityId = entities?.[0]?.id || '00000000-0000-0000-0000-000000000000';
          
          setUser({
            id: 'debug-user-id',
            email: 'debug@example.com',
            full_name: 'Utilisateur Débogage',
            role: 'super_admin',
            status: 'active',
            entity_id: entityId
          });
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Enforce "Stay logged in" logic
          const rememberMe = localStorage.getItem('orchidee_remember_me') === 'true';
          const sessionActive = sessionStorage.getItem('orchidee_session_active') === 'true';
          const loginAt = parseInt(localStorage.getItem('orchidee_login_at') || '0');
          const fortyEightHours = 48 * 60 * 60 * 1000;
          const isExpired = Date.now() - loginAt > fortyEightHours;

          // If not remembered AND not a fresh session in this tab, OR if expired
          if ((!rememberMe && !sessionActive) || (rememberMe && isExpired)) {
            await supabase.auth.signOut();
            localStorage.removeItem('orchidee_remember_me');
            localStorage.removeItem('orchidee_login_at');
            sessionStorage.removeItem('orchidee_session_active');
            setUser(null);
            setLoading(false);
            return;
          }

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (userData) {
            setUser(userData);
          } else if (userError) {
            console.error('Error fetching user profile:', userError);
            setUser(null);
          } else {
            console.warn('Profile missing in public.users for ID:', session.user.id);
            // Don't sign out automatically here, let the UI handle it or show a message
            setUser({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || 'Utilisateur (Profil manquant)',
              role: 'vendeur',
              status: 'active',
              is_profile_missing: true
            });
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser(userData || {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || 'Utilisateur (Profil manquant)',
          role: 'vendeur',
          status: 'active',
          is_profile_missing: true
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Attempt sync on start
    syncAll();
    
    // Set up periodic sync
    const interval = setInterval(syncAll, 60000);
    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const toggleDebugMode = () => {
    const newMode = !debugMode;
    if (newMode) {
      localStorage.setItem('orchidee_debug_mode', 'true');
    } else {
      localStorage.removeItem('orchidee_debug_mode');
    }
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      if (!debugMode) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      localStorage.removeItem('orchidee_debug_mode');
      localStorage.removeItem('orchidee_remember_me');
      localStorage.removeItem('orchidee_login_at');
      sessionStorage.removeItem('orchidee_session_active');
      setUser(null);
      window.location.reload();
    }
  };

  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/proof/:id" element={<ProofModule />} />
        <Route path="/treasury/proof/:hash" element={<ProofModule />} />

        {/* Protected Routes */}
        <Route 
          path="/*" 
          element={
            !user ? (
              <LoginModule onToggleDebug={toggleDebugMode} isDebug={debugMode} />
            ) : user.status === 'pending' ? (
              <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-sm border border-neutral-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock size={32} />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Compte en attente</h1>
                  <p className="text-neutral-500 mb-8">
                    Votre compte a été créé avec succès mais doit être approuvé par un administrateur avant que vous puissiez accéder au système.
                  </p>
                  <button 
                    onClick={handleLogout}
                    className="text-sm font-bold text-[#B45309] hover:underline"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            ) : user.status === 'suspended' ? (
              <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-sm border border-neutral-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle size={32} />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Compte suspendu</h1>
                  <p className="text-neutral-500 mb-8">
                    Votre compte a été suspendu. Veuillez contacter un administrateur pour plus d'informations.
                  </p>
                  <button 
                    onClick={handleLogout}
                    className="text-sm font-bold text-[#B45309] hover:underline"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            ) : user.is_profile_missing ? (
              <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-sm border border-neutral-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={32} />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Profil manquant</h1>
                  <p className="text-neutral-500 mb-8">
                    Votre compte d'authentification existe, mais votre profil utilisateur est manquant dans la base de données. Veuillez contacter un administrateur pour synchroniser votre compte.
                  </p>
                  <button 
                    onClick={handleLogout}
                    className="text-sm font-bold text-[#B45309] hover:underline"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50">
                <Sidebar onLogout={handleLogout} />
                <main className="flex-1 overflow-x-hidden pb-24 md:pb-0">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/products" element={<ProductsModule />} />
                    <Route path="/suppliers" element={<SuppliersModule />} />
                    <Route path="/customers" element={<CustomersModule />} />
                    <Route path="/billing" element={<BillingModule />} />
                    <Route path="/cash" element={<CashierModule />} />
                    <Route path="/expenses" element={<ExpensesModule />} />
                    <Route path="/orders" element={<OrdersModule />} />
                    <Route path="/production" element={<ProductionModule />} />
                    <Route path="/chat" element={<ChatModule />} />
                    <Route path="/agency-stock" element={<AgencyStockModule />} />
                    <Route path="/treasury" element={<TreasuryModule />} />
                    <Route path="/notifications" element={<NotificationsModule />} />
                    <Route path="/reports" element={<ReportsModule />} />
                    <Route path="/profile" element={<ProfileModule />} />
                    <Route path="/users" element={<UserManagementModule />} />
                    <Route path="/tuto" element={<TutoModule />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            )
          } 
        />
      </Routes>
    </Router>
  );
}
