-- Script SQL pour créer des comptes de test et gérer les demandes
-- Note: Les mots de passe et l'auth Supabase doivent être gérés via l'interface Supabase Auth ou l'API Auth.
-- Ce script insère les profils dans la table 'users' de l'application.

-- 1. S'assurer que les rôles existent (déjà dans le schéma mais au cas où)
INSERT INTO roles (name, description)
VALUES 
  ('super_admin', 'Accès total à toutes les entités'),
  ('admin', 'Administrateur d''une entité'),
  ('manager', 'Gestionnaire de stock et rapports'),
  ('vendeur', 'Facturation et ventes'),
  ('caissier', 'Gestion de la caisse'),
  ('production', 'Gestion de la cuisine et des recettes')
ON CONFLICT (name) DO NOTHING;

-- 2. Insertion de comptes de test avec différents statuts
-- Remarque: Les UUID doivent normalement correspondre à des utilisateurs dans auth.users
-- Pour le test, nous utilisons des UUID générés.

DO $$ 
DECLARE 
    v_entity_id UUID;
BEGIN
    -- Récupérer l'ID de l'entité par défaut
    SELECT id INTO v_entity_id FROM entities WHERE slug = 'orchidee-nature' LIMIT 1;

    -- Tenter de supprimer la contrainte de clé étrangère si elle existe pour permettre l'insertion de test
    -- Note: Dans un environnement de production, on garderait cette contrainte.
    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorer si on n'a pas les droits
    END;

    -- 1. SUPER ADMIN (orchideesuper@gmail.com)
    INSERT INTO users (id, email, full_name, entity_id, role, status)
    VALUES (gen_random_uuid(), 'orchideesuper@gmail.com', 'Super Administrateur', NULL, 'super_admin', 'active')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin', status = 'active';

    -- 2. ADMIN (orchideeadn@gmail.com)
    INSERT INTO users (id, email, full_name, entity_id, role, status)
    VALUES (gen_random_uuid(), 'orchideeadn@gmail.com', 'Administrateur Orchidée', v_entity_id, 'admin', 'active')
    ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active';

    -- 3. MANAGER AGENCE RAMCO (agenceramco@gmail.com)
    INSERT INTO users (id, email, full_name, entity_id, role, status)
    VALUES (gen_random_uuid(), 'agenceramco@gmail.com', 'Manager Agence Ramco', v_entity_id, 'manager', 'active')
    ON CONFLICT (email) DO UPDATE SET role = 'manager', status = 'active';

    -- 4. CAISSIER (orchideecaisse@gmail.com)
    INSERT INTO users (id, email, full_name, entity_id, role, status)
    VALUES (gen_random_uuid(), 'orchideecaisse@gmail.com', 'Caissier Orchidée', v_entity_id, 'caissier', 'active')
    ON CONFLICT (email) DO UPDATE SET role = 'caissier', status = 'active';

END $$;

-- 3. Table de log d'activité (si elle n'existe pas encore)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_id UUID REFERENCES entities(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ==========================================
-- MODULE DE PRODUCTION (RECETTES ET RAPPORTS)
-- ==========================================

-- 1. Ajout du type de produit (Matière Première ou Produit Fini)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT CHECK (product_type IN ('raw_material', 'finished_good', 'standard')) DEFAULT 'standard';

-- 2. Table des Recettes (BOM)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- Le produit fini
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id)
);

-- 3. Éléments de la Recette (Ingrédients)
CREATE TABLE IF NOT EXISTS recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    component_id UUID REFERENCES products(id), -- La matière première
    quantity DECIMAL(15,3) NOT NULL, -- Quantité nécessaire
    unit TEXT NOT NULL, -- Unité (kg, l, unité, etc.)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Rapports de Production Quotidiens
CREATE TABLE IF NOT EXISTS production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id),
    produced_by UUID REFERENCES users(id),
    production_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Détails de la Production
CREATE TABLE IF NOT EXISTS production_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_log_id UUID REFERENCES production_logs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- Produit fabriqué
    quantity_produced DECIMAL(15,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Désactiver RLS pour ces nouvelles tables pour le développement
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_items DISABLE ROW LEVEL SECURITY;

-- Droits d'accès
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
