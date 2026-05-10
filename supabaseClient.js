/**
 * Supabase Client Configuration
 * =============================
 * Bu fayl Supabase bilan bog'lanish uchun ishlatiladi
 * Barcha CRUD operatsiyalar shu client orqali amalga oshiriladi
 *
 * KONFIGURATSIYA:
 * Bu faylni loyihaga moslashtirish uchun quyidagi usullardan birini ishlatishingiz mumkin:
 *
 * 1. Vite/React ishlatilsa: import.meta.env.VITE_SUPABASE_URL dan foydalaning
 * 2. Vanilla JS uchun: window.SUPABASE_CONFIG ni .env faylidan o'qing
 * 3. To'g'ridan-to'g'ri: pastdagi SUPABASE_CONFIG obyektini o'zingiz tahrirlang
 *
 * @version 1.1.0
 * @author Termiz Barber Team
 */

// ============================================================
// KONFIGURATSIYA - Iltimos, quyidagi qiymatlarni .env faylidan oqing
// YOKI bu qismni PROJECT-SPECIFIC CONFIGURATION bo'limida o'zgartiring
// ============================================================

// Projektgaoid config - bu qiymatlarni o'zgartiring yoki global configdan foydalaning
const PROJECT_CONFIG = {
  // Supabase URL (supabase project settings > API dan oling)
  supabaseUrl: 'https://vezdgqyndfdafwcdrgfz.supabase.co',
  // Supabase ANON KEY (supabase project settings > API dan oling)
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemRncXluZGZkYWZ3Y2RyZ2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDgwMjYsImV4cCI6MjA5MzQ4NDAyNn0.k7XfxYOjHbdIVfpzJLhzvIcDUNRWHH-pLNjFIl5X22o',
  // Admin Telegram IDlar (vergul bilan ajratilgan)
  adminIds: ['8536944196'],
  // Telegram Bot Token (BotFather dan oling)
  botToken: '8669240949:AAESNLLcctbfYs55aR0dckNL7yqk7J5Ra-c',
  // Supabase Storage bucket nomi
  storageBucket: 'barber-images'
};

// Agar global config mavjud bo'lsa, undan foydalanish (Vite/React uchun)
const getConfig = () => {
  if (typeof window !== 'undefined' && window.SUPABASE_CONFIG) {
    return window.SUPABASE_CONFIG;
  }
  return PROJECT_CONFIG;
};

const CONFIG = getConfig();

// Initialize Supabase client
const { createClient } = supabase;
const sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);

// ============================================================
// DATABASE TABLES
// ============================================================
/*
  Jadval strukturalari (Supabase SQL Editor da bajaring):

  barbers:
    - id (uuid, primary key, default: gen_random_uuid())
    - name (text, not null)
    - role (text, default: 'Barber')
    - rating (numeric, default: 4.5)
    - reviews (integer, default: 0)
    - phone (text)
    - avatar_url (text)
    - note (text)
    - active (boolean, default: true)
    - created_at (timestamp with time zone, default: now())

  services:
    - id (uuid, primary key, default: gen_random_uuid())
    - name (text, not null)
    - icon (text, default: '✂️')
    - price (integer, not null)
    - duration (integer, default: 30)
    - description (text)
    - active (boolean, default: true)
    - created_at (timestamp with time zone, default: now())

  bookings:
    - id (uuid, primary key, default: gen_random_uuid())
    - telegram_id (text)
    - barber_id (uuid)
    - services (jsonb)
    - date (date)
    - time (text)
    - status (text, default: 'pending')
    - total_price (integer)
    - total_duration (integer)
    - created_at (timestamp with time zone, default: now())

  settings:
    - id (integer, primary key)
    - shop_name (text)
    - address (text)
    - work_hours (jsonb)
    - rest_day (text)
    - phone (text)

  admins:
    - id (uuid, primary key, default: gen_random_uuid())
    - telegram_id (text, unique)
    - role (text, default: 'admin')
    - created_at (timestamp with time zone, default: now())
*/

