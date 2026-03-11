# Structure de la Base de Données - Orchidée Nature

Le système utilise **Supabase** (PostgreSQL) comme moteur de base de données principal.

## Script d'Installation Maître

Pour mettre en place l'intégralité du système, veuillez exécuter le script suivant dans votre éditeur SQL Supabase :

👉 **[master_setup.sql](/master_setup.sql)**

Ce script configure :
- Le schéma multi-entités (tenants)
- La gestion des utilisateurs et des rôles
- Le catalogue produits et la gestion des stocks
- Le module de vente et de facturation
- Le module de production (recettes et cuisine)
- La trésorerie transversale et la traçabilité financière
- Le système de permissions granulaires
- Le chat interne et les notifications

## Authentification & Utilisateurs
- **auth.users** (Supabase) : Gère l'email, le mot de passe (hashé) et l'ID unique (UUID).
- **public.users** : Profils étendus.
  - `id` (UUID) : Doit correspondre à l'ID de `auth.users`.
  - `email` : Email de l'utilisateur.
  - `full_name` : Nom complet.
  - `role` : Rôle (super_admin, admin, manager, vendeur, caissier, production).
  - `entity_id` : ID de la boutique/entité (multi-tenant).
  - `status` : Statut du compte (pending, active, suspended).

## Configuration & Entités
- **entities** : Liste des boutiques ou agences.
- **roles** : Définition des rôles et descriptions.

## Inventaire & Produits
- **products** : Catalogue des articles.
  - `product_type` : 'raw_material' (matière première), 'finished_good' (produit fini), 'standard'.
- **product_categories** : Catégories de produits.
- **stock** : Niveaux de stock actuels par entité.

## Ventes & Caisse
- **invoices** : Factures et ventes réalisées.
- **invoice_lines** : Détails des articles vendus.
- **cash_sessions** : Sessions de caisse (ouverture/fermeture).

## Production (Cuisine)
- **recipes** : Recettes (BOM). Lie un produit fini à ses ingrédients.
- **recipe_items** : Ingrédients d'une recette avec quantités.
- **production_logs** : Rapports de production quotidiens.
- **production_items** : Quantités réellement produites.

## Logistique & Tiers
- **suppliers** : Annuaire des fournisseurs.
- **customers** : Annuaire des clients et fidélité.
- **orders** : Commandes d'achat ou de transfert.
- **expenses** : Suivi des dépenses opérationnelles.
- **notifications** : Alertes système et messages.
