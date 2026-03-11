import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  User as UserIcon, 
  Trash2, 
  Edit2, 
  X,
  AlertCircle
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Supplier, type User } from '../offline/dexie';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SuppliersModule = () => {
  const [user, setUser] = useState<User | null>(null);
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    category: 'Cosmétiques'
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

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        category: supplier.category || 'Cosmétiques'
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        category: 'Cosmétiques'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supplierData: Supplier = {
        id: editingSupplier?.id || crypto.randomUUID(),
        entity_id: user?.entity_id,
        ...formData,
        created_at: editingSupplier?.created_at || new Date().toISOString()
      };

      if (editingSupplier) {
        await db.suppliers.update(editingSupplier.id, supplierData);
        await db.sync_queue.add({
          table_name: 'suppliers',
          operation: 'UPDATE',
          payload: supplierData,
          created_at: Date.now()
        });
      } else {
        await db.suppliers.add(supplierData);
        await db.sync_queue.add({
          table_name: 'suppliers',
          operation: 'INSERT',
          payload: supplierData,
          created_at: Date.now()
        });
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Erreur lors de l\'enregistrement du fournisseur');
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    await db.suppliers.delete(id);
    await db.sync_queue.add({
      table_name: 'suppliers',
      operation: 'DELETE',
      payload: { id },
      created_at: Date.now()
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif italic text-neutral-900">Fournisseurs</h1>
          <p className="text-sm text-neutral-500">Gérez vos partenaires et sources d'approvisionnement</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#B45309] text-white px-4 py-2 rounded-sm hover:bg-[#92400E] transition-colors text-sm font-medium shadow-sm"
        >
          <Plus size={18} />
          Nouveau Fournisseur
        </button>
      </header>

      <div className="bg-white border border-neutral-200 rounded-sm shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] focus:border-[#B45309]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Fournisseur</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Catégorie</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{supplier.name}</span>
                      <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1">
                        <MapPin size={12} />
                        <span>{supplier.address || 'Pas d\'adresse'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <UserIcon size={14} className="text-neutral-400" />
                        <span>{supplier.contact_person || '-'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        {supplier.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={12} />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={12} />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {supplier.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(supplier)}
                        className="p-2 text-neutral-400 hover:text-[#B45309] hover:bg-[#B45309]/5 rounded-sm transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteSupplier(supplier.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <Truck size={32} className="opacity-10 mb-2" />
                      <p className="text-sm">Aucun fournisseur trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-100">
                <h2 className="text-xl font-serif italic text-neutral-900">
                  {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Nom du Fournisseur</label>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] focus:border-[#B45309]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Personne de Contact</label>
                      <input 
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] focus:border-[#B45309]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Catégorie</label>
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] focus:border-[#B45309]"
                      >
                        <option value="Cosmétiques">Cosmétiques</option>
                        <option value="Épices">Épices</option>
                        <option value="Emballages">Emballages</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Téléphone</label>
                      <input 
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] focus:border-[#B45309]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Email</label>
                      <input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] focus:border-[#B45309]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Adresse</label>
                    <textarea 
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B45309] focus:border-[#B45309]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-600 rounded-sm hover:bg-neutral-50 transition-colors text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#B45309] text-white rounded-sm hover:bg-[#92400E] transition-colors text-sm font-medium shadow-sm"
                  >
                    {editingSupplier ? 'Mettre à jour' : 'Enregistrer'}
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
