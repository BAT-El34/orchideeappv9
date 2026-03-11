import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  RefreshCw,
  Calendar,
  ChevronRight,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../offline/dexie';
import { generateBusinessReport, getGeminiCooldown } from '../services/geminiService';
import { supabase } from '../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ReportsModule = () => {
  const invoices = useLiveQuery(() => db.invoices.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  
  const expenses = useLiveQuery(() => db.expenses.toArray());
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDailySynthesis, setShowDailySynthesis] = useState(false);
  const [entity, setEntity] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canGenerateSynthesis, setCanGenerateSynthesis] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getGeminiCooldown();
      setCooldown(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase.from('users').select('entity_id, role').eq('id', session.user.id).single();
        if (userData) {
          setUserRole(userData.role);
          
          // Fetch entity
          if (userData.entity_id) {
            const { data: entityData } = await supabase.from('entities').select('*').eq('id', userData.entity_id).single();
            setEntity(entityData);
          }

          // Check permissions
          if (userData.role === 'super_admin' || userData.role === 'admin') {
            setCanGenerateSynthesis(true);
          } else {
            const perm = await db.feature_permissions
              .where({ role: userData.role, feature_key: 'daily_synthesis' })
              .first();
            setCanGenerateSynthesis(perm ? perm.is_enabled : false);
          }
        }
      }
    };
    fetchUserAndPermissions();
  }, []);

  const dailyOperations = useMemo(() => {
    if (!invoices) return [];
    const today = new Date().toISOString().split('T')[0];
    return invoices.filter(inv => inv.date === today);
  }, [invoices]);

  const stats = useMemo(() => {
    if (!invoices || !expenses) return { totalSales: 0, totalMargin: 0, totalExpenses: 0, count: 0 };
    const sales = invoices.reduce((acc, inv) => ({
      totalSales: acc.totalSales + inv.total_sell,
      totalMargin: acc.totalMargin + inv.margin,
      count: acc.count + 1
    }), { totalSales: 0, totalMargin: 0, count: 0 });

    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { ...sales, totalExpenses: totalExp };
  }, [invoices, expenses]);

  const chartData = useMemo(() => {
    if (!invoices) return [];
    // Group by date
    const grouped = invoices.reduce((acc: any, inv) => {
      const date = inv.date;
      acc[date] = (acc[date] || 0) + inv.total_sell;
      return acc;
    }, {});
    return Object.entries(grouped).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices]);

  const generateAIReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const invoiceLines = await db.invoice_lines.toArray();
      const data = {
        totalSales: stats.totalSales,
        totalMargin: stats.totalMargin,
        totalExpenses: stats.totalExpenses,
        netProfit: stats.totalMargin - stats.totalExpenses,
        transactionCount: stats.count,
        products: products?.map(p => ({ name: p.name, price: p.price_sell })),
        expenses: expenses?.map(e => ({ category: e.category, amount: e.amount })),
        recentSales: invoiceLines.slice(-50).map(l => ({ name: l.product_name_snapshot, qty: l.quantity, total: l.total_sell }))
      };
      
      const result = await generateBusinessReport(data);
      setReport(result);
    } catch (err: any) {
      console.error(err);
      if (err.message.startsWith('COOLDOWN:')) {
        const seconds = err.message.split(':')[1];
        setError(`Veuillez patienter ${seconds} secondes avant la prochaine analyse.`);
      } else {
        setError("Impossible de générer le rapport IA. Vérifiez votre connexion.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analyses & Rapports</h1>
          <p className="text-neutral-500 text-sm">Suivez vos performances et obtenez des conseils IA</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {canGenerateSynthesis && (
            <button 
              onClick={() => setShowDailySynthesis(true)}
              className="flex items-center gap-2 justify-center py-3 px-6 border border-[#B45309] text-[#B45309] font-bold uppercase tracking-widest text-[10px] hover:bg-[#B45309]/5 rounded-sm transition-colors"
            >
              <Calendar size={16} />
              <span>Synthèse Quotidienne</span>
            </button>
          )}
          <button 
            onClick={generateAIReport}
            disabled={loading || cooldown > 0}
            className={cn(
              "btn-primary flex items-center gap-2 py-3 px-6",
              (loading || cooldown > 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : cooldown > 0 ? (
              <Clock size={20} />
            ) : (
              <Lightbulb size={20} />
            )}
            <span>
              {loading ? "Analyse..." : cooldown > 0 ? `Attendre ${cooldown}s` : "Générer Analyse IA"}
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showDailySynthesis && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                <div>
                  <h2 className="text-xl font-serif italic text-neutral-900">Synthèse Quotidienne</h2>
                  <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setShowDailySynthesis(false)} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
                  <RefreshCw size={20} className="rotate-45" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto print:max-h-none" id="printable-synthesis">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-1">Établissement</p>
                    <h3 className="font-bold text-lg">{entity?.name || 'Orchidée Nature - Agence'}</h3>
                    <p className="text-sm text-neutral-500">ID Agence: {entity?.id?.slice(0, 8) || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-1">Statut Rapport</p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-sm">
                      Prêt pour Signature
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-sm">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Ventes (CA)</p>
                    <p className="font-mono font-bold text-sm">{dailyOperations.reduce((sum, inv) => sum + inv.total_sell, 0).toLocaleString()} FCFA</p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-sm">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Transactions</p>
                    <p className="font-mono font-bold text-sm">{dailyOperations.length}</p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-sm">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Marge Est.</p>
                    <p className="font-mono font-bold text-sm text-emerald-600">{dailyOperations.reduce((sum, inv) => sum + inv.margin, 0).toLocaleString()} FCFA</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 border-b border-neutral-100 pb-2">Détail des Opérations</h4>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-neutral-400 text-[10px] uppercase font-bold">
                        <th className="py-2">Heure</th>
                        <th className="py-2">Réf.</th>
                        <th className="py-2 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {dailyOperations.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-3 font-mono text-xs">{new Date(inv.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-3 text-xs font-medium uppercase tracking-tighter">{inv.id.slice(0, 8)}</td>
                          <td className="py-3 text-right font-mono font-bold">{inv.total_sell.toLocaleString()}</td>
                        </tr>
                      ))}
                      {dailyOperations.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-neutral-400 italic">Aucune opération aujourd'hui</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-12 grid grid-cols-2 gap-12">
                  <div className="border-t border-neutral-200 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-8">Signature Agence</p>
                    <div className="h-12 border-b border-dashed border-neutral-200" />
                  </div>
                  <div className="border-t border-neutral-200 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-8">Signature Comptable</p>
                    <div className="h-12 border-b border-dashed border-neutral-200" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <TrendingUp size={18} className="rotate-90" />
                  <span>Imprimer & Signer</span>
                </button>
                <button 
                  onClick={() => setShowDailySynthesis(false)}
                  className="px-6 py-3 border border-neutral-200 font-bold uppercase tracking-widest text-[10px] hover:bg-white rounded-sm transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Ventes Totales</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold font-mono">{stats.totalSales.toLocaleString()} FCFA</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Marge Brute</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold font-mono">{stats.totalMargin.toLocaleString()} FCFA</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Dépenses Opér.</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold font-mono text-red-600">{stats.totalExpenses.toLocaleString()} FCFA</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Bénéfice Net</p>
          <div className="flex items-end gap-2">
            <span className={cn(
              "text-2xl font-bold font-mono",
              (stats.totalMargin - stats.totalExpenses) >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {(stats.totalMargin - stats.totalExpenses).toLocaleString()} FCFA
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp size={18} className="text-[#B45309]" />
              Évolution des Ventes
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-neutral-100 text-xs font-bold rounded-sm">7J</button>
              <button className="px-3 py-1 text-xs font-bold text-neutral-400">30J</button>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f8f8f8' }}
                />
                <Bar dataKey="total" fill="#B45309" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Report Sidebar */}
        <div className="space-y-6">
          {report ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#B45309] text-white p-6 rounded-sm shadow-lg overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Lightbulb size={120} />
              </div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Lightbulb size={20} />
                Analyse IA
              </h3>
              <div className="space-y-6 relative z-10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Résumé</p>
                  <p className="text-sm leading-relaxed">{report.summary}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Top Produits</p>
                  <div className="space-y-2">
                    {report.topProducts.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-white/10 p-2 rounded-sm text-sm">
                        <span>{p.name}</span>
                        <span className="font-mono font-bold">{p.sales}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Recommandations</p>
                  <ul className="space-y-2">
                    {report.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-sm flex gap-2">
                        <ChevronRight size={16} className="shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-neutral-100 p-8 rounded-sm border border-dashed border-neutral-300 flex flex-col items-center justify-center text-center text-neutral-400 h-full min-h-[400px]">
              <BarChart3 size={48} className="mb-4 opacity-20" />
              <p className="text-sm">Cliquez sur "Générer Analyse IA" pour obtenir des insights personnalisés.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-sm border border-red-200 flex gap-3 text-red-800 text-sm">
              <AlertTriangle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
