import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  FileText, 
  Calendar, 
  User, 
  Hash, 
  ArrowLeft,
  Package,
  CreditCard,
  Banknote,
  MessageCircle,
  ShieldCheck,
  Printer,
  Share2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

interface ProofData {
  type: 'INVOICE' | 'TREASURY';
  data: any;
  lines?: any[];
}

export const ProofModule = () => {
  const { id, hash } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<ProofData | null>(null);

  useEffect(() => {
    fetchProof();
  }, [id, hash]);

  const fetchProof = async () => {
    setLoading(true);
    setError(null);
    try {
      if (id) {
        // Fetch Invoice Proof
        const { data: invoice, error: invError } = await supabase
          .from('invoices')
          .select('*, user:users(full_name), customer:customers(name)')
          .eq('id', id)
          .single();

        if (invError) throw invError;

        const { data: lines, error: linesError } = await supabase
          .from('invoice_lines')
          .select('*')
          .eq('invoice_id', id);

        if (linesError) throw linesError;

        setProof({
          type: 'INVOICE',
          data: invoice,
          lines: lines || []
        });
      } else if (hash) {
        // Fetch Treasury Proof
        const { data: transaction, error: transError } = await supabase
          .from('treasury_transactions')
          .select('*, user:users(full_name)')
          .eq('transaction_hash', hash)
          .single();

        if (transError) throw transError;

        setProof({
          type: 'TREASURY',
          data: transaction
        });
      }
    } catch (err: any) {
      console.error('Error fetching proof:', err);
      setError('Preuve introuvable ou lien invalide.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#B45309]/20 border-t-[#B45309] rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">Vérification de l'authenticité...</p>
        </div>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-sm border border-neutral-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ArrowLeft size={32} />
          </div>
          <h1 className="text-xl font-bold mb-2">Erreur 404</h1>
          <p className="text-neutral-500 mb-8">{error || 'Cette preuve n\'existe pas.'}</p>
          <Link to="/" className="btn-primary inline-block px-8 py-3 font-bold uppercase tracking-widest text-xs">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto"
      >
        {/* Verification Header */}
        <div className="bg-emerald-600 text-white p-4 rounded-t-sm flex items-center justify-center gap-3 shadow-lg">
          <ShieldCheck size={24} />
          <span className="font-bold uppercase tracking-[0.2em] text-sm">Document Authentifié par Orchidée Nature</span>
        </div>

        <div className="bg-white shadow-2xl rounded-b-sm overflow-hidden">
          {/* Main Content */}
          <div className="p-8 space-y-8">
            {/* Status Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
                <CheckCircle2 size={40} />
              </div>
            </div>

            {/* Title & Amount */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
                {(proof.type === 'INVOICE' ? proof.data.total_sell : proof.data.amount).toLocaleString()} FCFA
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
                {proof.type === 'INVOICE' ? 'Montant de la Facture' : 'Montant de la Transaction'}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-4 bg-neutral-50 p-6 rounded-sm border border-neutral-100">
              <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Date</span>
                </div>
                <span className="text-sm font-bold text-neutral-700">
                  {new Date(proof.data.created_at).toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Hash size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Référence</span>
                </div>
                <span className="text-sm font-mono font-bold text-neutral-700">
                  {proof.type === 'INVOICE' ? proof.data.id.substring(0, 13).toUpperCase() : proof.data.transaction_hash.substring(0, 13).toUpperCase()}
                </span>
              </div>

              {proof.type === 'INVOICE' ? (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <User size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Client</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-700">{proof.data.customer?.name || 'Client de passage'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <CreditCard size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Statut</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${
                      proof.data.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {proof.data.status === 'PAID' ? 'Payé' : 'Non Payé'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <ArrowLeft size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Payeur</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-700">{proof.data.payer_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <CheckCircle2 size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Reçu par</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-700">{proof.data.receiver_name}</span>
                  </div>
                </>
              )}
            </div>

            {/* Items List (for Invoices) */}
            {proof.type === 'INVOICE' && proof.lines && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 border-b border-neutral-100 pb-2">Détails des articles</h3>
                <div className="space-y-3">
                  {proof.lines.map((line: any) => (
                    <div key={line.id} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-800">{line.product_name_snapshot}</span>
                        <span className="text-[10px] text-neutral-400 font-medium">Quantité: {line.quantity}</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-neutral-600">{line.total_sell.toLocaleString()} FCFA</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description (for Treasury) */}
            {proof.type === 'TREASURY' && proof.data.description && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Description</h3>
                <p className="text-sm text-neutral-600 italic bg-neutral-50 p-4 rounded-sm border border-neutral-100">
                  "{proof.data.description}"
                </p>
              </div>
            )}

            {/* Signature Section */}
            {proof.data.signature && (
              <div className="pt-8 border-t border-dashed border-neutral-200 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4">Signature Numérique</p>
                <div className="max-w-[200px] mx-auto bg-neutral-50 rounded-sm border border-neutral-100 p-2">
                  <img src={proof.data.signature} alt="Signature" className="w-full h-auto grayscale" />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-neutral-50 p-6 border-t border-neutral-100 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-neutral-200 text-neutral-600 font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-100 rounded-sm transition-colors"
            >
              <Printer size={14} />
              <span>Imprimer le Reçu</span>
            </button>
            <button 
              onClick={() => {
                const text = `Preuve Orchidée Nature\nID: ${proof.type === 'INVOICE' ? proof.data.id : proof.data.transaction_hash}\nMontant: ${(proof.type === 'INVOICE' ? proof.data.total_sell : proof.data.amount).toLocaleString()} FCFA`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text + '\nLien: ' + window.location.href)}`, '_blank');
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-bold uppercase tracking-widest text-[10px] hover:bg-[#128C7E] rounded-sm transition-colors"
            >
              <Share2 size={14} />
              <span>Partager WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-[10px] text-neutral-400 leading-relaxed max-w-sm mx-auto">
            Ce document est une preuve numérique générée par le système de gestion Orchidée Nature. 
            Toute modification frauduleuse est passible de poursuites.
          </p>
          <div className="flex justify-center gap-6">
            <img src="https://www.svgrepo.com/show/303128/google-play-badge-logo.svg" alt="Play Store" className="h-8 opacity-20 grayscale" />
            <img src="https://www.svgrepo.com/show/303123/apple-app-store-logo.svg" alt="App Store" className="h-8 opacity-20 grayscale" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
