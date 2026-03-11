import React, { useState, useEffect } from 'react';
import { Package, ArrowDownLeft, ArrowUpRight, Plus, Search, User, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db, type Product } from '../offline/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';

interface StockMovement {
  id: string;
  type: 'RECEPTION' | 'RETURN';
  notes: string;
  created_at: string;
  user: { full_name: string };
  items: {
    id: string;
    quantity: number;
    product: { name: string };
  }[];
}

export const AgencyStockModule = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [movementType, setMovementType] = useState<'RECEPTION' | 'RETURN'>('RECEPTION');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ product_id: string, quantity: number }[]>([]);
  const products = useLiveQuery(() => db.products.toArray());
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchUserAndMovements();
  }, []);

  const fetchUserAndMovements = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setCurrentUser(userData);
      fetchMovements(userData.entity_id);
    }
  };

  const fetchMovements = async (entityId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agency_stock_movements')
        .select(`
          *,
          user:users(full_name),
          items:agency_stock_movement_items(
            id,
            quantity,
            product:products(name)
          )
        `)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || !currentUser) return;

    try {
      const { data: movement, error: mError } = await supabase
        .from('agency_stock_movements')
        .insert([{
          entity_id: currentUser.entity_id,
          user_id: currentUser.id,
          type: movementType,
          notes
        }])
        .select()
        .single();

      if (mError) throw mError;

      const itemsToInsert = selectedItems.map(item => ({
        movement_id: movement.id,
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const { error: iError } = await supabase
        .from('agency_stock_movement_items')
        .insert(itemsToInsert);

      if (iError) throw iError;

      // Update local stock (optimistic)
      for (const item of selectedItems) {
        const stock = await db.stock.where('product_id').equals(item.product_id).first();
        if (stock) {
          const newQty = movementType === 'RECEPTION' ? stock.quantity + item.quantity : stock.quantity - item.quantity;
          await db.stock.update(stock.id, { quantity: newQty });
        }
      }

      setShowModal(false);
      setNotes('');
      setSelectedItems([]);
      fetchMovements(currentUser.entity_id);
    } catch (error) {
      console.error('Error saving movement:', error);
      alert('Erreur lors de l\'enregistrement du mouvement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Suivi des Stocks Agence</h2>
          <p className="text-sm text-neutral-500">Réceptions et retours de produits</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau Mouvement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-sm border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
              <ArrowDownLeft size={20} />
            </div>
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Réceptions</span>
          </div>
          <p className="text-2xl font-bold">{movements.filter(m => m.type === 'RECEPTION').length}</p>
        </div>
        <div className="bg-white p-4 rounded-sm border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-full">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Retours</span>
          </div>
          <p className="text-2xl font-bold">{movements.filter(m => m.type === 'RETURN').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Date</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Type</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Articles</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Par</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-neutral-400 italic">Chargement...</td></tr>
            ) : movements.map(m => (
              <tr key={m.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                <td className="p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-neutral-400" />
                    {new Date(m.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${
                    m.type === 'RECEPTION' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {m.type === 'RECEPTION' ? 'Réception' : 'Retour'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-xs space-y-1">
                    {m.items.map(item => (
                      <div key={item.id} className="flex justify-between gap-4">
                        <span className="text-neutral-600">{item.product?.name}</span>
                        <span className="font-bold">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-neutral-400" />
                    {m.user?.full_name}
                  </div>
                </td>
                <td className="p-4 text-sm text-neutral-500 italic max-w-xs truncate">
                  {m.notes || '-'}
                </td>
              </tr>
            ))}
            {!loading && movements.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-neutral-400">Aucun mouvement enregistré</td></tr>
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
              className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Nouveau Mouvement de Stock</h3>
                  <div className="flex bg-neutral-100 p-1 rounded-sm">
                    <button 
                      type="button"
                      onClick={() => setMovementType('RECEPTION')}
                      className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${
                        movementType === 'RECEPTION' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-400'
                      }`}
                    >
                      Réception
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMovementType('RETURN')}
                      className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${
                        movementType === 'RETURN' ? 'bg-white text-amber-600 shadow-sm' : 'text-neutral-400'
                      }`}
                    >
                      Retour
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Articles</label>
                      <button 
                        type="button" 
                        onClick={handleAddItem}
                        className="text-[#B45309] text-[10px] font-bold uppercase tracking-widest hover:underline"
                      >
                        + Ajouter un article
                      </button>
                    </div>
                    
                    {selectedItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-end">
                        <div className="flex-1">
                          <select 
                            required
                            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                            value={item.product_id}
                            onChange={(e) => handleUpdateItem(index, 'product_id', e.target.value)}
                          >
                            <option value="">Sélectionner un produit</option>
                            {products?.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <input 
                            type="number"
                            required
                            min="1"
                            placeholder="Qté"
                            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-neutral-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {selectedItems.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-neutral-100 rounded-sm text-neutral-400 text-sm italic">
                        Aucun article ajouté
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Notes / Justification</label>
                    <textarea 
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] h-24"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Détails sur la réception ou le motif du retour..."
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
                    disabled={selectedItems.length === 0}
                    className="flex-1 btn-primary py-3 font-bold uppercase tracking-widest text-xs"
                  >
                    Enregistrer le mouvement
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
