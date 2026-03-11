import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Plus,
  Search,
  ChevronRight,
  ArrowRight,
  Filter,
  X,
  Save
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../offline/dexie';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

export const OrdersModule = () => {
  const stock = useLiveQuery(() => db.stock.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  
  const [activeTab, setActiveTab] = useState<'low-stock' | 'history' | 'expiry'>('low-stock');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState(0);
  const [canManualOrder, setCanManualOrder] = useState(false);
  const [canAutoOrder, setCanAutoOrder] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (userData) {
          if (userData.role === 'super_admin' || userData.role === 'admin') {
            setCanManualOrder(true);
            setCanAutoOrder(true);
          } else {
            const manualPerm = await db.feature_permissions.where({ role: userData.role, feature_key: 'manual_orders' }).first();
            const autoPerm = await db.feature_permissions.where({ role: userData.role, feature_key: 'auto_orders' }).first();
            setCanManualOrder(manualPerm ? manualPerm.is_enabled : false);
            setCanAutoOrder(autoPerm ? autoPerm.is_enabled : false);
          }
        }
      }
    };
    checkPermissions();
  }, []);

  const lowStockItems = useMemo(() => {
    if (!stock || !products) return [];
    return stock
      .filter(s => s.quantity <= s.min_threshold)
      .map(s => ({
        ...s,
        product: products.find(p => p.id === s.product_id)
      }))
      .filter(item => item.product?.name.toLowerCase().includes(search.toLowerCase()));
  }, [stock, products, search]);

  const expiringItems: any[] = [];

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantityToAdd <= 0) return;

    try {
      const currentStock = await db.stock.where('product_id').equals(selectedProductId).first();
      if (currentStock) {
        await db.stock.update(currentStock.id, {
          quantity: currentStock.quantity + Number(quantityToAdd)
        });
        
        await db.sync_queue.add({
          table_name: 'stock',
          operation: 'UPDATE',
          payload: { id: currentStock.id, quantity: currentStock.quantity + Number(quantityToAdd) },
          created_at: Date.now()
        });
        
        setIsModalOpen(false);
        setSelectedProductId('');
        setQuantityToAdd(0);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Erreur lors de la mise à jour du stock');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes & Réappro.</h1>
          <p className="text-neutral-500 text-sm">Gérez vos stocks et vos commandes fournisseurs</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {canAutoOrder && (
            <button 
              onClick={() => {
                const toOrder = lowStockItems.filter(item => item.quantity <= item.min_threshold);
                if (toOrder.length === 0) {
                  alert('Aucun produit n\'est en dessous du seuil d\'alerte.');
                  return;
                }
                if (confirm(`Générer automatiquement ${toOrder.length} commandes pour les produits en rupture ?`)) {
                  alert('Commandes automatiques générées avec succès (Simulation).');
                }
              }}
              className="flex items-center gap-2 justify-center py-3 px-6 border border-[#B45309] text-[#B45309] font-bold uppercase tracking-widest text-[10px] hover:bg-[#B45309]/5 rounded-sm transition-colors"
            >
              <Clock size={16} />
              <span>Auto-Commande</span>
            </button>
          )}
          {canManualOrder && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2 justify-center py-3 px-6"
            >
              <Plus size={20} />
              <span>Nouvelle Commande</span>
            </button>
          )}
        </div>
      </header>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Réapprovisionnement</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="label-sm">Produit</label>
                <select 
                  required
                  className="input-field"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">Sélectionner un produit...</option>
                  {products?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-sm">Fournisseur (Optionnel)</label>
                <select 
                  className="input-field"
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-sm">Quantité à ajouter</label>
                <input 
                  required
                  type="number" 
                  className="input-field"
                  value={quantityToAdd}
                  onChange={e => setQuantityToAdd(Number(e.target.value))}
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
                  <span>Confirmer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-8 border-b border-neutral-200">
        <button 
          onClick={() => setActiveTab('low-stock')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'low-stock' ? 'text-[#B45309]' : 'text-neutral-400'}`}
        >
          Ruptures & Alertes
          {lowStockItems.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {lowStockItems.length}
            </span>
          )}
          {activeTab === 'low-stock' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B45309]" />}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'history' ? 'text-[#B45309]' : 'text-neutral-400'}`}
        >
          Historique
          {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B45309]" />}
        </button>
        <button 
          onClick={() => setActiveTab('expiry')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'expiry' ? 'text-[#B45309]' : 'text-neutral-400'}`}
        >
          Péremption
          {expiringItems.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {expiringItems.length}
            </span>
          )}
          {activeTab === 'expiry' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B45309]" />}
        </button>
      </div>

      {activeTab === 'low-stock' ? (
        <div className="space-y-6">
          <div className="input-icon-wrapper max-w-md">
            <input 
              type="text" 
              placeholder="Filtrer les produits..."
              className="input-field pl-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="input-icon" size={18} />
          </div>

          <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Produit</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Stock Actuel</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Seuil</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 rounded-sm text-neutral-400">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{item.product?.name}</p>
                          <p className="text-xs text-neutral-500">{item.product?.barcode || 'Sans code-barres'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold">
                      <span className={item.quantity === 0 ? 'text-red-600' : 'text-amber-600'}>
                        {item.quantity} {item.product?.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-neutral-500">
                      {item.min_threshold} {item.product?.unit}
                    </td>
                    <td className="px-6 py-4">
                      {item.quantity === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-sm">
                          <AlertCircle size={12} />
                          Rupture
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded-sm">
                          <Clock size={12} />
                          Critique
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-[#B45309] text-xs font-bold uppercase hover:underline flex items-center gap-1">
                        Commander
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {lowStockItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                      <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500 opacity-20" />
                      <p>Tous les stocks sont au-dessus des seuils d'alerte.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'expiry' ? (
        <div className="space-y-6">
          <div className="input-icon-wrapper max-w-md">
            <input 
              type="text" 
              placeholder="Filtrer les produits..."
              className="input-field pl-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="input-icon" size={18} />
          </div>

          <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Produit</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Date d'expiration</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {expiringItems.map((item) => {
                  const daysLeft = Math.ceil((new Date(item.expiry_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-neutral-100 rounded-sm text-neutral-400">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.product?.name}</p>
                            <p className="text-xs text-neutral-500">{item.quantity} en stock</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">
                        {new Date(item.expiry_date!).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        {daysLeft <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-sm">
                            Périmé
                          </span>
                        ) : daysLeft <= 7 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-sm">
                            {daysLeft} jours
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded-sm">
                            {daysLeft} jours
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-red-600 text-xs font-bold uppercase hover:underline">
                          Retirer du stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {expiringItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-400">
                      <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500 opacity-20" />
                      <p>Aucun produit n'expire prochainement.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-sm border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400">
          <Truck size={48} className="mb-4 opacity-20" />
          <p>L'historique des commandes sera bientôt disponible.</p>
        </div>
      )}
    </div>
  );
};
