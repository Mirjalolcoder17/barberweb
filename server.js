'use strict';

// faqat local uchun, Vercel o'z env vars ni beradi
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-mini-app-url.com'; // .env da sozlang
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vezdgqyndfdafwcdrgfz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemRncXluZGZkYWZ3Y2RyZ2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkwODAyNiwiZXhwIjoyMDkzNDg0MDI2fQ.lfl41wMlXsUM5QoBKLT3O7W9M-M6LW3ps2yt0K8cmpw';

if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
  console.warn('⚠️  BOT_TOKEN va ADMIN_CHAT_ID environment variables yo\'q.');
}

const fetchFn = (typeof fetch !== 'undefined')
  ? fetch
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Explicit root route — Vercel serverless uchun
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// Supabase helper — users jadvaliga yozish/o'qish
// ============================================================
async function sbRequest(method, endpoint, body = null) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetchFn(`${SUPABASE_URL}/rest/v1/${endpoint}`, opts);
    return await r.json();
  } catch (e) {
    console.error('Supabase error:', e.message);
    return null;
  }
}

async function getUser(telegram_id) {
  const data = await sbRequest('GET', `users?telegram_id=eq.${telegram_id}&select=*`);
  return Array.isArray(data) ? data[0] : null;
}

async function upsertUser(telegram_id, first_name, username, phone) {
  return sbRequest('POST', 'users', {
    telegram_id: String(telegram_id),
    first_name: first_name || '',
    username: username || '',
    phone: phone || '',
    registered_at: new Date().toISOString()
  });
}

// ============================================================
// Telegram API helpers
// ============================================================
async function sendMessage(chat_id, text, extra = {}) {
  return fetchFn(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', ...extra })
  }).then(r => r.json()).catch(e => console.error('sendMessage error:', e));
}

async function answerCallback(callback_query_id, text) {
  return fetchFn(`${TG_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id, text, show_alert: false })
  }).catch(() => {});
}

async function editMessage(chat_id, message_id, text) {
  return fetchFn(`${TG_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id, message_id, text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] }
    })
  }).catch(() => {});
}

// ============================================================
// Reminder — navbatga 30 daqiqa qolganida mijozga xabar
// ============================================================
function scheduleReminder(booking) {
  const { booking_date, booking_time, telegram_id, telegram_name, barber_name } = booking;
  if (!telegram_id || !booking_date || !booking_time) return;

  // Sana va vaqtni parse qilish (format: "20 May 2026" "14:30")
  const months = {
    'Yanvar':1,'Fevral':2,'Mart':3,'Aprel':4,'May':5,'Iyun':6,
    'Iyul':7,'Avgust':8,'Sentyabr':9,'Oktyabr':10,'Noyabr':11,'Dekabr':12
  };
  try {
    const [d, mon, y] = booking_date.split(' ');
    const [h, m] = booking_time.split(':');
    const month = months[mon];
    if (!month) return;
    const bookingMs = new Date(+y, month - 1, +d, +h, +m, 0).getTime();
    const reminderMs = bookingMs - 30 * 60 * 1000; // 30 daqiqa oldin
    const delay = reminderMs - Date.now();
    if (delay < 0) return; // o'tib ketgan

    setTimeout(async () => {
      const msg =
        `⏰ <b>Hey, ${telegram_name || 'do\'stim'}!</b>\n\n` +
        `💈 Navbatingizga atigi <b>30 daqiqa</b> qoldi!\n\n` +
        `🕐 Vaqt: <b>${booking_time}</b>\n` +
        `✂️ Master: <b>${barber_name}</b>\n\n` +
        `🏃 Uydan chiqish vaqti keldi — aks holda soch o'sib ketadi! 😄\n` +
        `💎 <b>Black Diamond</b> da kutamiz!`;
      try {
        await sendMessage(telegram_id, msg);
      } catch(e) {
        console.error('Reminder error:', e.message);
      }
    }, delay);

    console.log(`⏰ Reminder scheduled for ${telegram_name} at ${booking_date} ${booking_time} (in ${Math.round(delay/60000)} min)`);
  } catch(e) {
    console.error('scheduleReminder parse error:', e.message);
  }
}

// ============================================================
// Server-side reminder cron — har daqiqa tekshiradi
// ============================================================
const sentReminders = new Set(); // takroriy yuborishni oldini olish