// ============================================================
// BARBERS (MASTERS) CRUD
// ============================================================
const BarbersDB = {
  // READ - Barcha masterlarni olish
  async getAll() {
    const { data, error } = await sb
      .from('barbers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // READ - Faqat active masterlarni olish
  async getActive() {
    const { data, error } = await sb
      .from('barbers')
      .select('*')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // READ - Bitta masterni ID bo'yicha olish
  async getById(id) {
    const { data, error } = await sb
      .from('barbers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // CREATE - Yangi master qo'shish
  async create(barber) {
    const { data, error } = await sb
      .from('barbers')
      .insert([barber])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // UPDATE - Master ma'lumotlarini yangilash
  async update(id, barber) {
    const { data, error } = await sb
      .from('barbers')
      .update(barber)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // DELETE - Masterni o'chirish
  async delete(id) {
    const { error } = await sb
      .from('barbers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // UPDATE - Master faolligini o'zgartirish
  async toggleActive(id, active) {
    const { error } = await sb
      .from('barbers')
      .update({ active })
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================================
// SERVICES CRUD
// ============================================================
const ServicesDB = {
  // READ - Barcha xizmatlarni olish
  async getAll() {
    const { data, error } = await sb
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // READ - Faqat active xizmatlarni olish
  async getActive() {
    const { data, error } = await sb
      .from('services')
      .select('*')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // READ - Bitta xizmatni ID bo'yicha olish
  async getById(id) {
    const { data, error } = await sb
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // CREATE - Yangi xizmat qo'shish
  async create(service) {
    const { data, error } = await sb
      .from('services')
      .insert([service])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // UPDATE - Xizmat ma'lumotlarini yangilash
  async update(id, service) {
    const { data, error } = await sb
      .from('services')
      .update(service)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // DELETE - Xizmatni o'chirish
  async delete(id) {
    const { error } = await sb
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================================
// BOOKINGS CRUD
// ============================================================
const BookingsDB = {
  // READ - Barcha bronlarni olish
  async getAll() {
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // READ - Foydalanuvchi bronlarini olish
  async getByTelegramId(telegramId) {
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // READ - Status bo'yicha bronlarni olish
  async getByStatus(status) {
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // CREATE - Yangi bron qo'shish
  async create(booking) {
    const { data, error } = await sb
      .from('bookings')
      .insert([booking])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // UPDATE - Bron statusini yangilash
  async updateStatus(id, status) {
    const { error } = await sb
      .from('bookings')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  // UPDATE - Bron ma'lumotlarini yangilash
  async update(id, booking) {
    const { data, error } = await sb
      .from('bookings')
      .update(booking)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // DELETE - Bronni o'chirish
  async delete(id) {
    const { error } = await sb
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================================
// SETTINGS CRUD
// ============================================================
const SettingsDB = {
  // READ - Sozlamalarni olish
  async get() {
    const { data, error } = await sb
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data;
  },

  // UPDATE - Sozlamalarni yangilash
  async update(settings) {
    const { data, error } = await sb
      .from('settings')
      .update(settings)
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ============================================================
// ADMINS CRUD
// ============================================================
const AdminsDB = {
  // READ - Barcha adminlarni olish
  async getAll() {
    const { data, error } = await sb
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // CHECK - Foydalanuvchi admin ekanligini tekshirish
  async isAdmin(telegramId) {
    const { data, error } = await sb
      .from('admins')
      .select('telegram_id')
      .eq('telegram_id', telegramId)
      .single();
    return !!data;
  },

  // CREATE - Yangi admin qo'shish
  async create(admin) {
    const { data, error } = await sb
      .from('admins')
      .insert([admin])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // DELETE - Adminni o'chirish
  async delete(telegramId) {
    const { error } = await sb
      .from('admins')
      .delete()
      .eq('telegram_id', telegramId);
    if (error) throw error;
  }
};

// ============================================================
// STORAGE - Rasm yuklash
// ============================================================
const StorageDB = {
  // Rasm yuklash
  async uploadImage(file, folder = 'misc') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { data, error } = await sb.storage
      .from(CONFIG.storageBucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = sb.storage
      .from(CONFIG.storageBucket)
      .getPublicUrl(fileName);

    return publicUrl;
  },

  // Rasmni o'chirish
  async deleteImage(url) {
    if (!url) return;
    const path = url.split('/').slice(-2).join('/');
    const { error } = await sb.storage
      .from(CONFIG.storageBucket)
      .remove([path]);
    if (error) console.error('Delete error:', error);
  }
};

// ============================================================
// REAL-TIME - Realtime yangilanishlar
// ============================================================
const RealtimeDB = {
  // Barbers o'zgarishlarini kuzatish
  subscribeToBarbers(callback) {
    return sb
      .channel('barbers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, callback)
      .subscribe();
  },

  // Services o'zgarishlarini kuzatish
  subscribeToServices(callback) {
    return sb
      .channel('services-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, callback)
      .subscribe();
  },

  // Bookings o'zgarishlarini kuzatish
  subscribeToBookings(callback) {
    return sb
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, callback)
      .subscribe();
  },

  // Obunani bekor qilish
  unsubscribe(channel) {
    sb.removeChannel(channel);
  }
};

// ============================================================
// EXPORT - Global foydalanish uchun
// ============================================================
window.Supabase = {
  client: sb,
  config: CONFIG,
  barbers: BarbersDB,
  services: ServicesDB,
  bookings: BookingsDB,
  settings: SettingsDB,
  admins: AdminsDB,
  storage: StorageDB,
  realtime: RealtimeDB
};

console.log('✅ Supabase Client sozlandi!');
console.log('📡 URL:', CONFIG.supabaseUrl);