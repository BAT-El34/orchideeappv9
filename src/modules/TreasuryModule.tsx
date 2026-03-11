import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Plus, 
  Search, 
  FileText, 
  Share2, 
  Download, 
  Calendar, 
  User, 
  Hash,
  CheckCircle2,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

interface TreasuryTransaction {
  id: string;
  type: 'ENCASHMENT' | 'DISBURSEMENT' | 'TRANSFER';
  category: 'AGENCY_COLLECTION' | 'EXTERNAL_ACTIVITY' | 'PUNCTUAL_EVENT' | 'OTHER';
  amount: number;
  description: string;
  payer_name: string;
  receiver_name: string;
  transaction_hash: string;
  created_at: string;
  user: { full_name: string };
}

export const TreasuryModule = () => {
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState<TreasuryTransaction | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'ENCASHMENT' as const,
    category: 'AGENCY_COLLECTION' as const,
    amount: '',
    description: '',
    payer_name: '',
    receiver_name: ''
  });

  useEffect(() => {
    fetchUserAndTransactions();
  }, []);

  const fetchUserAndTransactions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setCurrentUser(userData);
      fetchTransactions(userData.entity_id);
    }
  };

  const fetchTransactions = async (entityId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('treasury_transactions')
        .select('*, user:users(full_name)')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHash = () => {
    return Math.random().toString(36).substring(2, 15).toUpperCase() + 
           Math.random().toString(36).substring(2, 15).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const transactionHash = generateHash();

    try {
      const { data, error } = await supabase
        .from('treasury_transactions')
        .insert([{
          ...formData,
          amount: parseFloat(formData.amount),
          entity_id: currentUser.entity_id,
          user_id: currentUser.id,
          transaction_hash: transactionHash
        }])
        .select('*, user:users(full_name)')
        .single();

      if (error) throw error;

      setShowModal(false);
      setFormData({
        type: 'ENCASHMENT',
        category: 'AGENCY_COLLECTION',
        amount: '',
        description: '',
        payer_name: '',
        receiver_name: ''
      });
      fetchTransactions(currentUser.entity_id);
      setShowReceipt(data);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erreur lors de l\'enregistrement de la transaction');
    }
  };

  const handleShare = (t: TreasuryTransaction) => {
    const text = `Preuve de Paiement Orchidée Nature\nID: ${t.transaction_hash}\nMontant: ${t.amount.toLocaleString()} FCFA\nPayeur: ${t.payer_name}\nReçu par: ${t.receiver_name}\nDate: ${new Date(t.created_at).toLocaleDateString()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Trésorerie & Encaissements</h2>
          <p className="text-sm text-neutral-500">Suivi transversal des flux financiers</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle Opération
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-sm border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
              <ArrowDownCircle size={20} />
            </div>
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Total Encaissements</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {transactions.filter(t => t.type === 'ENCASHMENT').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} FCFA
          </p>
        </div>
        <div className="bg-white p-4 rounded-sm border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-full">
              <ArrowUpCircle size={20} />
            </div>
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Total Décaissements</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {transactions.filter(t => t.type === 'DISBURSEMENT').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} FCFA
          </p>
        </div>
        <div className="bg-white p-4 rounded-sm border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#B45309]/10 text-[#B45309] rounded-full">
              <Wallet size={20} />
            </div>
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Solde Net</span>
          </div>
          <p className="text-2xl font-bold text-[#B45309]">
            {(
              transactions.filter(t => t.type === 'ENCASHMENT').reduce((sum, t) => sum + t.amount, 0) -
              transactions.filter(t => t.type === 'DISBURSEMENT').reduce((sum, t) => sum + t.amount, 0)
            ).toLocaleString()} FCFA
          </p>
        </div>
      </div>

      <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Date & Hash</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Type / Catégorie</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Montant</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Intervenants</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-neutral-400 italic">Chargement...</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{new Date(t.created_at).toLocaleDateString()}</span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase">{t.transaction_hash.substring(0, 12)}...</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest w-fit ${
                      t.type === 'ENCASHMENT' ? 'bg-emerald-100 text-emerald-600' : 
                      t.type === 'DISBURSEMENT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {t.type}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t.category.replace('_', ' ')}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`font-mono font-bold ${t.type === 'ENCASHMENT' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'ENCASHMENT' ? '+' : '-'}{t.amount.toLocaleString()} FCFA
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-400 font-bold uppercase text-[8px]">De:</span>
                      <span className="font-medium">{t.payer_name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-400 font-bold uppercase text-[8px]">À:</span>
                      <span className="font-medium">{t.receiver_name || '-'}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowReceipt(t)}
                      className="p-2 text-neutral-400 hover:text-[#B45309] transition-colors"
                      title="Voir le reçu"
                    >
                      <FileText size={18} />
                    </button>
                    <button 
                      onClick={() => handleShare(t)}
                      className="p-2 text-neutral-400 hover:text-emerald-600 transition-colors"
                      title="Partager WhatsApp"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && transactions.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-neutral-400">Aucune transaction enregistrée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Nouvelle Opération de Trésorerie</h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-neutral-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Type</label>
                      <select 
                        className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                      >
                        <option value="ENCASHMENT">Encaissement</option>
                        <option value="DISBURSEMENT">Décaissement</option>
                        <option value="TRANSFER">Transfert</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Catégorie</label>
                      <select 
                        className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                      >
                        <option value="AGENCY_COLLECTION">Collecte Agence</option>
                        <option value="EXTERNAL_ACTIVITY">Activité Extérieure</option>
                        <option value="PUNCTUAL_EVENT">Évènement Ponctuel</option>
                        <option value="OTHER">Autre</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Montant (FCFA)</label>
                    <input 
                      type="number"
                      required
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Payeur / Origine</label>
                      <input 
                        type="text"
                        required
                        className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                        value={formData.payer_name}
                        onChange={(e) => setFormData({...formData, payer_name: e.target.value})}
                        placeholder="Nom du payeur"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Bénéficiaire / Reçu par</label>
                      <input 
                        type="text"
                        required
                        className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                        value={formData.receiver_name}
                        onChange={(e) => setFormData({...formData, receiver_name: e.target.value})}
                        placeholder="Nom du receveur"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Description / Notes</label>
                    <textarea 
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] h-20"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Détails de l'opération..."
                    />
                  </div>
                </div>

                <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-widest text-xs hover:bg-white rounded-sm"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-primary py-3 font-bold uppercase tracking-widest text-xs"
                  >
                    Valider l'opération
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-neutral-100 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Preuve de Paiement</span>
                <button onClick={() => setShowReceipt(null)} className="p-1 hover:bg-neutral-100 rounded-full">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                    <CheckCircle2 size={48} />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900">{showReceipt.amount.toLocaleString()} FCFA</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-1">Montant Confirmé</p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100 space-y-3 text-left">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 uppercase font-bold text-[8px]">Date</span>
                    <span className="font-medium">{new Date(showReceipt.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 uppercase font-bold text-[8px]">Payeur</span>
                    <span className="font-medium">{showReceipt.payer_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 uppercase font-bold text-[8px]">Reçu par</span>
                    <span className="font-medium">{showReceipt.receiver_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 uppercase font-bold text-[8px]">Catégorie</span>
                    <span className="font-medium uppercase tracking-wider">{showReceipt.category.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 pt-4">
                  <div className="bg-white p-2 border border-neutral-200 rounded-sm shadow-sm">
                    <QRCodeSVG 
                      value={`${window.location.origin}/treasury/proof/${showReceipt.transaction_hash}`}
                      size={100}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Hash de Transaction</span>
                    <span className="text-[8px] font-mono text-neutral-300 break-all max-w-[200px]">{showReceipt.transaction_hash}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                <button 
                  onClick={() => handleShare(showReceipt)}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-[10px]"
                >
                  <Share2 size={14} />
                  <span>Partager WhatsApp</span>
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-3 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-widest text-[10px] hover:bg-white rounded-sm flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  <span>Télécharger</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
