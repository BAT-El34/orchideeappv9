-- Orchidée Nature Management System - Supabase Schema

-- Extensions
create extension if not exists "pgcrypto";

-- Entities (Multi-tenant support)
create table entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  theme_color varchar(7),
  logo_url text,
  created_at timestamptz default now()
);

-- Roles
create table roles (
  id serial primary key,
  name text not null unique,
  description text
);

-- Users
create type user_status as enum ('pending','active','suspended');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  entity_id uuid references entities(id) on delete set null,
  role text not null,
  pin_code_hash text,
  status user_status default 'pending',
  last_login timestamptz,
  created_at timestamptz default now()
);

-- Products & Categories
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  entity_id uuid references entities(id) on delete cascade
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references product_categories(id) on delete set null,
  price_buy numeric(12,2) default 0,
  price_sell numeric(12,2) default 0,
  unit text,
  barcode text,
  entity_id uuid references entities(id) on delete cascade,
  active boolean default true,
  created_at timestamptz default now()
);

-- Stock
create table stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  entity_id uuid references entities(id) on delete cascade,
  quantity numeric default 0,
  min_threshold numeric default 0,
  updated_at timestamptz default now(),
  constraint uniq_stock unique (product_id, entity_id)
);

-- Invoices
create type invoice_status as enum ('draft','validated','cancelled');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  user_id uuid references users(id),
  date date default now(),
  total_buy numeric default 0,
  total_sell numeric default 0,
  margin numeric default 0,
  status invoice_status default 'draft',
  notes text,
  created_at timestamptz default now()
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  product_id uuid references products(id),
  product_name_snapshot text,
  quantity numeric,
  price_buy numeric,
  price_sell numeric,
  total_buy numeric,
  total_sell numeric
);

-- Cash Sessions
create type cash_status as enum ('open','closed');

create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  cashier_id uuid references users(id),
  opening_amount numeric default 0,
  closing_amount_declared numeric,
  closing_amount_calculated numeric,
  variance numeric,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  status cash_status default 'open',
  notes text
);

-- Orders
create type order_type as enum ('MANUAL','AUTO');
create type order_status as enum ('pending_validation','sent','in_preparation','shipped','delivered','cancelled');

create table orders (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  user_id uuid references users(id),
  type order_type,
  status order_status default 'pending_validation',
  delivery_date_requested date,
  comment text,
  created_at timestamptz default now()
);

-- Notifications
create type notif_type as enum ('ORDER','REPORT','ALERT','CASH','VALIDATION');
create type notif_channel as enum ('in_app','whatsapp','email');
create type notif_status as enum ('pending','sent','read','validated');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  from_user_id uuid references users(id),
  to_role text,
  to_user_id uuid references users(id),
  type notif_type,
  message text,
  reference_id uuid,
  channel notif_channel,
  status notif_status default 'pending',
  created_at timestamptz default now()
);

-- Expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  category text not null,
  amount numeric(12,2) default 0,
  description text,
  date date default now(),
  created_at timestamptz default now()
);

-- Suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  category text,
  created_at timestamptz default now()
);

-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  loyalty_points integer default 0,
  created_at timestamptz default now()
);

-- Seed Data
insert into roles(name,description) values
  ('super_admin','Accès total à toutes les entités'),
  ('admin','Administrateur d''une entité'),
  ('manager','Gestionnaire de stock et rapports'),
  ('vendeur','Facturation et ventes'),
  ('caissier','Gestion de la caisse'),
  ('production','Gestion de la cuisine et des recettes'),
  ('readonly','Consultation uniquement');

insert into entities(name,slug,theme_color) values
  ('Orchidée Nature','orchidee-nature','#7C3AED'),
  ('Antigravity Mom','antigravity-mom','#EA580C');
