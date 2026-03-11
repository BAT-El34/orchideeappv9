import { db } from './dexie';
import { supabase } from '../lib/supabase';

export async function syncAll() {
  if (!supabase) {
    console.warn('Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    window.dispatchEvent(new CustomEvent('sync-error'));
    return;
  }

  if (!navigator.onLine) {
    window.dispatchEvent(new CustomEvent('offline'));
    return;
  }

  window.dispatchEvent(new CustomEvent('sync-start'));

  try {
    // 1. Push local changes to remote
    const queue = await db.sync_queue.toArray();
    if (queue.length > 0) {
      for (const q of queue) {
        try {
          let result;
          if (q.operation === 'INSERT') {
            result = await supabase.from(q.table_name).insert(q.payload);
          } else if (q.operation === 'UPDATE') {
            result = await supabase.from(q.table_name).upsert(q.payload);
          } else if (q.operation === 'DELETE') {
            result = await supabase.from(q.table_name).delete().match({ id: q.payload.id });
          }

          if (result && !result.error) {
            await db.sync_queue.delete(q.id!);
          } else if (result?.error) {
            console.error(`Supabase error for ${q.table_name}:`, result.error);
          }
        } catch (e) {
          console.error('Sync item error:', e);
          continue;
        }
      }
    }

    // 2. Pull remote changes to local
    await pullData();
    window.dispatchEvent(new CustomEvent('sync-end'));
  } catch (e) {
    console.error('Sync error:', e);
    window.dispatchEvent(new CustomEvent('sync-error'));
  }
}

export async function pullData() {
  if (!supabase) return;

  try {
    const tables = ['products', 'product_categories', 'stock', 'users', 'expenses', 'suppliers', 'customers', 'invoices', 'invoice_lines'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (data && !error) {
        if (table === 'products') await db.products.bulkPut(data);
        if (table === 'product_categories') await db.product_categories.bulkPut(data);
        if (table === 'stock') await db.stock.bulkPut(data);
        if (table === 'users') await db.users.bulkPut(data);
        if (table === 'expenses') await db.expenses.bulkPut(data);
        if (table === 'suppliers') await db.suppliers.bulkPut(data);
        if (table === 'customers') await db.customers.bulkPut(data);
        if (table === 'invoices') await db.invoices.bulkPut(data);
        if (table === 'invoice_lines') await db.invoice_lines.bulkPut(data);
      }
    }
  } catch (e) {
    console.error('Pull error:', e);
  }
}
