-- ==========================================================
-- Orchidée Nature - CLEANUP SCRIPT
-- WARNING: This script will DELETE ALL DATA and ALL TABLES.
-- Use this before running master_setup.sql for a fresh start.
-- ==========================================================

-- 1. Drop Tables (Reverse order of dependencies)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS feature_permissions CASCADE;
DROP TABLE IF EXISTS agency_stock_movement_items CASCADE;
DROP TABLE IF EXISTS agency_stock_movements CASCADE;
DROP TABLE IF EXISTS treasury_transactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS production_items CASCADE;
DROP TABLE IF EXISTS production_logs CASCADE;
DROP TABLE IF EXISTS recipe_items CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cash_sessions CASCADE;
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS entities CASCADE;

-- 2. Drop Custom Types (Enums)
DROP TYPE IF EXISTS stock_movement_type CASCADE;
DROP TYPE IF EXISTS treasury_category CASCADE;
DROP TYPE IF EXISTS treasury_type CASCADE;
DROP TYPE IF EXISTS notif_status CASCADE;
DROP TYPE IF EXISTS notif_channel CASCADE;
DROP TYPE IF EXISTS notif_type CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS cash_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- Cleanup complete. You can now run master_setup.sql.