async function checkReminders() {
  try {
    // Bugungi pending navbatlarni olish
    const now = new Date();
    const todayStr = now.getDate() + ' ' +
      ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'][now.getMonth()] +
      ' ' + now.getFullYear();

    const data = await sbRequest('GET',
      `bookings?booking_date=eq.${encodeURIComponent(todayStr)}&status=eq.pending&select=id,telegram_id,telegram_name,barber_name,booking_time`
    );
    if (!Array.isArray(data)) return;

    for (const bk of data) {
      if (!bk.telegram_id || !bk.booking_time) continue;
      const [h, m] = bk.booking_time.split(':').map(Number);
      const bookingMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
      const diffMin = (bookingMs - Date.now()) / 60000;

      // 28-32 daqiqa oralig'ida yuborish (1 daqiqalik aniqlik uchun)
      if (diffMin >= 28 && diffMin <= 32 && !sentReminders.has(bk.id)) {
        sentReminders.add(bk.id);
        const msg =
          `⏰ <b>Hey, ${bk.telegram_name || "do'stim"}!</b>\n\n` +
          `💈 Navbatingizga atigi <b>30 daqiqa</b> qoldi!\n\n` +
          `🕐 Vaqt: <b>${bk.booking_time}</b>\n` +
          `✂️ Master: <b>${bk.barber_name}</b>\n\n` +
          `🏃 Uydan chiqish vaqti keldi — aks holda soch o'sib ketadi! 😄\n` +
          `💎 <b>Black Diamond</b> da sizni kutamiz!`;
        await sendMessage(bk.telegram_id, msg);
        console.log(`⏰ Reminder sent to ${bk.telegram_name} (${bk.booking_time})`);
      }
    }
  } catch(e) {
    console.error('checkReminders error:', e.message);
  }
}

// ============================================================
// /barber handler — barber o'zini tanishtiradi
// ============================================================
async function handleBarberCheck(msg) {
  const chatId = msg.chat.id;
  const tgId = String(msg.from.id);

  // barbers jadvalida telegram_id bor-yo'qligini tekshirish
  const data = await sbRequest('GET', `barbers?telegram_id=eq.${tgId}&select=id,name,role,active`);
  const barber = Array.isArray(data) ? data[0] : null;

  if (!barber) {
    await sendMessage(chatId,
      `❌ Siz barberlar ro'yxatida <b>topilmadingiz</b>.\n\n` +
      `Admin sizning Telegram IDингizни (<code>${tgId}</code>) barberlar jadvaliga qo'shishi kerak.`
    );
    return;
  }

  if (!barber.active) {
    await sendMessage(chatId, `⚠️ Sizning profilingiz hozir <b>nofaol</b>. Admin bilan bog'laning.`);
    return;
  }

  await sendMessage(chatId,
    `✅ <b>Salom, ${barber.name}!</b>\n\n` +
    `💈 Lavozim: ${barber.role}\n` +
    `🆔 ID: <code>${tgId}</code>\n\n` +
    `Endi sizga yangi navbatlar bu chatga keladi. Tayyor! 🎉`
  );
}

// ============================================================
// /start handler
// ============================================================
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const user = msg.from;
  const tgId = String(user.id);

  // Bazada bor-yo'qligini tekshir
  const existing = await getUser(tgId);

  if (existing && existing.phone) {
    // Allaqachon ro'yxatdan o'tgan — mini app ni ochish tugmasi
    await sendMessage(chatId,
      `👋 Xush kelibsiz, <b>${user.first_name}</b>!\n\n` +
      `✅ Siz allaqachon ro'yxatdan o'tgansiz.\n` +
      `📱 Telefon: <code>${existing.phone}</code>\n\n` +
      `Navbat olish uchun quyidagi tugmani bosing:`,
      {
        reply_markup: JSON.stringify({
          inline_keyboard: [[
            { text: '✂️ Navbat olish', web_app: { url: MINI_APP_URL } }
          ]]
        })
      }
    );
  } else {
    // Yangi foydalanuvchi — telefon so'rash
    await sendMessage(chatId,
      `👋 Salom, <b>${user.first_name}</b>!\n\n` +
      `🏪 <b>Termiz Barber</b> ga xush kelibsiz!\n\n` +
      `📲 Mini appdan foydalanish uchun avval <b>telefon raqamingizni</b> ulashing.\n` +
      `Quyidagi tugmani bosing:`,
      {
        reply_markup: JSON.stringify({
          keyboard: [[
            { text: '📱 Telefon raqamni ulashish', request_contact: true }
          ]],
          resize_keyboard: true,
          one_time_keyboard: true
        })
      }
    );
  }
}

