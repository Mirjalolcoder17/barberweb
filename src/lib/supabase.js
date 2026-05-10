// Supabase Configuration
// Usage: Include this script before supabase-js CDN

const SUPABASE_URL = 'https://vezdgqyndfdafwcdrgfz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemRncXluZGZkYWZ3Y2RyZ2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDgwMjYsImV4cCI6MjA5MzQ4NDAyNn0.k7XfxYOjHbdIVfpzJLhzvIcDUNRWHH-pLNjFIl5X22o';

// Initialize Supabase client
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// Storage bucket configuration
const STORAGE_BUCKET = 'barber-images';

// Upload image to Supabase Storage
async function uploadImage(file, folder = 'masters') {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

  const { data, error } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = sb.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return publicUrl;
}

// Delete image from Supabase Storage
async function deleteImage(url) {
  if (!url || !url.includes('barber-images')) return;

  const path = url.split('/').slice(-2).join('/');
  const { error } = await sb.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) console.error('Delete error:', error);
}

// Database Operations - Barbers (Masters)
const barbersDB = {
  async getAll() {
    const { data, error } = await sb
      .from('barbers')
      .select('*')
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async getActive() {
    const { data, error } = await sb
      .from('barbers')
      .select('*')
      .eq('active', true)
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async create(barber) {
    const { data, error } = await sb
      .from('barbers')
      .insert(barber)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

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

  async delete(id) {
    const { error } = await sb
      .from('barbers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async toggleActive(id, active) {
    const { error } = await sb
      .from('barbers')
      .update({ active })
      .eq('id', id);
    if (error) throw error;
  }
};

// Database Operations - Services
const servicesDB = {
  async getAll() {
    const { data, error } = await sb
      .from('services')
      .select('*')
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async getActive() {
    const { data, error } = await sb
      .from('services')
      .select('*')
      .eq('active', true)
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async create(service) {
    const { data, error } = await sb
      .from('services')
      .insert(service)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

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

  async delete(id) {
    const { error } = await sb
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Database Operations - Bookings
const bookingsDB = {
  async getAll() {
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByStatus(status) {
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(booking) {
    const { data, error } = await sb
      .from('bookings')
      .insert(booking)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id, status) {
    const { error } = await sb
      .from('bookings')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id) {
    const { error } = await sb
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Real-time subscription
function subscribeToTable(table, callback) {
  return sb
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
}

// Export for global use
window.SUPABASE_CONFIG = {
  sb,
  barbersDB,
  servicesDB,
  bookingsDB,
  uploadImage,
  deleteImage,
  subscribeToTable
};