import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense, type User } from '../offline/dexie';
import { Plus, Search, Banknote, Trash2, Calendar, AlertCircle, X, Save, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

const CATEGORIES = [
  'Loyer',
  'Électricité / Eau',
  'Salaires',
  'Transport',
  'Marketing',
  'Fournitures',
  'Maintenance',
  'Autre'
];

export const ExpensesModule = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (userData) setUser(userData);
      }
    };
    fetchUser();
  }, []);

  const expenses = useLiveQuery(
    () => db.expenses.orderBy('date').reverse().toArray()
  );

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(e => 
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenses, searchTerm]);

  const totalExpenses = useMemo(() => 
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  , [filteredExpenses]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = crypto.randomUUID();
    
    const expenseData: Expense = {
      id,
      entity_id: user?.entity_id,
      category: formData.category,
      amount: Number(formData.amount),
      description: formData.description,
      date: formData.date,
      created_at: new Date().toISOString()
    };

    try {
      await db.transaction('rw', [db.expenses, db.sync_queue], async () => {
        await db.expenses.add(expenseData);
        await db.sync_queue.add({
          table_name: 'expenses',
          operation: 'INSERT',
          payload: expenseData,
          created_at: Date.now()
        });
      });
      setIsModalOpen(false);
      setFormData({
        category: CATEGORIES[0],
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Erreur lors de l\'enregistrement de la dépense');
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    await db.expenses.delete(id);
    await db.sync_queue.add({
      table_name: 'expenses',
      operation: 'DELETE',
      payload: { id },
      created_at: Date.now()
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Dépenses</h1>
          <p className="text-neutral-500 text-sm">Suivez vos charges et sorties de caisse</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center py-3 px-6"
        >
          <Plus size={18} />
          <span>Nouvelle Dépense</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm md:col-span-1">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Dépenses</p>
          <p className="text-3xl font-bold text-red-600 font-mono">{totalExpenses.toLocaleString()} FCFA</p>
        </div>
        
        <div className="bg-white p-4 rounded-sm border border-neutral-200 shadow-sm md:col-span-2 flex items-center px-6">
          <div className="input-icon-wrapper w-full">
            <input 
              type="text" 
              placeholder="Rechercher une dépense..." 
              className="input-field pl-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="input-icon" size={18} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-[10px] uppercase tracking-widest font-bold border-b border-neutral-200">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-neutral-500">
                    {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-neutral-100 text-neutral-700 text-[10px] font-bold uppercase rounded-sm">
                      <Tag size={12} />
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm truncate max-w-[200px]">
                    {expense.description || '-'}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm font-bold text-red-600">
                    {expense.amount.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteExpense(expense.id)}
                      className="p-2 text-neutral-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="opacity-20" />
                      <p>Aucune dépense trouvée</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md p-6 rounded-sm shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Nouvelle Dépense</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label-sm">Catégorie</label>
                <select 
                  required
                  className="input-field"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-sm">Montant (FCFA)</label>
                <input 
                  required
                  type="number" 
                  className="input-field"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="label-sm">Date</label>
                <input 
                  required
                  type="date" 
                  className="input-field"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="label-sm">Description (Optionnel)</label>
                <textarea 
                  className="input-field min-h-[80px] py-2"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-neutral-200 font-bold uppercase tracking-widest text-xs hover:bg-neutral-50 rounded-sm"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
