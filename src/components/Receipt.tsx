import React from 'react';
import { type Invoice, type InvoiceLine } from '../offline/dexie';
import { Flower2 } from 'lucide-react';

interface ReceiptProps {
  invoice: Invoice;
  lines: InvoiceLine[];
}

export const Receipt: React.FC<ReceiptProps> = ({ invoice, lines }) => {
  return (
    <div className="receipt-container bg-white p-8 max-w-[300px] mx-auto text-neutral-900 font-mono text-sm leading-tight">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <Flower2 size={32} className="text-[#B45309]" />
        </div>
        <h1 className="text-xl font-serif italic font-bold">Orchidée Nature</h1>
        <p className="text-[10px] uppercase tracking-widest mt-1">Cosmétiques & Epices</p>
        <p className="text-[10px] mt-2">Dakar, Sénégal</p>
        <p className="text-[10px]">Tel: +221 77 000 00 00</p>
      </div>

      <div className="border-t border-dashed border-neutral-300 pt-4 mb-4">
        <div className="flex justify-between text-[10px] mb-1">
          <span>Date:</span>
          <span>{invoice.created_at ? new Date(invoice.created_at).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Facture #:</span>
          <span>{invoice.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-neutral-300 pt-4 mb-4">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-dashed border-neutral-200">
              <th className="text-left pb-2">Article</th>
              <th className="text-center pb-2">Qté</th>
              <th className="text-right pb-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-neutral-100">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="py-2 pr-2">{line.product_name_snapshot}</td>
                <td className="py-2 text-center">{line.quantity}</td>
                <td className="py-2 text-right">{line.total_sell.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-dashed border-neutral-300 pt-4 space-y-2">
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL</span>
          <span>{invoice.total_sell.toLocaleString()} FCFA</span>
        </div>
        <div className="flex justify-between text-[10px] opacity-60">
          <span>Mode:</span>
          <span>Espèces</span>
        </div>
      </div>

      <div className="mt-8 text-center border-t border-dashed border-neutral-300 pt-6">
        {invoice.signature && (
          <div className="mb-4">
            <p className="text-[8px] uppercase tracking-widest text-neutral-400 mb-1">Signature certifiée</p>
            <img 
              src={invoice.signature} 
              alt="Signature" 
              className="max-h-16 mx-auto border border-neutral-100 rounded-sm"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <p className="text-[10px] italic">Merci de votre visite !</p>
        <p className="text-[8px] mt-2 opacity-40">Logiciel Orchidée v1.0</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .receipt-container, .receipt-container * { visibility: visible; }
          .receipt-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 80mm; 
            padding: 5mm;
            margin: 0;
            box-shadow: none;
            border: none;
          }
          @page { size: 80mm auto; margin: 0; }
        }
      `}} />
    </div>
  );
};
