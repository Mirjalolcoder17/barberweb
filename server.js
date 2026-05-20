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

  if (data.startsWith('accept_')) {
    const num = data.slice(7);
    answerText = `✅ Navbat #${num} qabul qilindi`;
    statusText = `\n\n✅ <b>Qabul qilindi</b>`;
  } else if (data.startsWith('delay_')) {
    const num = data.slice(6);
    answerText = `❌ Navbat #${num} kechiktirildi`;
    statusText = `\n\n❌ <b>Kechiktirildi</b>`;
  }

  await answerCallback(cb.id, answerText);
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
  });
}

module.exports = app;
