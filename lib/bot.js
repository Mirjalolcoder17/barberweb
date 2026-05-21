'use strict';
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const https = require('https');
const BOT_TOKEN    = process.env.BOT_TOKEN    || '8320776991:AAEX3JaadyzLKh19sp4dIb5lhtV5uSzIxT4';
const ADMIN_IDS    = (process.env.ADMIN_IDS   || '8536944196').split(',');
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://barberweb-black.vercel.app';
const SB_URL       = process.env.VITE_SUPABASE_URL || 'https://vezdgqyndfdafwcdrgfz.supabase.co';
const SB_KEY       = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemRncXluZGZkYWZ3Y2RyZ2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkwODAyNiwiZXhwIjoyMDkzNDg0MDI2fQ.lfl41wMlXsUM5QoBKLT3O7W9M-M6LW3ps2yt0K8cmpw';
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── HTTP helpers ──────────────────────────────────────────
function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search,
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d || '{}')));});
    req.on('error', reject); req.write(data); req.end();
  });
}

function sbReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: new URL(SB_URL).hostname,
      path: '/rest/v1/' + path, method,
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d || '[]')); } catch { resolve([]); } });
    });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}

// ── Telegram helpers ──────────────────────────────────────
async function sendMessage(chat_id, text, extra = {}) {
  return httpPost(`${TG}/sendMessage`, { chat_id, text, parse_mode: 'HTML', ...extra });
}
async function answerCallback(id, text) {
  return httpPost(`${TG}/answerCallbackQuery`, { callback_query_id: id, text, show_alert: false });
}
async function editMessage(chat_id, message_id, text) {
  return httpPost(`${TG}/editMessageText`,
    { chat_id, message_id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } });
}

// ── Supabase helpers ──────────────────────────────────────
async function getUser(tgId) {
  const d = await sbReq('GET', `users?telegram_id=eq.${tgId}&select=phone`);
  return Array.isArray(d) ? d[0] : null;
}
async function upsertUser(tgId, first_name, username, phone) {
  return sbReq('POST', 'users', { telegram_id: String(tgId), first_name, username, phone });
}
async function getBarber(tgId) {
  const d = await sbReq('GET', `barbers?telegram_id=eq.${tgId}&select=id,name,role,active`);
  return Array.isArray(d) ? d[0] : null;
}
async function updateBookingStatus(id, status) {
  return sbReq('PATCH', `bookings?id=eq.${id}`, { status });
}

// ── Handlers ─────────────────────────────────────────────
async function handleStart(msg) {
  const { id, first_name } = msg.from;
  const user = await getUser(String(id));
  if (user?.phone) {
    return sendMessage(id,
      `👋 Xush kelibsiz, <b>${first_name}</b>!\n✅ Telefon: <code>${user.phone}</code>`,
      { reply_markup: JSON.stringify({ inline_keyboard: [[
        { text: '✂️ Navbat olish', web_app: { url: MINI_APP_URL } }
      ]]}) }
    );
  }
  return sendMessage(id,
    `👋 Salom, <b>${first_name}</b>!\n\n🏪 <b>Black Diamond</b> ga xush kelibsiz!\n\n📲 Telefon raqamingizni ulashing:`,
    { reply_markup: JSON.stringify({ keyboard: [[
      { text: '📱 Telefon raqamni ulashish', request_contact: true }
    ]], resize_keyboard: true, one_time_keyboard: true }) }
  );
}

async function handleContact(msg) {
  const { id, first_name, username } = msg.from;
  const contact = msg.contact;
  if (String(contact.user_id) !== String(id))
    return sendMessage(id, '❌ Faqat o\'z telefon raqamingizni ulashing.');
  const phone = contact.phone_number.startsWith('+') ? contact.phone_number : '+' + contact.phone_number;
  await upsertUser(id, first_name, username || '', phone);
  await sendMessage(id,
    `✅ <b>Ro'yxatdan o'tdingiz!</b>\n👤 ${first_name}\n📱 <code>${phone}</code>`,
    { reply_markup: JSON.stringify({ keyboard: [[]], remove_keyboard: true }) }
  );
  return sendMessage(id, '🎉 Navbat olish uchun tugmani bosing:',
    { reply_markup: JSON.stringify({ inline_keyboard: [[
      { text: '✂️ Navbat olish', web_app: { url: MINI_APP_URL } }
    ]]}) }
  );
}

