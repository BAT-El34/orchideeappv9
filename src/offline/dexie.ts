import Dexie, { type Table } from 'dexie';

export interface Product {
  id: string;
  name: string;
  category_id?: string;
  price_buy: number;
  price_sell: number;
  unit?: string;
  barcode?: string;
  entity_id: string;
  active: boolean;
  product_type?: 'raw_material' | 'finished_good';
}

export interface ProductCategory {
  id: string;
  name: string;
  entity_id: string;
}

export interface Stock {
  id: string;
  product_id: string;
  entity_id: string;
  quantity: number;
  min_threshold: number;
}

export interface Invoice {
  id: string;
  entity_id: string;
  user_id?: string;
  customer_id?: string;
  date: string;
  total_buy: number;
  total_sell: number;
  margin: number;
  status: string;
  notes?: string;
  signature?: string; // Base64 image of the signature
  created_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  product_id?: string;
  product_name_snapshot: string;
  quantity: number;
  price_buy: number;
  price_sell: number;
  total_buy: number;
  total_sell: number;
}

export interface CashSession {
  id: string;
  entity_id: string;
  cashier_id: string;
  opening_amount: number;
  closing_amount_declared?: number;
  closing_amount_calculated?: number;
  variance?: number;
  opened_at: string;
  closed_at?: string;
  status: string;
  notes?: string;
}

export interface CashMovement {
  id: string;
  session_id: string;
  type: string;
  amount: number;
  description?: string;
  invoice_id?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  entity_id?: string;
  role: string;
  pin_code_hash?: string;
  status: string;
  created_at?: string;
}

export interface SyncItem {
  id?: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  created_at: number;
}

export interface Expense {
  id: string;
  entity_id: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  entity_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  entity_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyalty_points: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  entity_id?: string;
  action: string;
  details?: any;
  created_at: string;
}

export interface FeaturePermission {
  id: string;
  feature_key: string;
  role: string;
  is_enabled: boolean;
}

export class OrchideeDB extends Dexie {
  products!: Table<Product>;
  product_categories!: Table<ProductCategory>;
  stock!: Table<Stock>;
  invoices!: Table<Invoice>;
  invoice_lines!: Table<InvoiceLine>;
  cash_sessions!: Table<CashSession>;
  cash_movements!: Table<CashMovement>;
  users!: Table<User>;
  expenses!: Table<Expense>;
  suppliers!: Table<Supplier>;
  customers!: Table<Customer>;
  sync_queue!: Table<SyncItem>;
  activity_logs!: Table<ActivityLog>;
  feature_permissions!: Table<FeaturePermission>;

  constructor() {
    super('orchidee_db');
    this.version(10).stores({
      products: 'id, name, category_id, entity_id, barcode, active',
      product_categories: 'id, name, entity_id',
      stock: 'id, product_id, entity_id',
      invoices: 'id, entity_id, user_id, date, status, created_at',
      invoice_lines: 'id, invoice_id, product_id',
      cash_sessions: 'id, entity_id, cashier_id, status',
      cash_movements: 'id, session_id, type, invoice_id',
      users: 'id, email, entity_id, role, status',
      expenses: 'id, entity_id, category, date, created_at',
      suppliers: 'id, entity_id, name, category, created_at',
      customers: 'id, entity_id, name, phone, created_at',
      sync_queue: '++id, table_name, operation, created_at',
      activity_logs: 'id, user_id, entity_id, action, created_at',
      feature_permissions: 'id, feature_key, role'
    });
  }
}

export const db = new OrchideeDB();