// ============================================================
// Contact handler — foydalanuvchi telefon ulashganda
// ============================================================
async function handleContact(msg) {
  const chatId = msg.chat.id;
  const contact = msg.contact;
  const user = msg.from;

  // Faqat o'z raqamini ulashishi kerak
  if (String(contact.user_id) !== String(user.id)) {
    await sendMessage(chatId, '❌ Faqat o\'z telefon raqamingizni ulashing.');
    return;
  }

  const phone = contact.phone_number.startsWith('+')
    ? contact.phone_number
    : '+' + contact.phone_number;

  // Bazaga saqlash
  await upsertUser(user.id, user.first_name, user.username || '', phone);

  // Klaviaturani olib tashlash va mini app tugmasini ko'rsatish
  await sendMessage(chatId,
    `✅ <b>Ro'yxatdan o'tdingiz!</b>\n\n` +
    `👤 Ism: <b>${user.first_name}</b>\n` +
    `📱 Telefon: <code>${phone}</code>\n\n` +
    `Endi navbat olishingiz mumkin 👇`,
    {
      reply_markup: JSON.stringify({
        keyboard: [[]],
        remove_keyboard: true
      })
    }
  );

  // Mini app tugmasi bilan yangi xabar
  await sendMessage(chatId,
    `🎉 Hammasi tayyor! Navbat olish uchun tugmani bosing:`,
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [[
          { text: '✂️ Navbat olish', web_app: { url: MINI_APP_URL } }
        ]]
      })
    }
  );
}

// ============================================================
// Callback query handler (admin inline tugmalar)
// ============================================================
async function handleCallback(cb) {
  const data = cb.data || '';
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const originalText = cb.message?.text || '';

  let answerText = '';
  let statusText = '';
  let bookingId = null;
  let newStatus = null;

  if (data.startsWith('accept_')) {
    bookingId = data.slice(7);
    newStatus = 'done';
    answerText = `✅ Navbat #${bookingId} qabul qilindi`;
    statusText = `\n\n✅ <b>Qabul qilindi</b>`;
  } else if (data.startsWith('cancel_') || data.startsWith('delay_')) {
    bookingId = data.startsWith('cancel_') ? data.slice(7) : data.slice(6);
    newStatus = 'cancel';
    answerText = `❌ Navbat bekor qilindi`;
    statusText = `\n\n❌ <b>Bekor qilindi</b>`;
  }

  await answerCallback(cb.id, answerText);

  // Supabase da statusni yangilash
  if (bookingId && newStatus) {
    await sbRequest('PATCH', `bookings?id=eq.${bookingId}`, { status: newStatus });
  }

  if (chatId && messageId && statusText) {
    await editMessage(chatId, messageId, originalText + statusText);
  }
}

// ============================================================
// Update dispatcher
// ============================================================
async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    if (msg.text === '/start') {
      await handleStart(msg);
    } else if (msg.text === '/barber') {
      await handleBarberCheck(msg);
    } else if (msg.contact) {
      await handleContact(msg);
    }
  } else if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

// ============================================================
// Webhook endpoint
// ============================================================
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    await handleUpdate(req.body);
  } catch (e) {
    console.error('Webhook error:', e);
  }
  res.json({ ok: true });
});

// ============================================================
// Cron endpoint — Vercel har daqiqa chaqiradi
// ============================================================
app.get('/api/cron/reminders', async (req, res) => {
  await checkReminders();
  res.json({ ok: true, time: new Date().toISOString() });
});

// ============================================================
// POST /api/queue — mijozdan navbat kelganda admin ga xabar
// ============================================================
app.post('/api/queue', async (req, res) => {
  try {
    const { name, service, time, queueNumber } = req.body || {};
    if (!name || !service || !time || queueNumber == null) {
      return res.status(400).json({ ok: false, error: 'Maydonlar yetishmayapti' });
    }
    const text =
      `🔔 <b>Yangi navbat #${queueNumber}</b>\n\n` +
      `👤 Mijoz: ${name}\n` +
      `✂️ Xizmat: ${service}\n` +
      `🕒 Vaqt: ${time}`;

    const tgData = await sendMessage(ADMIN_CHAT_ID, text, {
      reply_markup: JSON.stringify({
        inline_keyboard: [[
          { text: '✅ Qabul qilindi', callback_data: `accept_${queueNumber}` },
          { text: '❌ Kechiktirildi', callback_data: `delay_${queueNumber}` }
        ]]
      })
    });

    // 30 daqiqa reminder rejalashtirish
    scheduleReminder(req.body);

    return res.json({ ok: true, queueNumber, telegramMessageId: tgData?.result?.message_id });
  } catch (e) {
    console.error('/api/queue error:', e);
    return res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
});

// ============================================================
// Long polling
// ============================================================
let pollOffset = 0;
async function pollUpdates() {
  try {
    const r = await fetchFn(`${TG_API}/getUpdates?timeout=30&offset=${pollOffset}`);
    const j = await r.json();
    if (j?.ok && Array.isArray(j.result)) {
      for (const upd of j.result) {
        pollOffset = upd.update_id + 1;
        await handleUpdate(upd);
      }
    }
  } catch (e) {
    console.error('poll error:', e.message);
  } finally {
    setTimeout(pollUpdates, 1000);
  }
}

// ============================================================
// Start
// ============================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    if (String(process.env.USE_POLLING ?? 'true').toLowerCase() !== 'false') {
      pollUpdates();
    }
    // Reminder cron — har 60 soniya
    setInterval(checkReminders, 60 * 1000);
    checkReminders();
  });
}

module.exports = app;
