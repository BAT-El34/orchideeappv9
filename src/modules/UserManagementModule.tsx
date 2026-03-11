import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User, type ActivityLog } from '../offline/dexie';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Activity,
  MoreVertical,
  UserCheck,
  UserX,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const UserManagementModule = () => {
  const users = useLiveQuery(() => db.users.toArray());
  const logs = useLiveQuery(() => db.activity_logs.orderBy('created_at').reverse().limit(50).toArray());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'users' | 'logs' | 'permissions'>('users');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'vendeur',
    entityId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [permissions, setPermissions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const features = [
    { key: 'products', label: 'Produits', description: 'Gestion du catalogue et des prix' },
    { key: 'suppliers', label: 'Fournisseurs', description: 'Gestion des contacts fournisseurs' },
    { key: 'customers', label: 'Clients', description: 'Base de données clients' },
    { key: 'billing', label: 'Facturation', description: 'Module de vente et facturation' },
    { key: 'cash', label: 'Caisse', description: 'Gestion de la caisse et sessions' },
    { key: 'expenses', label: 'Dépenses', description: 'Enregistrement des frais' },
    { key: 'orders', label: 'Commandes', description: 'Passation de commandes fournisseurs' },
    { key: 'production', label: 'Production', description: 'Accès cuisine et recettes' },
    { key: 'agency_stock', label: 'Stocks Agence', description: 'Suivi réceptions/retours agences' },
    { key: 'treasury', label: 'Trésorerie', description: 'Encaissements et traçabilité' },
    { key: 'chat', label: 'Chat Interne', description: 'Communication d\'équipe' },
    { key: 'reports', label: 'Rapports IA', description: 'Analyses intelligentes' },
    { key: 'users', label: 'Utilisateurs', description: 'Gestion des comptes (Super Admin)' },
  ];

  const roles = ['admin', 'manager', 'vendeur', 'caissier', 'production', 'agency', 'treasury'];

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUser(userData);
        if (userData) {
          fetchPermissions(userData.entity_id);
          setCreateFormData(prev => ({ ...prev, entityId: userData.entity_id }));
        }
      }
    };
    fetchUserAndPermissions();
  }, []);

  const fetchPermissions = async (entityId: string) => {
    const { data } = await supabase
      .from('feature_permissions')
      .select('*')
      .eq('entity_id', entityId);
    setPermissions(data || []);
  };

  const togglePermission = async (role: string, featureKey: string) => {
    if (!currentUser) return;
    
    const existing = permissions.find(p => p.role === role && p.feature_key === featureKey);

    if (existing) {
      const { error } = await supabase
        .from('feature_permissions')
        .update({ is_enabled: !existing.is_enabled })
        .eq('id', existing.id);
      
      if (!error) {
        setPermissions(prev => prev.map(p => 
          p.id === existing.id ? { ...p, is_enabled: !p.is_enabled } : p
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('feature_permissions')
        .insert([{
          entity_id: currentUser.entity_id,
          role,
          feature_key: featureKey,
          is_enabled: true
        }])
        .select()
        .single();
      
      if (!error && data) {
        setPermissions(prev => [...prev, data]);
      }
    }
  };

  const isFeatureEnabled = (role: string, featureKey: string) => {
    // Admin and Super Admin always have everything
    if (role === 'super_admin' || role === 'admin') return true;
    const perm = permissions.find(p => p.role === role && p.feature_key === featureKey);
    return perm ? perm.is_enabled : false;
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      const user = await db.users.get(userId);
      if (!user) return;

      await db.users.update(userId, { status: newStatus });
      
      // Log activity
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        user_id: currentUser?.id || 'system',
        action: `USER_STATUS_UPDATE`,
        details: { target_user: user.email, old_status: user.status, new_status: newStatus },
        created_at: new Date().toISOString()
      };
      await db.activity_logs.add(log);

      // Sync queue
      await db.sync_queue.add({
        table_name: 'users',
        operation: 'UPDATE',
        payload: { id: userId, status: newStatus },
        created_at: Date.now()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création du compte');
      }

      // Add to local DB for immediate feedback
      await db.users.add({
        id: result.user.id,
        email: createFormData.email,
        full_name: createFormData.fullName,
        role: createFormData.role,
        entity_id: createFormData.entityId,
        status: 'active',
        created_at: new Date().toISOString()
      });

      setIsCreateModalOpen(false);
      setCreateFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'vendeur',
        entityId: currentUser?.entity_id || ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif italic text-neutral-900">Gestion des Comptes</h1>
          <p className="text-sm text-neutral-500">Approuvez les demandes et surveillez l'activité du système</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
          >
            <Users size={16} />
            <span>Nouveau Compte</span>
          </button>

          <div className="flex bg-neutral-100 p-1 rounded-sm">
            <button 
              onClick={() => setView('users')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all rounded-sm",
                view === 'users' ? "bg-white text-[#B45309] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              Utilisateurs
            </button>
            <button 
              onClick={() => setView('logs')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all rounded-sm",
                view === 'logs' ? "bg-white text-[#B45309] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              Activité
            </button>
            <button 
              onClick={() => setView('permissions')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all rounded-sm",
                view === 'permissions' ? "bg-white text-[#B45309] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              Permissions
            </button>
          </div>
        </div>
      </header>

      {view === 'users' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 border border-neutral-200 rounded-sm shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input 
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="active">Actifs</option>
                <option value="suspended">Suspendus</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-neutral-200 rounded-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Utilisateur</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Rôle</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Statut</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold">
                            {user.full_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-neutral-900">{user.full_name}</span>
                            <span className="text-xs text-neutral-400">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.status === 'active' && <CheckCircle size={14} className="text-emerald-500" />}
                          {user.status === 'pending' && <Clock size={14} className="text-amber-500" />}
                          {user.status === 'suspended' && <XCircle size={14} className="text-red-500" />}
                          <span className={cn(
                            "text-xs font-medium capitalize",
                            user.status === 'active' ? "text-emerald-600" : 
                            user.status === 'pending' ? "text-amber-600" : "text-red-600"
                          )}>
                            {user.status === 'active' ? 'Actif' : user.status === 'pending' ? 'En attente' : 'Suspendu'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {user.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleUpdateStatus(user.id, 'active')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                                title="Approuver"
                              >
                                <UserCheck size={18} />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(user.id, 'suspended')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                                title="Rejeter"
                              >
                                <UserX size={18} />
                              </button>
                            </>
                          )}
                          {user.status === 'active' && (
                            <button 
                              onClick={() => handleUpdateStatus(user.id, 'suspended')}
                              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                              title="Suspendre"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                          {user.status === 'suspended' && (
                            <button 
                              onClick={() => handleUpdateStatus(user.id, 'active')}
                              className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                              title="Réactiver"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : view === 'logs' ? (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-sm shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                <Activity size={14} />
                Journal d'activité système
              </h3>
            </div>
            <div className="divide-y divide-neutral-100">
              {logs?.map((log) => (
                <div key={log.id} className="p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="mt-1 p-2 bg-neutral-100 rounded-sm text-neutral-500">
                        <Shield size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {JSON.stringify(log.details)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider">
                            ID: {log.user_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!logs || logs.length === 0) && (
                <div className="p-12 text-center text-neutral-400">
                  <Activity size={32} className="mx-auto opacity-10 mb-2" />
                  <p className="text-sm">Aucune activité enregistrée</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-sm flex gap-3 text-amber-800 text-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <p>
              <strong>Note de sécurité :</strong> Les modifications ici affectent immédiatement l'accès aux fonctionnalités pour tous les utilisateurs du rôle sélectionné. Les Administrateurs et Super-Admins conservent toujours un accès total.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Fonctionnalité</th>
                    {roles.map(role => (
                      <th key={role} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 text-center">
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {features.map((feature) => (
                    <tr key={feature.key} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 text-sm">{feature.label}</span>
                          <span className="text-xs text-neutral-400">{feature.description}</span>
                        </div>
                      </td>
                      {roles.map(role => {
                        const enabled = isFeatureEnabled(role, feature.key);
                        return (
                          <td key={role} className="px-6 py-4 text-center">
                            <button 
                              onClick={() => togglePermission(role, feature.key)}
                              disabled={role === 'admin'}
                              className={cn(
                                "w-10 h-5 rounded-full transition-colors relative inline-block",
                                enabled ? "bg-[#B45309]" : "bg-neutral-200",
                                role === 'admin' && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                enabled ? "left-6" : "left-1"
                              )} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="text-lg font-serif italic">Créer un nouveau compte</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-sm border border-red-100 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="label-sm">Nom Complet</label>
                  <input 
                    type="text"
                    required
                    className="input-field"
                    value={createFormData.fullName}
                    onChange={(e) => setCreateFormData({...createFormData, fullName: e.target.value})}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div>
                  <label className="label-sm">Email</label>
                  <input 
                    type="email"
                    required
                    className="input-field"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                    placeholder="jean@exemple.com"
                  />
                </div>

                <div>
                  <label className="label-sm">Mot de passe</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    className="input-field"
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-sm">Rôle</label>
                    <select 
                      className="input-field"
                      value={createFormData.role}
                      onChange={(e) => setCreateFormData({...createFormData, role: e.target.value})}
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">ID Entité</label>
                    <input 
                      type="text"
                      required
                      className="input-field"
                      value={createFormData.entityId}
                      onChange={(e) => setCreateFormData({...createFormData, entityId: e.target.value})}
                      placeholder="UUID de l'agence"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-3 border border-neutral-200 font-bold uppercase tracking-widest text-xs hover:bg-neutral-50 rounded-sm"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-[#B45309] text-white font-bold uppercase tracking-widest text-xs hover:bg-[#92400E] rounded-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Création...' : 'Créer le compte'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
