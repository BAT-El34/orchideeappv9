-- Update Notification Enums
ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'ACCOUNT_REQUEST';
ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'PRICE_MODIFICATION';

ALTER TYPE notif_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE notif_status ADD VALUE IF NOT EXISTS 'rejected';

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Treasury Transactions (Transversal Account)
CREATE TYPE treasury_type AS ENUM ('ENCASHMENT', 'DISBURSEMENT', 'TRANSFER');
CREATE TYPE treasury_category AS ENUM ('AGENCY_COLLECTION', 'EXTERNAL_ACTIVITY', 'PUNCTUAL_EVENT', 'OTHER');

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
  transaction_hash TEXT UNIQUE, -- Unique hash for proof
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agency Stock Receptions/Returns
CREATE TYPE stock_movement_type AS ENUM ('RECEPTION', 'RETURN');

CREATE TABLE IF NOT EXISTS agency_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Person who received/returned
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

-- Add treasury role
INSERT INTO roles (name, description) 
VALUES ('treasury', 'Compte transversal pour les encaissements et la traçabilité financière')
ON CONFLICT (name) DO NOTHING;

-- Add agency role (if not already covered by manager/vendeur)
INSERT INTO roles (name, description) 
VALUES ('agency', 'Gestionnaire de point de vente / agence')
ON CONFLICT (name) DO NOTHING;

-- Feature Permissions Table (Shared)
CREATE TABLE IF NOT EXISTS feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  UNIQUE(entity_id, role, feature_key)
);

-- Seed default permissions for admin (all enabled)
-- This is a helper, but logic in code should also handle admin as always enabled
