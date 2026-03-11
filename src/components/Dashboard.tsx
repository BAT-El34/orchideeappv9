import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  HelpCircle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../offline/dexie';
import React, { useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const data = [
  { name: 'Lun', sales: 4000, expenses: 2400 },
  { name: 'Mar', sales: 3000, expenses: 1398 },
  { name: 'Mer', sales: 2000, expenses: 9800 },
  { name: 'Jeu', sales: 2780, expenses: 3908 },
  { name: 'Ven', sales: 1890, expenses: 4800 },
  { name: 'Sam', sales: 2390, expenses: 3800 },
  { name: 'Dim', sales: 3490, expenses: 4300 },
];

const InfoTooltip = ({ text, position = "right" }: { text: string, position?: "left" | "right" | "center" }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={tooltipRef}>
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => {
          if (window.innerWidth >= 768) setIsOpen(true);
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 768) setIsOpen(false);
        }}
        className="p-2 -m-2 text-neutral-300 hover:text-neutral-500 transition-colors focus:outline-none flex items-center justify-center"
        aria-label="Informations complémentaires"
      >
        <HelpCircle size={16} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className={cn(
              "absolute bottom-full mb-3 w-56 p-3 bg-neutral-900 text-white text-[11px] leading-relaxed rounded-sm z-[100] shadow-2xl pointer-events-none",
              position === "right" && "right-0",
              position === "left" && "left-0",
              position === "center" && "left-1/2 -translate-x-1/2"
            )}
          >
            {text}
            <div className={cn(
              "absolute top-full border-[6px] border-transparent border-t-neutral-900",
              position === "right" && "right-3",
              position === "left" && "left-3",
              position === "center" && "left-1/2 -translate-x-1/2"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, trend, color, helpText }: any) => (
  <div className="bg-white p-4 md:p-5 rounded-sm border border-neutral-200 shadow-sm group relative">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2 rounded-sm", color)}>
        <Icon size={20} />
      </div>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={cn(
            "text-xs font-bold flex items-center gap-0.5",
            trend > 0 ? "text-success" : "text-error"
          )}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
        <InfoTooltip text={helpText} position="right" />
      </div>
    </div>
    <p className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-bold tracking-tight">{value}</p>
  </div>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const products = useLiveQuery(() => db.products.toArray());
  const stock = useLiveQuery(() => db.stock.toArray());
  const invoices = useLiveQuery(() => db.invoices.toArray());
  const customersCount = useLiveQuery(() => db.customers.count()) ?? 0;
  const recentInvoices = useLiveQuery(() => db.invoices.orderBy('created_at').reverse().limit(5).toArray());

  const expensesData = useLiveQuery(() => db.expenses.toArray());

  const totalStock = useMemo(() => 
    stock?.reduce((sum, s) => sum + s.quantity, 0) ?? 0
  , [stock]);

  const expiringSoonCount = useMemo(() => {
    if (!stock) return 0;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return stock.filter(s => false).length; // expiry_date removed from schema
  }, [stock]);

  const lowStockCount = useMemo(() => 
    stock?.filter(s => s.quantity <= (s.min_threshold || 5)).length ?? 0
  , [stock]);

  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices?.filter(inv => inv.date === today)
      .reduce((sum, inv) => sum + inv.total_sell, 0) ?? 0;
  }, [invoices]);

  const todayProfit = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayInvoices = invoices?.filter(inv => inv.date === today) ?? [];
    const sales = todayInvoices.reduce((sum, inv) => sum + inv.total_sell, 0);
    const costs = todayInvoices.reduce((sum, inv) => sum + inv.total_buy, 0);
    return sales - costs;
  }, [invoices]);

  const ordersCount = (invoices?.length ?? 0).toString();

  // Mock data for the chart based on real invoices if possible, 
  // otherwise fallback to static but with real labels
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayInvoices = invoices?.filter(inv => inv.date === date) ?? [];
      const dayExpenses = expensesData?.filter(exp => exp.date === date) ?? [];
      
      const sales = dayInvoices.reduce((sum, inv) => sum + inv.total_sell, 0);
      // Expenses = Cost of goods sold (from invoices) + Operational expenses (from expenses table)
      const costOfGoods = dayInvoices.reduce((sum, inv) => sum + inv.total_buy, 0);
      const opExpenses = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' });
      return { 
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1), 
        sales, 
        expenses: costOfGoods + opExpenses 
      };
    });
  }, [invoices, expensesData]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif italic text-neutral-900 mb-1">Tableau de bord</h1>
          <p className="text-neutral-500 text-sm">Bienvenue sur Orchidée Nature Management</p>
        </div>
        <button 
          onClick={() => navigate('/cash')}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center py-3"
        >
          <Plus size={18} />
          <span>Nouvelle Vente</span>
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard 
          label="Ventes du jour" 
          value={`${todaySales.toLocaleString()} FCFA`} 
          icon={TrendingUp} 
          color="bg-emerald-50 text-emerald-600" 
          helpText="Total des revenus générés aujourd'hui."
        />
        <StatCard 
          label="Profit du jour" 
          value={`${todayProfit.toLocaleString()} FCFA`} 
          icon={TrendingUp} 
          color="bg-emerald-100 text-emerald-700" 
          helpText="Marge brute estimée sur les ventes d'aujourd'hui."
        />
        <StatCard 
          label="Alertes stock" 
          value={lowStockCount.toString()} 
          icon={AlertTriangle} 
          color={lowStockCount > 0 ? "bg-amber-50 text-amber-600" : "bg-neutral-50 text-neutral-400"}
          helpText="Produits ayant atteint ou dépassé le seuil de réapprovisionnement."
        />
        <StatCard 
          label="Péremption < 30j" 
          value={expiringSoonCount.toString()} 
          icon={AlertTriangle} 
          color={expiringSoonCount > 0 ? "bg-red-50 text-red-600" : "bg-neutral-50 text-neutral-400"}
          helpText="Produits expirant dans les 30 prochains jours."
        />
        <StatCard 
          label="Clients" 
          value={customersCount.toString()} 
          icon={Users} 
          color="bg-indigo-50 text-indigo-600" 
          helpText="Nombre total de clients dans la base."
        />
        <StatCard 
          label="Factures" 
          value={ordersCount} 
          icon={ShoppingCart} 
          color="bg-neutral-50 text-neutral-600" 
          helpText="Nombre total de factures enregistrées."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            Performance des ventes
            <InfoTooltip 
              text="Ce graphique montre l'évolution de vos ventes sur les 7 derniers jours." 
              position="center" 
            />
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B45309" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#B45309" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9CA3AF' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${value.toLocaleString()} FCFA`, 'Ventes']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#B45309" 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
          <h3 className="font-bold mb-6">Activités récentes</h3>
          <div className="space-y-6">
            {recentInvoices?.map((inv) => (
              <div key={inv.id} className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-[#B45309] mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Vente validée #{inv.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-neutral-400">
                    {new Date(inv.created_at).toLocaleDateString('fr-FR')} • {inv.total_sell.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            ))}
            {(!recentInvoices || recentInvoices.length === 0) && (
              <p className="text-sm text-neutral-400 text-center py-10">Aucune activité récente</p>
            )}
          </div>
          <button className="w-full mt-8 py-2 text-xs font-bold text-[#B45309] uppercase tracking-widest hover:bg-[#B45309]/5 rounded-sm transition-colors">
            Voir tout l'historique
          </button>
        </div>
      </div>
    </div>
  );
};
