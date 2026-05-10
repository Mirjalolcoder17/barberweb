# WebBarber - Premier Barber Shop Management System

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/Version-2.1-blue" alt="Version">
</p>

## 🔰 Loyiha Haqida

WebBarber - bu zamonaviy barber shop boshqaruv tizimi bo'lib, mijozlar va adminlar uchun alohida interfeyslarni taklif etadi. Loyiha Telegram WebApp sifatida ishlaydi va Supabase (PostgreSQL) orqali ma'lumotlarni boshqaradi.

## 🛠 Texnologiyalar

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: Custom CSS (Glassmorphism dizayn)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Telegram WebApp API
- **Storage**: Supabase Storage (rasmlar uchun)
- **Real-time**: Supabase Realtime

## 📋 Xususiyatlar

### Mijoz Paneli (Client UI)
- ✅ Masterlar ro'yxati va tanlash
- ✅ Xizmatlar katalogi
- ✅ Onlayn navbat olish
- ✅ Navbatlar tarixi
- ✅ Profil boshqaruvi

### Admin Paneli
- ✅ Dashboard (statistika)
- ✅ Masterlar boshqaruvi (CRUD)
- ✅ Xizmatlar boshqaruvi (CRUD)
- ✅ Bronlar boshqaruvi
- ✅ Mijozlar ro'yxati
- ✅ Sozlamalar

## 🚀 Ishga Tushirish

### 1. Repositoriyani clone qilish
```bash
git clone https://github.com/yourusername/webbarber.git
cd webbarber
```

### 2. Environment sozlamalari
```bash
# .env faylini yarating va quyidagi ma'lumotlarni kiriting:
cp .env.example .env
```

`.env` fayliga quyidagilarni kiriting:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ADMIN_IDS=your_telegram_id
VITE_BOT_TOKEN=your_bot_token
VITE_STORAGE_BUCKET=barber-images
```

### 3. Supabase sozlamalari

Supabase dashboardda quyidagi jadvalarni yarating:

```sql
-- Barbers (Masterlar)
create table barbers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text default 'Barber',
  rating numeric default 4.5,
  reviews integer default 0,
  phone text,
  avatar_url text,
  note text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Services (Xizmatlar)
create table services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  icon text default '✂️',
  price integer not null,
  duration integer default 30,
  description text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Bookings (Bronlar)
create table bookings (
  id uuid default gen_random_uuid() primary key,
  telegram_id text,
  barber_id uuid,
  services jsonb,
  date date,
  time text,
  status text default 'pending',
  total_price integer,
  total_duration integer,
  created_at timestamp with time zone default now()
);

-- Settings (Sozlamalar)
create table settings (
  id integer primary key,
  shop_name text default 'Termiz Barber',
  address text,
  work_hours jsonb,
  rest_day text,
  phone text
);

-- Admins
create table admins (
  id uuid default gen_random_uuid() primary key,
  telegram_id text unique,
  role text default 'admin',
  created_at timestamp with time zone default now()
);
```

Storage bucket yarating:
- Bucket nomi: `barber-images`
- Public access: enable qiling
- RLS policies: anonymous read/write

### 4. Loyihani ishga tushirish

Oddaycha `index.html` faylini brauzerda oching yoki serverda hosting qiling:

```bash
# Python bilan
python -m http.server 8000

# Node.js bilan (serve)
npx serve .
```

Telegram Bot WebApp uchun:
- BotFather dan yangi bot yarating
- /newbot buyrug'ini bering
- Menu Button -> Configure ga o'ting
- Web App URL ni sozlash uchun HTTPS hosting kerak

## 📁 Loyiha Struktura

```
webbarber/
├── index.html          # Asosiy HTML fayl
├── supabaseClient.js   # Supabase client konfiguratsiyasi
├── .env                # Maxfiy kalitlar (gitignore)
├── .env.example        # Environment shablon
├── .gitignore          # Git ignorelist
├── README.md           # Loyiha hujjatlari
└── src/
    └── lib/
        └── supabase.js # Supabase helper funksiyalar
```

## 🔐 Xavfsizlik

- `.env` fayli `.gitignore` ga qo'shilgan
- Supabase RLS (Row Level Security) yoqilgan
- Admin tekshiruvi Telegram ID orqali

## 📞 Qo'llab-quvvatlash

Muammolar bo'lsa, GitHub Issues bo'limida yozing.

---

<p align="center">
Made with ❤️ by Termiz Barber
</p>