-- Migration: Create fridge_items and meal_logs tables

create table if not exists fridge_items (
  id bigserial primary key,
  item_name text not null,
  added_at timestamptz default now(),
  meta jsonb
);

create table if not exists meal_logs (
  id bigserial primary key,
  meal_name text not null,
  eaten_at date default current_date,
  meta jsonb
);
