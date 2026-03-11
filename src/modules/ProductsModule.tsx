import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type User } from '../offline/dexie';
import { Plus, Search, Package, Trash2, Edit2, AlertCircle, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

export const ProductsModule = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockFormData, setStockFormData] = useState({
    quantity: 0,
    notes: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    price_buy: 0,
    price_sell: 0,
    barcode: '',
    initial_stock: 0,
    min_threshold: 5,
    product_type: 'finished_good' as 'raw_material' | 'finished_good'
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

  const products = useLiveQuery(
    () => db.products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).toArray(),
    [searchTerm]
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price_buy: product.price_buy,
        price_sell: product.price_sell,
        barcode: product.barcode || '',
        initial_stock: 0, // Not used for editing
        min_threshold: 5, // Default
        product_type: product.product_type || 'finished_good'
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price_buy: 0,
        price_sell: 0,
        barcode: '',
        initial_stock: 0,
        min_threshold: 5,
        product_type: 'finished_good'
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenStockModal = (product: Product) => {
    setEditingProduct(product);
    setStockFormData({ quantity: 0, notes: '' });
    setIsStockModalOpen(true);
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await db.transaction('rw', [db.stock, db.sync_queue], async () => {
        const stock = await db.stock.where('product_id').equals(editingProduct.id).first();
        if (stock) {
          const newQty = stock.quantity + Number(stockFormData.quantity);
          await db.stock.update(stock.id, { quantity: newQty });
          
          // In a real app we might have a stock_movements table
          // For now we just sync the stock update
          await db.sync_queue.add({
            table_name: 'stock',
            operation: 'UPDATE',
            payload: { ...stock, quantity: newQty },
            created_at: Date.now()
          });
        }
      });
      setIsStockModalOpen(false);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Erreur lors de la mise à jour du stock');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingProduct?.id || crypto.randomUUID();
    const entityId = user?.entity_id;
    if (!entityId) {
      console.error('No entity ID found for current user');
      return;
    }
    
    const productData: Product = {
      id,
      name: formData.name,
      price_buy: Number(formData.price_buy),
      price_sell: Number(formData.price_sell),
      barcode: formData.barcode,
      entity_id: entityId,
      active: true,
      product_type: formData.product_type
    };

    try {
      await db.transaction('rw', [db.products, db.stock, db.sync_queue], async () => {
        if (editingProduct) {
          await db.products.update(id, productData);
          await db.sync_queue.add({
            table_name: 'products',
            operation: 'UPDATE',
            payload: productData,
            created_at: Date.now()
          });
        } else {
          await db.products.add(productData);
          // Initialize stock
          const stockId = crypto.randomUUID();
          await db.stock.add({
            id: stockId,
            product_id: id,
            entity_id: entityId,
            quantity: Number(formData.initial_stock),
            min_threshold: Number(formData.min_threshold)
          });

          await db.sync_queue.add({
            table_name: 'products',
            operation: 'INSERT',
            payload: productData,
            created_at: Date.now()
          });
          
          await db.sync_queue.add({
            table_name: 'stock',
            operation: 'INSERT',
            payload: { 
              id: stockId, 
              product_id: id, 
              entity_id: entityId, 
              quantity: formData.initial_stock, 
              min_threshold: formData.min_threshold
            },
            created_at: Date.now()
          });
        }
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erreur lors de l\'enregistrement du produit');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await db.products.delete(id);
    await db.sync_queue.add({
      table_name: 'products',
      operation: 'DELETE',
      payload: { id },
      created_at: Date.now()
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Produits</h1>
          <p className="text-neutral-500 text-sm">Gérez votre catalogue et vos prix</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center py-3"
        >
          <Plus size={18} />
          <span>Ajouter un produit</span>
        </button>
      </header>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label-sm">Type de Produit</label>
                <select 
                  className="input-field"
                  value={formData.product_type}
                  onChange={e => setFormData({...formData, product_type: e.target.value as any})}
                >
                  <option value="finished_good">Produit Fini (Vente)</option>
                  <option value="raw_material">Matière Première (Production)</option>
                </select>
              </div>
              <div>
                <label className="label-sm">Nom du produit</label>
                <input 
                  required
                  type="text" 
                  className="input-field"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-sm">Prix d'achat (FCFA)</label>
                  <input 
                    required
                    type="number" 
                    className="input-field"
                    value={formData.price_buy}
                    onChange={e => setFormData({...formData, price_buy: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="label-sm">Prix de vente (FCFA)</label>
                  <input 
                    required
                    type="number" 
                    className="input-field"
                    value={formData.price_sell}
                    onChange={e => setFormData({...formData, price_sell: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="label-sm">Code-barres (Optionnel)</label>
                <input 
                  type="text" 
                  className="input-field"
                  value={formData.barcode}
                  onChange={e => setFormData({...formData, barcode: e.target.value})}
                />
              </div>
              {!editingProduct && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-sm">Stock initial</label>
                      <input 
                        type="number" 
                        className="input-field"
                        value={formData.initial_stock}
                        onChange={e => setFormData({...formData, initial_stock: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="label-sm">Seuil d'alerte</label>
                      <input 
                        type="number" 
                        className="input-field"
                        value={formData.min_threshold}
                        onChange={e => setFormData({...formData, min_threshold: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </>
              )}
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
          </div>
        </div>
      )}

      <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-bottom border-neutral-100 bg-neutral-50/50">
          <div className="input-icon-wrapper max-w-md">
            <input 
              type="text" 
              placeholder="Rechercher un produit..." 
              className="input-field pl-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="input-icon" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-[10px] uppercase tracking-widest font-bold border-b border-neutral-200">
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Prix Achat</th>
                <th className="px-6 py-4">Prix Vente</th>
                <th className="px-6 py-4">Marge</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products?.map((product) => (
                <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-100 rounded-sm flex items-center justify-center text-neutral-400">
                        <Package size={16} />
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{product.price_buy.toLocaleString()} FCFA</td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-[#B45309]">{product.price_sell.toLocaleString()} FCFA</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
                      +{((product.price_sell - product.price_buy) / product.price_buy * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenStockModal(product)}
                        className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                        title="Ajouter du stock"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-neutral-400 hover:text-[#B45309] hover:bg-[#B45309]/5 rounded-sm transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-neutral-400 hover:text-error hover:bg-error/5 rounded-sm transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="opacity-20" />
                      <p>Aucun produit trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Réapprovisionnement : {editingProduct?.name}</h2>
              <button onClick={() => setIsStockModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStockIn} className="space-y-4">
              <div>
                <label className="label-sm">Quantité à ajouter</label>
                <input 
                  required
                  type="number" 
                  className="input-field"
                  value={stockFormData.quantity}
                  onChange={e => setStockFormData({...stockFormData, quantity: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="label-sm">Notes / Référence (Optionnel)</label>
                <textarea 
                  className="input-field min-h-[80px] py-2"
                  value={stockFormData.notes}
                  onChange={e => setStockFormData({...stockFormData, notes: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
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
    </div>
  );
};
