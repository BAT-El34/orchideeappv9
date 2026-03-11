import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  Save, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  History,
  Settings,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Tab = 'reports' | 'recipes' | 'supplies' | 'deliveries' | 'history';

export const ProductionModule = () => {
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [showNewReport, setShowNewReport] = useState(false);
  const [showNewRecipe, setShowNewRecipe] = useState(false);
  const [showNewSupplyRequest, setShowNewSupplyRequest] = useState(false);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  
  // Form states
  const [newRecipe, setNewRecipe] = useState({
    product_id: '',
    name: '',
    description: '',
    items: [{ component_id: '', quantity: 0, unit: '' }]
  });

  const [newReport, setNewReport] = useState({
    production_date: new Date().toISOString().split('T')[0],
    items: [{ product_id: '', quantity_produced: 0 }]
  });

  const [newSupplyRequest, setNewSupplyRequest] = useState({
    items: [{ product_id: '', quantity: 0, unit: '' }],
    priority: 'normal',
    notes: ''
  });

  const [newDelivery, setNewDelivery] = useState({
    destination_entity_id: '',
    items: [{ product_id: '', quantity: 0 }],
    notes: ''
  });

  const [entities, setEntities] = useState<any[]>([]);

  const handleSaveSupplyRequest = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.from('users').select('entity_id, full_name').eq('id', session?.user.id).single();

      const message = `Demande d'approvisionnement de la part de ${userData?.full_name} (Cuisine). 
      Articles : ${newSupplyRequest.items.map(i => {
        const p = products.find(prod => prod.id === i.product_id);
        return `${p?.name} (${i.quantity} ${i.unit})`;
      }).join(', ')}. 
      Priorité : ${newSupplyRequest.priority}. 
      Notes : ${newSupplyRequest.notes}`;

      const { error } = await supabase
        .from('notifications')
        .insert([{
          type: 'ORDER',
          message,
          entity_id: userData?.entity_id,
          from_user_id: session?.user.id,
          to_role: 'admin',
          status: 'pending'
        }]);

      if (error) throw error;
      alert('Demande d\'approvisionnement envoyée aux administrateurs.');
      setShowNewSupplyRequest(false);
      setNewSupplyRequest({ items: [{ product_id: '', quantity: 0, unit: '' }], priority: 'normal', notes: '' });
    } catch (error) {
      console.error('Error saving supply request:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  const handleSaveDelivery = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.from('users').select('entity_id, full_name').eq('id', session?.user.id).single();

      const destination = entities.find(e => e.id === newDelivery.destination_entity_id);
      const message = `Nouvelle livraison en cours depuis la Cuisine vers ${destination?.name}. 
      Articles : ${newDelivery.items.map(i => {
        const p = products.find(prod => prod.id === i.product_id);
        return `${p?.name} (${i.quantity} ${p?.unit})`;
      }).join(', ')}. 
      Notes : ${newDelivery.notes}`;

      const { error } = await supabase
        .from('notifications')
        .insert([{
          type: 'ORDER',
          message,
          entity_id: userData?.entity_id,
          from_user_id: session?.user.id,
          to_role: 'manager',
          status: 'pending'
        }]);

      if (error) throw error;
      alert('Livraison enregistrée et notification envoyée à l\'agence.');
      setShowNewDelivery(false);
      setNewDelivery({ destination_entity_id: '', items: [{ product_id: '', quantity: 0 }], notes: '' });
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('Erreur lors de l\'enregistrement de la livraison');
    }
  };

  const handleSaveRecipe = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.from('users').select('entity_id').eq('id', session?.user.id).single();

      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert([{ 
          product_id: newRecipe.product_id, 
          name: newRecipe.name, 
          description: newRecipe.description,
          entity_id: userData?.entity_id
        }])
        .select()
        .single();

      if (recipeError) throw recipeError;

      const recipeItems = newRecipe.items.map(item => ({
        recipe_id: recipeData.id,
        component_id: item.component_id,
        quantity: item.quantity,
        unit: item.unit
      }));

      const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(recipeItems);

      if (itemsError) throw itemsError;

      setShowNewRecipe(false);
      fetchData();
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Erreur lors de l\'enregistrement de la recette');
    }
  };

  const handleSaveReport = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.from('users').select('entity_id').eq('id', session?.user.id).single();
      
      const { data: logData, error: logError } = await supabase
        .from('production_logs')
        .insert([{ 
          production_date: newReport.production_date,
          produced_by: session?.user.id,
          entity_id: userData?.entity_id
        }])
        .select()
        .single();

      if (logError) throw logError;

      const reportItems = newReport.items.map(item => ({
        production_log_id: logData.id,
        product_id: item.product_id,
        quantity_produced: item.quantity_produced
      }));

      const { error: itemsError } = await supabase
        .from('production_items')
        .insert(reportItems);

      if (itemsError) throw itemsError;

      setShowNewReport(false);
      fetchData();
    } catch (error) {
      console.error('Error saving production report:', error);
      alert('Erreur lors de l\'enregistrement du rapport');
    }
  };

  const handleSaveAdjustment = async (productId: string, quantity: number, reason: string, notes: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.from('users').select('entity_id').eq('id', session?.user.id).single();

      const { error } = await supabase
        .from('stock_adjustments')
        .insert([{
          product_id: productId,
          quantity_change: -Math.abs(quantity), // Always negative for losses
          reason,
          notes,
          entity_id: userData?.entity_id,
          adjusted_by: session?.user.id
        }]);

      if (error) throw error;
      fetchData();
      alert('Perte enregistrée avec succès');
    } catch (error) {
      console.error('Error saving adjustment:', error);
      alert('Erreur lors de l\'enregistrement de la perte');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) return;
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Erreur lors de la suppression de la recette');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.from('users').select('entity_id').eq('id', session?.user.id).single();

      // Fetch products (raw materials and finished goods)
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      // Fetch entities for deliveries
      const { data: entitiesData } = await supabase
        .from('entities')
        .select('*')
        .neq('id', userData?.entity_id); // Exclude current entity (cuisine)

      // Fetch stock levels for current entity
      const { data: stockData } = await supabase
        .from('stock')
        .select('*, product:products(name, unit, product_type)')
        .eq('entity_id', userData?.entity_id);
      
      // Fetch recipes with their items
      const { data: recipesData } = await supabase
        .from('recipes')
        .select(`
          *,
          product:products(name, unit),
          items:recipe_items(
            *,
            component:products(name, unit)
          )
        `);

      // Fetch recent production logs
      const { data: logsData } = await supabase
        .from('production_logs')
        .select(`
          *,
          items:production_items(
            *,
            product:products(name, unit)
          )
        `)
        .order('production_date', { ascending: false })
        .limit(10);

      if (productsData) setProducts(productsData);
      if (entitiesData) setEntities(entitiesData);
      if (stockData) setStockLevels(stockData);
      if (recipesData) setRecipes(recipesData);
      if (logsData) setProductionLogs(logsData);

      // Fetch recent stock adjustments (losses)
      const { data: adjustmentsData } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          product:products(name, unit)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (adjustmentsData) setStockAdjustments(adjustmentsData);
    } catch (error) {
      console.error('Error fetching production data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#B45309] text-white rounded-sm">
            <ChefHat size={24} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestion de Production</h1>
        </div>
        <p className="text-neutral-500">Gérez vos recettes et suivez votre production quotidienne.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-[#B45309] text-[#B45309]'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={16} />
            Rapports de Production
          </div>
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'recipes'
              ? 'border-[#B45309] text-[#B45309]'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings size={16} />
            Recettes (BOM)
          </div>
        </button>
        <button
          onClick={() => setActiveTab('supplies')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'supplies'
              ? 'border-[#B45309] text-[#B45309]'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Plus size={16} />
            Approvisionnement
          </div>
        </button>
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'deliveries'
              ? 'border-[#B45309] text-[#B45309]'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowRight size={16} />
            Livraisons Agences
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-[#B45309] text-[#B45309]'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <History size={16} />
            Historique & Stocks
          </div>
        </button>
      </div>

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Rapports Récents</h2>
            <button 
              onClick={() => setShowNewReport(true)}
              className="bg-[#B45309] text-white px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 hover:bg-[#92400E] transition-colors"
            >
              <Plus size={18} />
              Nouveau Rapport
            </button>
          </div>

          {/* Modal Nouveau Rapport */}
          {showNewReport && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-sm w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Nouveau Rapport de Production</h3>
                  <button onClick={() => setShowNewReport(false)} className="text-neutral-400 hover:text-neutral-600">
                    <XCircle size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Date de Production</label>
                    <input 
                      type="date" 
                      value={newReport.production_date}
                      onChange={(e) => setNewReport({...newReport, production_date: e.target.value})}
                      className="w-full p-2 border border-neutral-200 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Produits Fabriqués</label>
                    {newReport.items.map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <select 
                          className="flex-1 p-2 border border-neutral-200 rounded-sm"
                          value={item.product_id}
                          onChange={(e) => {
                            const newItems = [...newReport.items];
                            newItems[index].product_id = e.target.value;
                            setNewReport({...newReport, items: newItems});
                          }}
                        >
                          <option value="">Sélectionner un produit fini</option>
                          {products.filter(p => p.product_type === 'finished_good').map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          placeholder="Qté"
                          className="w-24 p-2 border border-neutral-200 rounded-sm"
                          value={item.quantity_produced}
                          onChange={(e) => {
                            const newItems = [...newReport.items];
                            newItems[index].quantity_produced = parseFloat(e.target.value);
                            setNewReport({...newReport, items: newItems});
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleSaveReport}
                    className="w-full bg-[#B45309] text-white py-3 rounded-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Valider la Production
                  </button>
                </div>
              </div>
            </div>
          )}

          {productionLogs.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-sm p-12 text-center">
              <div className="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-1">Aucun rapport de production</h3>
              <p className="text-neutral-500 max-w-xs mx-auto mb-6">
                Commencez par enregistrer votre production d'aujourd'hui pour suivre vos stocks.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {productionLogs.map((log) => (
                <div key={log.id} className="bg-white border border-neutral-200 rounded-sm p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-neutral-500">
                          {new Date(log.production_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold uppercase rounded-full">
                          Terminé
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">ID: {log.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {log.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-t border-neutral-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-500">
                            <ChefHat size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{item.product?.name}</p>
                            <p className="text-xs text-neutral-500">Produit fini</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#B45309]">+{item.quantity_produced} {item.product?.unit}</p>
                          <p className="text-[10px] text-neutral-400 uppercase font-bold">Stock mis à jour</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Recettes & BOM</h2>
            <button 
              onClick={() => setShowNewRecipe(true)}
              className="bg-[#B45309] text-white px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 hover:bg-[#92400E] transition-colors"
            >
              <Plus size={18} />
              Nouvelle Recette
            </button>
          </div>

          {/* Modal Nouvelle Recette */}
          {showNewRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Configurer une Recette</h3>
              <button onClick={() => setShowNewRecipe(false)} className="text-neutral-400 hover:text-neutral-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Produit Fini</label>
                  <select 
                    className="w-full p-2 border border-neutral-200 rounded-sm"
                    value={newRecipe.product_id}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      setNewRecipe({...newRecipe, product_id: e.target.value, name: `Recette ${prod?.name || ''}`});
                    }}
                  >
                    <option value="">Sélectionner le produit à fabriquer</option>
                    {products.filter(p => p.product_type === 'finished_good').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nom de la Recette</label>
                  <input 
                    type="text" 
                    value={newRecipe.name}
                    onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                    placeholder="Ex: Recette Standard Pain"
                    className="w-full p-2 border border-neutral-200 rounded-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-neutral-500 uppercase">Ingrédients / Matières Premières</label>
                  <button 
                    onClick={() => setNewRecipe({
                      ...newRecipe, 
                      items: [...newRecipe.items, { component_id: '', quantity: 0, unit: '' }]
                    })}
                    className="text-[#B45309] text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Ajouter un ingrédient
                  </button>
                </div>
                
                <div className="space-y-2">
                  {newRecipe.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select 
                        className="flex-1 p-2 border border-neutral-200 rounded-sm text-sm"
                        value={item.component_id}
                        onChange={(e) => {
                          const prod = products.find(p => p.id === e.target.value);
                          const newItems = [...newRecipe.items];
                          newItems[index].component_id = e.target.value;
                          newItems[index].unit = prod?.unit || '';
                          setNewRecipe({...newRecipe, items: newItems});
                        }}
                      >
                        <option value="">Choisir une matière première</option>
                        {products.filter(p => p.product_type === 'raw_material').map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        placeholder="Qté"
                        className="w-24 p-2 border border-neutral-200 rounded-sm text-sm"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...newRecipe.items];
                          newItems[index].quantity = parseFloat(e.target.value);
                          setNewRecipe({...newRecipe, items: newItems});
                        }}
                      />
                      <span className="text-xs text-neutral-400 w-12">{item.unit}</span>
                      <button 
                        onClick={() => {
                          const newItems = newRecipe.items.filter((_, i) => i !== index);
                          setNewRecipe({...newRecipe, items: newItems});
                        }}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSaveRecipe}
                disabled={!newRecipe.product_id || newRecipe.items.some(i => !i.component_id)}
                className="w-full bg-[#B45309] text-white py-3 rounded-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                Enregistrer la Recette
              </button>
            </div>
          </div>
        </div>
      )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
                  <h3 className="font-bold text-neutral-900">{recipe.product?.name}</h3>
                  <p className="text-xs text-neutral-500">{recipe.description || 'Aucune description'}</p>
                </div>
                <div className="p-4 flex-1">
                  <h4 className="text-[10px] uppercase font-bold text-neutral-400 mb-3 tracking-wider">Ingrédients (pour 1 {recipe.product?.unit})</h4>
                  <div className="space-y-3">
                    {recipe.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-neutral-600">{item.component?.name}</span>
                        <span className="font-mono font-bold">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-between">
                  <button className="text-xs font-bold text-neutral-500 hover:text-neutral-700">Modifier</button>
                  <button 
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'supplies' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Demandes d'Approvisionnement</h2>
            <button 
              onClick={() => setShowNewSupplyRequest(true)}
              className="bg-[#B45309] text-white px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 hover:bg-[#92400E] transition-colors"
            >
              <Plus size={18} />
              Nouvelle Demande
            </button>
          </div>

          {/* Modal Nouvelle Demande */}
          {showNewSupplyRequest && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-sm w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Nouvelle Demande d'Appro</h3>
                  <button onClick={() => setShowNewSupplyRequest(false)} className="text-neutral-400 hover:text-neutral-600">
                    <XCircle size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Priorité</label>
                    <select 
                      className="w-full p-2 border border-neutral-200 rounded-sm"
                      value={newSupplyRequest.priority}
                      onChange={(e) => setNewSupplyRequest({...newSupplyRequest, priority: e.target.value})}
                    >
                      <option value="low">Basse</option>
                      <option value="normal">Normale</option>
                      <option value="high">Haute / Urgente</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-neutral-500 uppercase">Articles à commander</label>
                      <button 
                        onClick={() => setNewSupplyRequest({
                          ...newSupplyRequest, 
                          items: [...newSupplyRequest.items, { product_id: '', quantity: 0, unit: '' }]
                        })}
                        className="text-[#B45309] text-[10px] font-bold uppercase"
                      >
                        + Ajouter
                      </button>
                    </div>
                    {newSupplyRequest.items.map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <select 
                          className="flex-1 p-2 border border-neutral-200 rounded-sm text-sm"
                          value={item.product_id}
                          onChange={(e) => {
                            const p = products.find(prod => prod.id === e.target.value);
                            const newItems = [...newSupplyRequest.items];
                            newItems[index].product_id = e.target.value;
                            newItems[index].unit = p?.unit || '';
                            setNewSupplyRequest({...newSupplyRequest, items: newItems});
                          }}
                        >
                          <option value="">Sélectionner un produit</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          placeholder="Qté"
                          className="w-24 p-2 border border-neutral-200 rounded-sm text-sm"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...newSupplyRequest.items];
                            newItems[index].quantity = parseFloat(e.target.value);
                            setNewSupplyRequest({...newSupplyRequest, items: newItems});
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Notes</label>
                    <textarea 
                      className="w-full p-2 border border-neutral-200 rounded-sm text-sm"
                      rows={3}
                      value={newSupplyRequest.notes}
                      onChange={(e) => setNewSupplyRequest({...newSupplyRequest, notes: e.target.value})}
                      placeholder="Détails supplémentaires..."
                    />
                  </div>

                  <button 
                    onClick={handleSaveSupplyRequest}
                    className="w-full bg-[#B45309] text-white py-3 rounded-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Envoyer la Demande
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-sm p-6">
            <h3 className="text-sm font-bold mb-4">État des Stocks & Alertes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="pb-3 font-bold text-neutral-400 uppercase text-[10px]">Produit</th>
                    <th className="pb-3 font-bold text-neutral-400 uppercase text-[10px]">Type</th>
                    <th className="pb-3 font-bold text-neutral-400 uppercase text-[10px]">Stock Actuel</th>
                    <th className="pb-3 font-bold text-neutral-400 uppercase text-[10px]">Seuil Alerte</th>
                    <th className="pb-3 font-bold text-neutral-400 uppercase text-[10px]">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {stockLevels.map((stock) => {
                    const isLow = stock.quantity <= (stock.min_threshold || 0);
                    return (
                      <tr key={stock.id}>
                        <td className="py-3 font-medium">{stock.product?.name}</td>
                        <td className="py-3 text-xs text-neutral-500">
                          {stock.product?.product_type === 'raw_material' ? 'Matière Première' : 'Produit Fini'}
                        </td>
                        <td className="py-3 font-mono font-bold">{stock.quantity} {stock.product?.unit}</td>
                        <td className="py-3 font-mono text-neutral-400">{stock.min_threshold || 0} {stock.product?.unit}</td>
                        <td className="py-3">
                          {isLow ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-full">Critique</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full">Correct</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Livraisons aux Agences</h2>
            <button 
              onClick={() => setShowNewDelivery(true)}
              className="bg-[#B45309] text-white px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 hover:bg-[#92400E] transition-colors"
            >
              <Plus size={18} />
              Nouvelle Livraison
            </button>
          </div>

          {/* Modal Nouvelle Livraison */}
          {showNewDelivery && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-sm w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Enregistrer une Livraison</h3>
                  <button onClick={() => setShowNewDelivery(false)} className="text-neutral-400 hover:text-neutral-600">
                    <XCircle size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Agence Destinataire</label>
                    <select 
                      className="w-full p-2 border border-neutral-200 rounded-sm"
                      value={newDelivery.destination_entity_id}
                      onChange={(e) => setNewDelivery({...newDelivery, destination_entity_id: e.target.value})}
                    >
                      <option value="">Sélectionner une agence</option>
                      {entities.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-neutral-500 uppercase">Produits livrés</label>
                      <button 
                        onClick={() => setNewDelivery({
                          ...newDelivery, 
                          items: [...newDelivery.items, { product_id: '', quantity: 0 }]
                        })}
                        className="text-[#B45309] text-[10px] font-bold uppercase"
                      >
                        + Ajouter
                      </button>
                    </div>
                    {newDelivery.items.map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <select 
                          className="flex-1 p-2 border border-neutral-200 rounded-sm text-sm"
                          value={item.product_id}
                          onChange={(e) => {
                            const newItems = [...newDelivery.items];
                            newItems[index].product_id = e.target.value;
                            setNewDelivery({...newDelivery, items: newItems});
                          }}
                        >
                          <option value="">Sélectionner un produit fini</option>
                          {products.filter(p => p.product_type === 'finished_good').map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          placeholder="Qté"
                          className="w-24 p-2 border border-neutral-200 rounded-sm text-sm"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...newDelivery.items];
                            newItems[index].quantity = parseFloat(e.target.value);
                            setNewDelivery({...newDelivery, items: newItems});
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Notes de livraison</label>
                    <textarea 
                      className="w-full p-2 border border-neutral-200 rounded-sm text-sm"
                      rows={3}
                      value={newDelivery.notes}
                      onChange={(e) => setNewDelivery({...newDelivery, notes: e.target.value})}
                      placeholder="Ex: Livré par Jean, transport frais..."
                    />
                  </div>

                  <button 
                    onClick={handleSaveDelivery}
                    className="w-full bg-[#B45309] text-white py-3 rounded-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Enregistrer & Notifier
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-sm p-12 text-center">
            <div className="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowRight size={32} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Suivi des Livraisons</h3>
            <p className="text-neutral-500 max-w-xs mx-auto">
              Enregistrez ici les produits finis envoyés aux agences pour mettre à jour les stocks globaux.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 rounded-sm p-6 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Rendement Moyen</p>
              <p className="text-2xl font-bold text-emerald-600">94%</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-sm p-6 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Pertes du mois</p>
              <p className="text-2xl font-bold text-red-600">
                {stockAdjustments.reduce((acc, adj) => acc + Math.abs(adj.quantity_change), 0).toFixed(2)} unités
              </p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-sm p-6 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Alertes Stock</p>
              <p className="text-2xl font-bold text-amber-600">2 critiques</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enregistrer une perte */}
            <div className="bg-white border border-neutral-200 rounded-sm p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" />
                Enregistrer une Perte / Casse
              </h3>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const productId = (form.elements.namedItem('product_id') as HTMLSelectElement).value;
                  const quantity = parseFloat((form.elements.namedItem('quantity') as HTMLInputElement).value);
                  const reason = (form.elements.namedItem('reason') as HTMLSelectElement).value;
                  const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
                  handleSaveAdjustment(productId, quantity, reason, notes);
                  form.reset();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Produit concerné</label>
                  <select name="product_id" required className="w-full p-2 border border-neutral-200 rounded-sm text-sm">
                    <option value="">Sélectionner un produit</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Quantité perdue</label>
                    <input name="quantity" type="number" step="0.001" required className="w-full p-2 border border-neutral-200 rounded-sm text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Raison</label>
                    <select name="reason" required className="w-full p-2 border border-neutral-200 rounded-sm text-sm">
                      <option value="loss">Perte / Casse</option>
                      <option value="expired">Péremption</option>
                      <option value="theft">Vol</option>
                      <option value="inventory_correction">Correction Inventaire</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Notes / Détails</label>
                  <textarea name="notes" rows={2} className="w-full p-2 border border-neutral-200 rounded-sm text-sm" placeholder="Ex: Sac de farine déchiré..."></textarea>
                </div>
                <button type="submit" className="w-full bg-red-600 text-white py-2 rounded-sm font-bold text-sm hover:bg-red-700 transition-colors">
                  Valider l'ajustement
                </button>
              </form>
            </div>

            {/* Historique des ajustements */}
            <div className="bg-white border border-neutral-200 rounded-sm p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <History size={20} className="text-neutral-500" />
                Derniers Ajustements
              </h3>
              <div className="space-y-4">
                {stockAdjustments.length === 0 ? (
                  <p className="text-center text-neutral-400 py-8 italic">Aucun ajustement récent</p>
                ) : (
                  stockAdjustments.map((adj) => (
                    <div key={adj.id} className="flex justify-between items-center py-3 border-b border-neutral-50 last:border-0">
                      <div>
                        <p className="text-sm font-bold">{adj.product?.name}</p>
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">
                          {new Date(adj.created_at).toLocaleDateString()} - {adj.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${adj.quantity_change < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change} {adj.product?.unit}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
