import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertCircle, 
  Info, 
  Package, 
  TrendingUp,
  X,
  UserPlus,
  Key,
  CheckCircle,
  XCircle,
  ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: 'stock' | 'sale' | 'info' | 'ACCOUNT_REQUEST' | 'PASSWORD_RESET' | 'ORDER';
  title: string;
  message: string;
  time: string;
  read: boolean;
  status: string;
  from_user_id?: string;
  metadata?: any;
}

export const NotificationsModule = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [notifSettings, setNotifSettings] = useState({
    whatsapp: '+221 77 000 00 00',
    email: 'contact@orchidee.sn',
    emailCC: 'direction@orchidee.sn',
    emailBCC: 'archives@orchidee.sn',
    whatsappActive: true,
    emailActive: true
  });

  useEffect(() => {
    fetchUserAndNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserAndNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setCurrentUser(userData);
      fetchNotifications(userData);
    }
  };

  const fetchNotifications = async (user = currentUser) => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter based on role
      if (user.role === 'super_admin') {
        // Super admin sees everything or specific admin tasks
        query = query.or(`to_role.eq.super_admin,to_role.eq.admin`);
      } else {
        query = query.eq('to_role', user.role);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      const formattedNotifs: Notification[] = data.map(n => ({
        id: n.id,
        type: n.type as any,
        title: n.type === 'ACCOUNT_REQUEST' ? 'Demande de Compte' : 
               n.type === 'PASSWORD_RESET' ? 'Réinitialisation de MDP' :
               n.type === 'ORDER' ? 'Commande / Livraison' : 'Notification',
        message: n.message,
        time: new Date(n.created_at).toLocaleString('fr-FR'),
        read: n.status === 'read',
        status: n.status,
        from_user_id: n.from_user_id,
        metadata: n.metadata
      }));

      setNotifications(formattedNotifs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (notifId: string, action: 'approve' | 'reject') => {
    try {
      const notif = notifications.find(n => n.id === notifId);
      if (!notif) return;

      if (notif.type === 'ACCOUNT_REQUEST' && action === 'approve') {
        // In a real app, this would call a server-side function to create the auth user
        // For now, we'll just update the notification status
        alert('Compte approuvé. (Note: L\'utilisateur doit être créé manuellement dans Supabase Auth ou via une Edge Function)');
      }

      const { error } = await supabase
        .from('notifications')
        .update({ status: action === 'approve' ? 'completed' : 'rejected' })
        .eq('id', notifId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', id);
      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 md:pb-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-neutral-500 text-sm">Restez informé des événements importants</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-neutral-100 p-1 rounded-sm">
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === 'list' ? 'bg-white text-[#B45309] shadow-sm' : 'text-neutral-500'}`}
            >
              Alertes
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === 'settings' ? 'bg-white text-[#B45309] shadow-sm' : 'text-neutral-500'}`}
            >
              Paramètres
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'list' ? (
        <div className="space-y-4">
          {loading && notifications.length === 0 ? (
            <div className="py-20 text-center text-neutral-400">Chargement...</div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`p-4 rounded-sm border transition-all flex gap-4 ${n.read || n.status === 'completed' ? 'bg-white border-neutral-100 opacity-60' : 'bg-white border-neutral-200 shadow-sm'}`}
                >
                  <div className={`p-3 rounded-sm shrink-0 ${
                    n.type === 'ACCOUNT_REQUEST' ? 'bg-blue-50 text-blue-500' : 
                    n.type === 'PASSWORD_RESET' ? 'bg-amber-50 text-amber-500' : 
                    n.type === 'ORDER' ? 'bg-emerald-50 text-emerald-500' : 
                    'bg-neutral-50 text-neutral-500'
                  }`}>
                    {n.type === 'ACCOUNT_REQUEST' ? <UserPlus size={20} /> : 
                     n.type === 'PASSWORD_RESET' ? <Key size={20} /> : 
                     n.type === 'ORDER' ? <ShoppingCart size={20} /> :
                     <Bell size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-bold ${n.read ? 'text-neutral-600' : 'text-neutral-900'}`}>{n.title}</h3>
                      <span className="text-[10px] text-neutral-400 font-medium">{n.time}</span>
                    </div>
                    <p className="text-sm text-neutral-500 leading-relaxed mb-3 whitespace-pre-wrap">{n.message}</p>
                    
                    <div className="flex flex-wrap gap-4">
                      {n.status === 'pending' && (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
                        <div className="flex gap-2 w-full mb-2">
                          <button 
                            onClick={() => handleAction(n.id, 'approve')}
                            className="flex-1 bg-emerald-600 text-white text-[10px] font-bold uppercase py-2 rounded-sm flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={12} />
                            Approuver
                          </button>
                          <button 
                            onClick={() => handleAction(n.id, 'reject')}
                            className="flex-1 bg-red-600 text-white text-[10px] font-bold uppercase py-2 rounded-sm flex items-center justify-center gap-1"
                          >
                            <XCircle size={12} />
                            Rejeter
                          </button>
                        </div>
                      )}

                      {n.status === 'pending' && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest flex items-center gap-1 hover:underline"
                        >
                          <Check size={12} />
                          Marquer comme lu
                        </button>
                      )}
                      
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                        Supprimer
                      </button>

                      {n.status === 'completed' && (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle size={12} />
                          Terminé
                        </span>
                      )}
                      {n.status === 'rejected' && (
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                          <XCircle size={12} />
                          Rejeté
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {!loading && notifications.length === 0 && (
            <div className="py-20 text-center text-neutral-400 bg-white rounded-sm border border-neutral-200 border-dashed">
              <Bell size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm">Vous n'avez aucune notification.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm space-y-8">
          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Info size={18} className="text-[#B45309]" />
              Configuration WhatsApp
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-600">Activer les notifications WhatsApp</label>
                <button 
                  onClick={() => setNotifSettings({...notifSettings, whatsappActive: !notifSettings.whatsappActive})}
                  className={`w-10 h-5 rounded-full transition-colors relative ${notifSettings.whatsappActive ? 'bg-[#B45309]' : 'bg-neutral-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifSettings.whatsappActive ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Numéro de téléphone</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                  value={notifSettings.whatsapp}
                  onChange={(e) => setNotifSettings({...notifSettings, whatsapp: e.target.value})}
                  placeholder="+221 ..."
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-100">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Bell size={18} className="text-[#B45309]" />
              Configuration Email (Gmail)
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-600">Activer les notifications Email</label>
                <button 
                  onClick={() => setNotifSettings({...notifSettings, emailActive: !notifSettings.emailActive})}
                  className={`w-10 h-5 rounded-full transition-colors relative ${notifSettings.emailActive ? 'bg-[#B45309]' : 'bg-neutral-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifSettings.emailActive ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Adresse Email de réception</label>
                <input 
                  type="email"
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                  value={notifSettings.email}
                  onChange={(e) => setNotifSettings({...notifSettings, email: e.target.value})}
                  placeholder="exemple@gmail.com"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Copie (CC)</label>
                  <input 
                    type="email"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                    value={notifSettings.emailCC}
                    onChange={(e) => setNotifSettings({...notifSettings, emailCC: e.target.value})}
                    placeholder="direction@..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Copie Cachée (BCC)</label>
                  <input 
                    type="email"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                    value={notifSettings.emailBCC}
                    onChange={(e) => setNotifSettings({...notifSettings, emailBCC: e.target.value})}
                    placeholder="archives@..."
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-6">
            <button className="w-full btn-primary py-3 font-bold uppercase tracking-widest">Enregistrer les paramètres</button>
          </div>
        </div>
      )}
    </div>
  );
};
