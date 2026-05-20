-- ============================================================
-- users jadvali — Telegram bot orqali ro'yxatdan o'tgan foydalanuvchilar
-- Supabase Dashboard > SQL Editor da bu kodni ishga tushiring
-- ============================================================

create table if not exists users (
  id            bigserial primary key,
  telegram_id   text unique not null,
  first_name    text default '',
  username      text default '',
  phone         text default '',
  registered_at timestamp with time zone default now()
);

-- Indeks: tez qidirish uchun
create index if not exists users_telegram_id_idx on users(telegram_id);

-- RLS yoqish
alter table users enable row level security;

-- Faqat service role (server.js) yoza/o'qiy oladi
-- Anonim foydalanuvchi faqat o'z yozuvini o'qiy oladi (ixtiyoriy)
create policy "Service role full access" on users
  for all using (true) with check (true);

-- ============================================================
-- bookings jadvaliga phone ustuni qo'shish (agar yo'q bo'lsa)
-- ============================================================
alter table bookings add column if not exists phone text;

-- ============================================================
-- bookings jadvaliga users bilan bog'lash uchun
-- telegram_id mavjudligini tekshiruvchi funksiya (ixtiyoriy)
-- ============================================================
-- Telefon raqami bo'lmagan navbatni rad etish:
-- Bu logikani frontend (index.html) da hal qilamiz.
