import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2,
  ChevronRight,
  Package,
  CreditCard,
  Banknote,
  X,
  MessageCircle,
  PenTool,
  Eraser,
  Clock
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Invoice, type InvoiceLine, type Stock, type User } from '../offline/dexie';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Receipt } from '../components/Receipt';
import { AutoFilterSelect } from '../components/AutoFilterSelect';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import SignatureCanvas from 'react-signature-canvas';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CartItem extends Product {
  quantity: number;
}

export const BillingModule = () => {
  const [user, setUser] = useState<User | null>(null);
  const allProducts = useLiveQuery(() => db.products.toArray());
  
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

  const activeProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => p && (p.active === true || (p as any).active === 1));
  }, [allProducts]);

  const customers = useLiveQuery(() => db.customers.toArray());
  const stock = useLiveQuery(() => db.stock.toArray());
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [lastInvoice, setLastInvoice] = useState<{ invoice: Invoice, lines: InvoiceLine[] } | null>(null);
  const sigPad = useRef<SignatureCanvas>(null);
  const [isSigning, setIsSigning] = useState(false);

  const handleSaveSignature = async () => {
    if (!sigPad.current || sigPad.current.isEmpty() || !lastInvoice) return;
    
    const signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    
    try {
      await db.invoices.update(lastInvoice.invoice.id, { signature: signatureData });
      setLastInvoice({
        ...lastInvoice,
        invoice: { ...lastInvoice.invoice, signature: signatureData }
      });
      setIsSigning(false);
      alert('Signature enregistrée avec succès !');
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Erreur lors de l\'enregistrement de la signature');
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastInvoice) return;
    const text = `Preuve de transaction Orchidée Nature\nFacture: ${lastInvoice.invoice.id.substring(0, 8)}\nTotal: ${lastInvoice.invoice.total_sell} FCFA\nLien de preuve: ${window.location.origin}/proof/${lastInvoice.invoice.id}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredProducts = useMemo(() => {
    if (!activeProducts) return [];
    if (!search) return activeProducts.slice(0, 15);
    const s = search.toLowerCase();
    return activeProducts.filter(p => 
      p.name.toLowerCase().includes(s) || 
      p.barcode?.includes(s)
    ).slice(0, 20);
  }, [activeProducts, search]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price_sell * item.quantity), 0)
  , [cart]);

  const cartItemsCount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0)
  , [cart]);

  const [amountReceived, setAmountReceived] = useState<number | string>('');
  const change = useMemo(() => {
    const received = typeof amountReceived === 'string' ? parseFloat(amountReceived) : amountReceived;
    if (isNaN(received) || received < total) return 0;
    return received - total;
  }, [amountReceived, total]);

  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID'>('PAID');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE' | 'CARD'>('CASH');

  const updatePrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, price_sell: newPrice };
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    if (paymentStatus === 'UNPAID' && !selectedCustomerId) {
      alert('Le client est obligatoire pour une vente à crédit (non payée).');
      return;
    }

    const received = typeof amountReceived === 'string' ? parseFloat(amountReceived) : amountReceived;
    if (paymentStatus === 'PAID' && received && received < total) {
      alert('Le montant reçu est inférieur au total de la vente.');
      return;
    }

    setIsProcessing(true);

    try {
      const invoiceId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const invoice: Invoice = {
        id: invoiceId,
        entity_id: user?.entity_id,
        user_id: user?.id,
        customer_id: selectedCustomerId || undefined,
        date: now.split('T')[0],
        total_buy: cart.reduce((sum, item) => sum + (item.price_buy * item.quantity), 0),
        total_sell: total,
        margin: total - cart.reduce((sum, item) => sum + (item.price_buy * item.quantity), 0),
        status: paymentStatus,
        notes: `Payment: ${paymentMethod}`,
        created_at: now
      };

      const lines: InvoiceLine[] = cart.map(item => {
        const originalProduct = activeProducts.find(p => p.id === item.id);
        return {
          id: crypto.randomUUID(),
          invoice_id: invoiceId,
          product_id: item.id,
          product_name_snapshot: item.name,
          quantity: item.quantity,
          price_buy: item.price_buy,
          price_sell: item.price_sell,
          total_buy: item.price_buy * item.quantity,
          total_sell: item.price_sell * item.quantity
        };
      });

      // Save locally
      await db.transaction('rw', [db.invoices, db.invoice_lines, db.sync_queue, db.stock, db.customers], async () => {
        await db.invoices.add(invoice);
        await db.invoice_lines.bulkAdd(lines);
        
        // Update stock (optimistic)
        for (const item of cart) {
          const stockItem = await db.stock.where('product_id').equals(item.id).first();
          if (stockItem) {
            await db.stock.update(stockItem.id, { quantity: stockItem.quantity - item.quantity });
          }
        }

        // Award loyalty points (1 point per 1000 FCFA)
        if (selectedCustomerId) {
          const customer = await db.customers.get(selectedCustomerId);
          if (customer) {
            const pointsToAdd = Math.floor(total / 1000);
            const updatedCustomer = {
              ...customer,
              loyalty_points: (customer.loyalty_points || 0) + pointsToAdd
            };
            await db.customers.update(selectedCustomerId, updatedCustomer);
            
            await db.sync_queue.add({
              table_name: 'customers',
              operation: 'UPDATE',
              payload: updatedCustomer,
              created_at: Date.now()
            });
          }
        }

        // Add to sync queue
        await db.sync_queue.add({
          table_name: 'invoices',
          operation: 'INSERT',
          payload: invoice,
          created_at: Date.now()
        });
        
        for (const line of lines) {
          await db.sync_queue.add({
            table_name: 'invoice_lines',
            operation: 'INSERT',
            payload: line,
            created_at: Date.now()
          });
        }
      });

      setCart([]);
      setIsCartOpen(false);
      setLastInvoice({ invoice, lines });
      setShowSuccess(true);
      setAmountReceived('');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erreur lors de la validation de la facture');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50 md:flex-row overflow-hidden">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col min-h-0 border-r border-neutral-200 pb-20 md:pb-0">
        <header className="p-4 bg-white border-b border-neutral-200 sticky top-0 z-10">
          <div className="input-icon-wrapper">
            <input 
              type="text"
              placeholder="Rechercher un produit..."
              className="input-field pl-11 h-12 text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="input-icon" size={20} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {filteredProducts.map(product => {
            const productStock = stock?.find(s => s.product_id === product.id);
            const isLowStock = productStock && productStock.quantity <= (productStock.min_threshold || 5);
            const isOutOfStock = productStock && productStock.quantity <= 0;

            return (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.95 }}
                disabled={isOutOfStock}
                onClick={() => addToCart(product)}
                className={cn(
                  "bg-white p-3 md:p-4 rounded-sm border border-neutral-200 shadow-sm flex flex-col items-start text-left hover:border-[#B45309] transition-colors group relative",
                  isOutOfStock && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                {isOutOfStock && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-widest">Épuisé</span>
                  </div>
                )}
                <div className="w-full aspect-square bg-neutral-100 rounded-sm mb-2 md:mb-3 flex items-center justify-center text-neutral-400 group-hover:bg-[#B45309]/5 group-hover:text-[#B45309] transition-colors">
                  <Package size={24} className="md:w-8 md:h-8" />
                </div>
                <div className="flex justify-between items-start w-full mb-1">
                  <h4 className="font-bold text-xs md:text-sm line-clamp-2 h-8 md:h-10 flex-1">{product.name}</h4>
                  {productStock && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1",
                      isOutOfStock ? "bg-red-100 text-red-600" : 
                      isLowStock ? "bg-amber-100 text-amber-600" : 
                      "bg-emerald-100 text-emerald-600"
                    )}>
                      {productStock.quantity}
                    </span>
                  )}
                </div>
                <p className="text-[#B45309] font-mono font-bold text-xs md:text-sm">{product.price_sell.toLocaleString()} FCFA</p>
              </motion.button>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center text-neutral-400">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucun produit trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Floating Button */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCartOpen(true)}
          className="bg-[#B45309] text-white p-4 rounded-full shadow-2xl flex items-center gap-3"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            {cartItemsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-[#B45309] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#B45309]">
                {cartItemsCount}
              </span>
            )}
          </div>
          <span className="font-bold font-mono">{total.toLocaleString()} FCFA</span>
        </motion.button>
      </div>

      {/* Cart / Checkout Area (Desktop Sidebar & Mobile Drawer) */}
      <AnimatePresence>
        {(isCartOpen || window.innerWidth >= 768) && (
          <>
            {/* Mobile Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "fixed top-0 right-0 h-full w-full max-w-md bg-white flex flex-col shadow-2xl z-50 md:relative md:w-96 md:shadow-none md:z-20 md:translate-x-0",
                !isCartOpen && "hidden md:flex"
              )}
            >
              <header className="p-4 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} className="text-[#B45309]" />
                  <h2 className="font-bold">Panier ({cartItemsCount})</h2>
                </div>
                <div className="flex items-center gap-4">
                  {cart.length > 0 && (
                    <button onClick={() => setCart([])} className="text-xs text-red-500 font-bold uppercase tracking-wider hover:underline">
                      Vider
                    </button>
                  )}
                  <button onClick={() => setIsCartOpen(false)} className="md:hidden p-2 bg-neutral-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-neutral-50 p-3 rounded-sm border border-neutral-200">
                  <AutoFilterSelect 
                    label="Client (Fidélité)"
                    placeholder="Client de passage"
                    options={customers?.map(c => ({ 
                      id: c.id, 
                      label: c.name, 
                      sublabel: `${c.loyalty_points} points • ${c.phone || 'Pas de tel'}` 
                    })) || []}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {cart.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-3 items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{item.name}</h4>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            className="w-20 text-xs bg-transparent border-b border-neutral-200 focus:border-[#B45309] focus:outline-none font-mono"
                            value={item.price_sell}
                            onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-[10px] text-neutral-400">x {item.quantity}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-neutral-50 rounded-sm p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-sm transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-sm transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-300 py-20">
                    <ShoppingCart size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Votre panier est vide</p>
                  </div>
                )}
              </div>

              <footer className="p-6 border-t border-neutral-100 bg-neutral-50/50 pb-safe">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>Articles</span>
                    <span>{cartItemsCount}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-neutral-200">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Montant Reçu</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-32 text-right bg-white border border-neutral-200 rounded-sm px-2 py-1 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                      />
                    </div>
                    {change > 0 && (
                      <div className="flex justify-between items-center mb-2 text-emerald-600">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Reliquat à rendre</span>
                        <span className="font-mono font-bold">{change.toLocaleString()} FCFA</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-end pt-2 border-t border-neutral-200">
                    <span className="font-bold">TOTAL</span>
                    <span className="text-2xl font-bold text-[#B45309] font-mono">{total.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button 
                    onClick={() => setPaymentStatus('PAID')}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 border-2 rounded-sm transition-all",
                      paymentStatus === 'PAID' ? "border-[#B45309] bg-[#B45309]/5 text-[#B45309]" : "border-neutral-200 text-neutral-400"
                    )}
                  >
                    <CheckCircle2 size={20} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase">Payé</span>
                  </button>
                  <button 
                    onClick={() => setPaymentStatus('UNPAID')}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 border-2 rounded-sm transition-all",
                      paymentStatus === 'UNPAID' ? "border-red-500 bg-red-50 text-red-600" : "border-neutral-200 text-neutral-400"
                    )}
                  >
                    <Clock size={20} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase">À Crédit</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button 
                    onClick={() => setPaymentMethod('CASH')}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 border rounded-sm transition-all",
                      paymentMethod === 'CASH' ? "border-[#B45309] bg-[#B45309]/5 text-[#B45309]" : "border-neutral-100 text-neutral-400"
                    )}
                  >
                    <Banknote size={16} className="mb-1" />
                    <span className="text-[8px] font-bold uppercase">Espèces</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('MOBILE')}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 border rounded-sm transition-all",
                      paymentMethod === 'MOBILE' ? "border-[#B45309] bg-[#B45309]/5 text-[#B45309]" : "border-neutral-100 text-neutral-400"
                    )}
                  >
                    <MessageCircle size={16} className="mb-1" />
                    <span className="text-[8px] font-bold uppercase">Mobile</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('CARD')}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 border rounded-sm transition-all",
                      paymentMethod === 'CARD' ? "border-[#B45309] bg-[#B45309]/5 text-[#B45309]" : "border-neutral-100 text-neutral-400"
                    )}
                  >
                    <CreditCard size={16} className="mb-1" />
                    <span className="text-[8px] font-bold uppercase">Carte</span>
                  </button>
                </div>

                <button 
                  disabled={cart.length === 0 || isProcessing}
                  onClick={handleCheckout}
                  className="btn-primary w-full py-4 text-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Valider la vente</span>
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && lastInvoice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white md:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100] overflow-y-auto p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-sm shadow-2xl overflow-hidden print:shadow-none"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={20} />
                  <span className="font-bold">Vente validée !</span>
                </div>
                <button onClick={() => setShowSuccess(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={20} />
                </button>
              </div>

              <div className="receipt-preview overflow-y-auto max-h-[60vh] bg-neutral-50 p-4">
                <Receipt invoice={lastInvoice.invoice} lines={lastInvoice.lines} />
                
                {/* Digital Proof QR Code Section */}
                <div className="mt-8 pt-8 border-t border-dashed border-neutral-300 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4">Preuve Numérique de Transaction</p>
                  <div className="bg-white p-4 inline-block rounded-sm border border-neutral-200 shadow-sm">
                    <QRCodeSVG 
                      value={`${window.location.origin}/proof/${lastInvoice.invoice.id}`}
                      size={120}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[9px] text-neutral-400 mt-4 leading-relaxed">
                    Scannez pour confirmer la réception.<br />
                    Un email de confirmation sera envoyé à l'agence et en copie à la direction.
                  </p>
                  <div className="mt-2 text-[8px] font-mono text-neutral-300">
                    ID: {lastInvoice.invoice.id.substring(0, 13).toUpperCase()}...
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-neutral-100 flex flex-col gap-3 print:hidden">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setIsSigning(true)}
                    className="flex items-center justify-center gap-2 py-3 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-50 rounded-sm"
                  >
                    <PenTool size={14} />
                    <span>Signer</span>
                  </button>
                  <button 
                    onClick={handleShareWhatsApp}
                    className="flex items-center justify-center gap-2 py-3 border border-emerald-200 text-emerald-600 font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-50 rounded-sm"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowSuccess(false)}
                    className="py-3 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-50 rounded-sm"
                  >
                    Fermer
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="btn-primary py-3 flex items-center justify-center gap-2 text-[10px]"
                  >
                    <Plus size={14} />
                    <span>Imprimer</span>
                  </button>
                </div>
              </div>

              {/* Signature Modal Overlay */}
              <AnimatePresence>
                {isSigning && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden"
                    >
                      <div className="p-4 border-b border-neutral-100 flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Signature de l'intervenant</h3>
                        <button onClick={() => setIsSigning(false)} className="p-1 hover:bg-neutral-100 rounded-full">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="border-2 border-dashed border-neutral-200 rounded-sm bg-neutral-50 h-64 relative">
                          <SignatureCanvas 
                            ref={sigPad}
                            penColor="#141414"
                            canvasProps={{
                              className: "w-full h-full cursor-crosshair",
                              style: { width: '100%', height: '100%' }
                            }}
                          />
                          <button 
                            onClick={() => sigPad.current?.clear()}
                            className="absolute bottom-2 right-2 p-2 bg-white border border-neutral-200 rounded-full text-neutral-400 hover:text-red-500 shadow-sm"
                            title="Effacer"
                          >
                            <Eraser size={16} />
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-3 italic text-center">
                          Signez à l'intérieur du cadre pour valider la transaction.
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                        <button 
                          onClick={() => setIsSigning(false)}
                          className="flex-1 py-3 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-widest text-[10px] hover:bg-white rounded-sm"
                        >
                          Annuler
                        </button>
                        <button 
                          onClick={handleSaveSignature}
                          className="flex-1 btn-primary py-3 font-bold uppercase tracking-widest text-[10px]"
                        >
                          Confirmer
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
