import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Wallet, 
  ShoppingCart, 
  Bell, 
  BarChart3, 
  Settings,
  HelpCircle,
  LogOut,
  X,
  Banknote,
  Truck,
  Users,
  ShieldCheck,
  ChefHat,
  MessageSquare
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Flower2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/', feature: 'dashboard' },
  { icon: Package, label: 'Produits', path: '/products', feature: 'products' },
  { icon: Truck, label: 'Fournisseurs', path: '/suppliers', feature: 'suppliers' },
  { icon: Users, label: 'Clients', path: '/customers', feature: 'customers' },
  { icon: FileText, label: 'Facturation', path: '/billing', feature: 'billing' },
  { icon: Wallet, label: 'Caisse', path: '/cash', feature: 'cash' },
  { icon: Banknote, label: 'Dépenses', path: '/expenses', feature: 'expenses' },
  { icon: ShoppingCart, label: 'Commandes', path: '/orders', feature: 'orders' },
  { icon: Package, label: 'Stocks Agence', path: '/agency-stock', feature: 'agency_stock' },
  { icon: Wallet, label: 'Trésorerie', path: '/treasury', feature: 'treasury' },
  { icon: MessageSquare, label: 'Chat Interne', path: '/chat', feature: 'chat' },
  { icon: ChefHat, label: 'Production', path: '/production', feature: 'production' },
  { icon: Bell, label: 'Notifications', path: '/notifications', feature: 'notifications' },
  { icon: ShieldCheck, label: 'Utilisateurs', path: '/users', feature: 'users' },
  { icon: BarChart3, label: 'Rapports IA', path: '/reports', feature: 'reports' },
  { icon: Settings, label: 'Profil', path: '/profile', feature: 'profile' },
  { icon: HelpCircle, label: 'Tuto', path: '/tuto', feature: 'tuto' },
];

interface SidebarProps {
  onLogout?: () => void;
}

import { SyncStatus } from './SyncStatus';

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (userData) {
          setUser(userData);
          const { data: perms } = await supabase
            .from('feature_permissions')
            .select('*')
            .eq('entity_id', userData.entity_id)
            .eq('role', userData.role);
          setPermissions(perms || []);
        } else {
          setUser({ 
            full_name: session.user.user_metadata?.full_name || 'Utilisateur',
            role: 'vendeur'
          });
        }
      }
    };
    fetchUserAndPermissions();
  }, []);

  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    // Admins have everything
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    
    // Core items always visible
    if (['dashboard', 'profile', 'tuto', 'notifications'].includes(item.feature)) return true;

    // Check permissions table
    const perm = permissions.find(p => p.feature_key === item.feature);
    return perm ? perm.is_enabled : false;
  });

  const mainNavItems = filteredNavItems.slice(0, 4);
  const secondaryNavItems = filteredNavItems.slice(4);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Flower2 size={20} className="text-[#B45309]" />
          <span className="font-serif italic text-lg text-neutral-900">Orchidée</span>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus />
          <button 
            onClick={onLogout}
            className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:h-screen bg-white border-r border-neutral-200 sticky top-0">
        <div className="flex flex-col p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Flower2 size={24} className="text-[#B45309]" />
            <span className="font-serif italic text-xl text-neutral-900">Orchidée</span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            Cosmétiques & Epices
          </p>
        </div>

        {user && (
          <NavLink to="/profile" className="px-6 mb-6 block group">
            <div className="p-4 bg-neutral-50 rounded-sm border border-neutral-100 group-hover:border-[#B45309]/30 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309]">
                  {user.role === 'super_admin' ? <ShieldCheck size={18} /> : <Users size={18} />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate">{user.full_name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                    {user.role === 'super_admin' ? 'Super Admin' : user.role}
                  </p>
                </div>
              </div>
            </div>
          </NavLink>
        )}
        
        <nav className="flex-1 flex flex-col p-4 gap-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-colors",
                isActive 
                  ? "text-[#B45309] bg-[#B45309]/5" 
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-6 border-t border-neutral-100 space-y-6">
          <SyncStatus />
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 text-neutral-500 hover:text-red-600 transition-colors text-sm font-medium w-full"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 px-2 py-1 flex justify-around items-center z-50 pb-safe">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors",
              isActive ? "text-[#B45309]" : "text-neutral-400"
            )}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
        <button 
          onClick={() => setIsMoreMenuOpen(true)}
          className="flex flex-col items-center gap-1 p-2 min-w-[64px] text-neutral-400"
        >
          <Settings size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Plus</span>
        </button>
      </nav>

      {/* Mobile More Menu Overlay */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="md:hidden fixed bottom-0 left-0 w-full bg-white rounded-t-2xl p-6 z-[70] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Menu</h3>
                <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 bg-neutral-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {secondaryNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
                      isActive ? "bg-[#B45309]/10 text-[#B45309]" : "bg-neutral-50 text-neutral-600"
                    )}
                  >
                    <item.icon size={24} />
                    <span className="text-[10px] font-bold uppercase text-center leading-tight">{item.label}</span>
                  </NavLink>
                ))}
              </div>
              <button 
                onClick={onLogout}
                className="w-full mt-8 p-4 flex items-center justify-center gap-3 text-red-600 font-bold bg-red-50 rounded-xl"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