async function handleBarberCheck(msg) {
  const tgId = String(msg.from.id);
  const barber = await getBarber(tgId);
  if (!barber)
    return sendMessage(tgId, `❌ Siz barberlar ro'yxatida topilmadingiz.\nAdmin IDingizni qo'shishi kerak: <code>${tgId}</code>`);
  if (!barber.active)
    return sendMessage(tgId, `⚠️ Profilingiz nofaol. Admin bilan bog'laning.`);
  return sendMessage(tgId,
    `✅ <b>Salom, ${barber.name}!</b>\n💈 ${barber.role}\n\nYangi navbatlar shu chatga keladi 🎉`);
}

async function handleCallback(cb) {
  const data = cb.data || '';
  const chatId = cb.message?.chat?.id;
  const msgId  = cb.message?.message_id;
  const origText = cb.message?.text || '';
  let status = null, bookingId = null, label = '';

  if (data.startsWith('accept_')) { bookingId = data.slice(7); status = 'done';   label = '✅ Qabul qilindi'; }
  else if (data.startsWith('cancel_')) { bookingId = data.slice(7); status = 'cancel'; label = '❌ Bekor qilindi'; }

  await answerCallback(cb.id, label);
  if (bookingId && status) await updateBookingStatus(bookingId, status);
  if (chatId && msgId && label) await editMessage(chatId, msgId, origText + `\n\n<b>${label}</b>`);
}

async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    if (msg.text === '/start')   return handleStart(msg);
    if (msg.text === '/barber')  return handleBarberCheck(msg);
    if (msg.contact)             return handleContact(msg);
  }
  if (update.callback_query) return handleCallback(update.callback_query);
}

// ── Reminders ─────────────────────────────────────────────
const MONTHS = {'Yanvar':0,'Fevral':1,'Mart':2,'Aprel':3,'May':4,'Iyun':5,
  'Iyul':6,'Avgust':7,'Sentyabr':8,'Oktyabr':9,'Noyabr':10,'Dekabr':11};
const sentReminders = new Set();

async function checkReminders() {
  try {
    const now = new Date();
    const todayStr = `${now.getDate()} ${Object.keys(MONTHS)[now.getMonth()]} ${now.getFullYear()}`;
    const data = await sbReq('GET',
      `bookings?booking_date=eq.${encodeURIComponent(todayStr)}&status=eq.pending&select=id,telegram_id,telegram_name,barber_name,booking_time`);
    if (!Array.isArray(data)) return;
    for (const bk of data) {
      if (!bk.telegram_id || !bk.booking_time) continue;
      const [h, m] = bk.booking_time.split(':').map(Number);
      const bookingMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
      const diffMin = (bookingMs - Date.now()) / 60000;
      if (diffMin >= 28 && diffMin <= 32 && !sentReminders.has(bk.id)) {
        sentReminders.add(bk.id);
        await sendMessage(bk.telegram_id,
          `⏰ <b>Hey, ${bk.telegram_name || "do'stim"}!</b>\n\n` +
          `💈 Navbatingizga atigi <b>30 daqiqa</b> qoldi!\n\n` +
          `🕐 Vaqt: <b>${bk.booking_time}</b>\n✂️ Master: <b>${bk.barber_name}</b>\n\n` +
          `🏃 Uydan chiqish vaqti — aks holda soch o'sib ketadi! 😄\n💎 <b>Black Diamond</b> da kutamiz!`
        );
      }
    }
  } catch(e) { console.error('checkReminders:', e.message); }
}

module.exports = { handleUpdate, checkReminders, sendMessage, scheduleReminder: () => {} };
