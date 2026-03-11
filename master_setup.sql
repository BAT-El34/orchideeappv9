-- ==========================================================
-- Orchidée Nature Management System - MASTER SETUP SCRIPT
-- ==========================================================
-- This script sets up the entire database schema, including:
-- 1. Core Schema (Entities, Roles, Users)
-- 2. Products, Categories, and Stock
-- 3. Sales (Invoices, Lines, Cash Sessions)
-- 4. Operations (Orders, Expenses, Suppliers, Customers)
-- 5. Production Module (Recipes, Logs)
-- 6. Communication (Chat, Notifications)
-- 7. Finance (Treasury, Transversal Accounts)
-- 8. Agency Management (Stock Movements)
-- 9. Security (Permissions, Activity Logs)
-- ==========================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CORE SCHEMA
-- ==========================================

-- Entities (Multi-tenant support)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  theme_color VARCHAR(7),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Users
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending','active','suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  pin_code_hash TEXT,
  status user_status DEFAULT 'pending',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. PRODUCTS & STOCK
-- ==========================================

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  price_buy NUMERIC(12,2) DEFAULT 0,
  price_sell NUMERIC(12,2) DEFAULT 0,
  unit TEXT,
  barcode TEXT,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  product_type TEXT CHECK (product_type IN ('raw_material', 'finished_good', 'standard')) DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 0,
  min_threshold NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uniq_stock UNIQUE (product_id, entity_id)
);

-- ==========================================
-- 3. SALES & CASH
-- ==========================================

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft','validated','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  date DATE DEFAULT now(),
  total_buy NUMERIC DEFAULT 0,
  total_sell NUMERIC DEFAULT 0,
  margin NUMERIC DEFAULT 0,
  status invoice_status DEFAULT 'draft',
  notes TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name_snapshot TEXT,
  quantity NUMERIC,
  price_buy NUMERIC,
  price_sell NUMERIC,
  total_buy NUMERIC,
  total_sell NUMERIC
);

DO $$ BEGIN
    CREATE TYPE cash_status AS ENUM ('open','closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES users(id),
  opening_amount NUMERIC DEFAULT 0,
  closing_amount_declared NUMERIC,
  closing_amount_calculated NUMERIC,
  variance NUMERIC,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  status cash_status DEFAULT 'open',
  notes TEXT
);

-- ==========================================
-- 4. OPERATIONS
-- ==========================================

DO $$ BEGIN
    CREATE TYPE order_type AS ENUM ('MANUAL','AUTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending_validation','sent','in_preparation','shipped','delivered','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type order_type,
  status order_status DEFAULT 'pending_validation',
  delivery_date_requested DATE,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  date DATE DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 5. PRODUCTION MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id)
);

CREATE TABLE IF NOT EXISTS recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    component_id UUID REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id),
    produced_by UUID REFERENCES users(id),
    production_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_log_id UUID REFERENCES production_logs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity_produced DECIMAL(15,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 6. COMMUNICATION
-- ==========================================

DO $$ BEGIN
    CREATE TYPE notif_type AS ENUM ('ORDER','REPORT','ALERT','CASH','VALIDATION','ACCOUNT_REQUEST','PASSWORD_RESET','PRICE_MODIFICATION');
EXCEPTION
    WHEN duplicate_object THEN 
        ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'ACCOUNT_REQUEST';
        ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
        ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'PRICE_MODIFICATION';
END $$;

DO $$ BEGIN
    CREATE TYPE notif_channel AS ENUM ('in_app','whatsapp','email');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notif_status AS ENUM ('pending','sent','read','validated','completed','rejected');
EXCEPTION
    WHEN duplicate_object THEN 
        ALTER TYPE notif_status ADD VALUE IF NOT EXISTS 'completed';
        ALTER TYPE notif_status ADD VALUE IF NOT EXISTS 'rejected';
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id),
  to_role TEXT,
  to_user_id UUID REFERENCES users(id),
  type notif_type,
  message TEXT,
  reference_id UUID,
  channel notif_channel,
  status notif_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 7. FINANCE (TREASURY)
-- ==========================================

DO $$ BEGIN
    CREATE TYPE treasury_type AS ENUM ('ENCASHMENT', 'DISBURSEMENT', 'TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE treasury_category AS ENUM ('AGENCY_COLLECTION', 'EXTERNAL_ACTIVITY', 'PUNCTUAL_EVENT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type treasury_type NOT NULL,
  category treasury_category NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  payer_name TEXT,
  receiver_name TEXT,
  proof_url TEXT,
  transaction_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 8. AGENCY MANAGEMENT
-- ==========================================

DO $$ BEGIN
    CREATE TYPE stock_movement_type AS ENUM ('RECEPTION', 'RETURN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS agency_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type stock_movement_type NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agency_stock_movement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID REFERENCES agency_stock_movements(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 9. SECURITY & LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  UNIQUE(entity_id, role, feature_key)
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_id UUID REFERENCES entities(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);

-- ==========================================
-- 10. SEED DATA
-- ==========================================

INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Accès total à toutes les entités'),
  ('admin', 'Administrateur d''une entité'),
  ('manager', 'Gestionnaire de stock et rapports'),
  ('vendeur', 'Facturation et ventes'),
  ('caissier', 'Gestion de la caisse'),
  ('production', 'Gestion de la cuisine et des recettes'),
  ('agency', 'Gestionnaire de point de vente / agence'),
  ('treasury', 'Compte transversal pour les encaissements'),
  ('readonly', 'Consultation uniquement')
ON CONFLICT (name) DO NOTHING;

INSERT INTO entities (name, slug, theme_color) VALUES
  ('Orchidée Nature', 'orchidee-nature', '#B45309'),
  ('Antigravity Mom', 'antigravity-mom', '#EA580C')
ON CONFLICT (slug) DO NOTHING;

-- Permissions Seed (Example for Manager)
DO $$ 
DECLARE 
    v_entity_id UUID;
BEGIN
    SELECT id INTO v_entity_id FROM entities WHERE slug = 'orchidee-nature' LIMIT 1;
    
    IF v_entity_id IS NOT NULL THEN
        INSERT INTO feature_permissions (entity_id, role, feature_key, is_enabled)
        VALUES 
            (v_entity_id, 'manager', 'products', true),
            (v_entity_id, 'manager', 'suppliers', true),
            (v_entity_id, 'manager', 'customers', true),
            (v_entity_id, 'manager', 'reports', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Security: Disable RLS for development (Optional, but common in this environment)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE agency_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE agency_stock_movement_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_items DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON invoices TO anon;
GRANT SELECT ON invoice_lines TO anon;
GRANT SELECT ON treasury_transactions TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON customers TO anon;
