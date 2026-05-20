-- ============================================================
-- Supabase Dashboard > SQL Editor da HAMMASI birdan ishga tushiring
-- ============================================================

-- 1. BARBERS
create table if not exists barbers (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  role       text default 'Barber',
  rating     numeric default 4.5,
  reviews    integer default 0,
  phone      text,
  avatar_url text,
  note       text,
  active     boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. SERVICES
create table if not exists services (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  icon        text default '✂️',
  price       integer not null,
  duration    integer default 30,
  description text,
  active      boolean default true,
  created_at  timestamp with time zone default now()
);

-- 3. BOOKINGS
create table if not exists bookings (
  id            bigserial primary key,
  telegram_id   text,
  telegram_name text,
  barber_name   text,
  services_text text,
  total_price   integer default 0,
  duration_min  integer default 0,
  booking_date  text,
  booking_time  text,
  phone         text,
  note          text,
  status        text default 'pending',
  created_at    timestamp with time zone default now()
);

-- 4. SETTINGS
create table if not exists settings (
  id          integer primary key default 1,
  salon_name  text default 'Termiz Barber',
  salon_addr  text default 'Termiz sh.',
  salon_phone text default '+998 90 000 00 00',
  work_hours  jsonb,
  updated_at  timestamp with time zone default now()
);
-- Default qator
insert into settings (id) values (1) on conflict (id) do nothing;

-- 5. USERS (bot orqali ro'yxatdan o'tganlar)
create table if not exists users (
  id            bigserial primary key,
  telegram_id   text unique not null,
  first_name    text default '',
  username      text default '',
  phone         text default '',
  registered_at timestamp with time zone default now()
);

-- ============================================================
-- RLS — hamma jadval uchun ochiq (anon key bilan ishlaydi)
-- ============================================================
alter table barbers  enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table settings enable row level security;
alter table users    enable row level security;

drop policy if exists "public read barbers"  on barbers;
drop policy if exists "public read services" on services;
drop policy if exists "public read settings" on settings;
drop policy if exists "public all bookings"  on bookings;
drop policy if exists "public all users"     on users;

-- Barbers, services, settings — hamma o'qiy oladi
create policy "public read barbers"  on barbers  for select using (true);
create policy "public read services" on services for select using (true);
create policy "public read settings" on settings for select using (true);

-- Bookings — hamma yoza va o'qiy oladi (mijozlar navbat oladi)
create policy "public all bookings" on bookings for all using (true) with check (true);

-- Users — hamma yoza va o'qiy oladi (bot ro'yxatdan o'tkazadi)
create policy "public all users" on users for all using (true) with check (true);
