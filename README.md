# Orchidée Nature Management System

Système de gestion complet, mobile-first et offline-first.

## Configuration

Pour faire fonctionner l'application, vous devez configurer les variables d'environnement suivantes dans le panneau **Secrets** de Google AI Studio :

- `GEMINI_API_KEY` : (Automatique) Pour les rapports d'analyse IA.
- `VITE_SUPABASE_URL` : L'URL de votre projet Supabase.
- `VITE_SUPABASE_ANON_KEY` : La clé anonyme de votre projet Supabase.

## Base de données

Exécutez le contenu du fichier `supabase_schema.sql` dans l'éditeur SQL de votre console Supabase pour initialiser les tables et les rôles.

## Fonctionnalités

- **Tableau de bord** : Visualisation des ventes et alertes.
- **Produits** : Gestion du catalogue avec support hors-ligne.
- **Facturation** : Création de factures (Module en cours).
- **Caisse** : Gestion des sessions de caisse (Module en cours).
- **IA** : Rapports générés par Gemini 3 Flash.

## Développement

L'application utilise :
- **Frontend** : React 19 + Vite + Tailwind CSS 4.
- **Backend** : Express + tsx.
- **Offline** : Dexie.js (IndexedDB).
- **Auth/DB** : Supabase.
