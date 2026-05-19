/**
 * WebBarber - Backend Server
 * ==========================
 * - POST /api/queue  -> mijozdan kelgan navbat ma'lumotini qabul qiladi
 *                       va Telegram orqali admin chatga sendMessage qiladi
 *                       (inline tugmalar: ✅ Qabul qilindi / ❌ Kechiktirildi).
 * - Bot callback_query handler -> admin tugmani bossa, bot javob qaytaradi
 *                                 va xabarga status qo'shib qo'yadi.
 *
 * Run:
 *   npm install
 *   npm start
 *
 * .env:
 *   BOT_TOKEN=...
 *   ADMIN_CHAT_ID=...
 *   PORT=3000               (ixtiyoriy)
 *   USE_POLLING=true        (default: true; webhook ishlatsangiz "false" qiling)
 */

'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
  console.error('❌ BOT_TOKEN va ADMIN_CHAT_ID .env faylida ko\'rsatilishi shart.');
  process.exit(1);
}

// Node 18+ uchun global fetch mavjud. Eski Node uchun node-fetch ishlatiladi.
const fetchFn = (typeof fetch !== 'undefined')
  ? fetch
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());

// Statik fayllar (index.html va boshqalar) shu serverdan beriladi.
app.use(express.static(path.join(__dirname)));

/* ============================================================
 * POST /api/queue
 *   body: { name, service, time, queueNumber }
 * ============================================================ */
app.post('/api/queue', async (req, res) => {
  try {
    const { name, service, time, queueNumber } = req.body || {};

    if (!name || !service || !time || queueNumber === undefined || queueNumber === null) {
      return res.status(400).json({
        ok: false,
        error: '`name`, `service`, `time`, `queueNumber` maydonlari talab qilinadi.'
      });
    }

    const text =
      `🆕 *Yangi navbat*\n\n` +
      `🔢 Navbat raqami: *#${escapeMd(String(queueNumber))}*\n` +
      `👤 Mijoz: ${escapeMd(String(name))}\n` +
      `✂️ Xizmat: ${escapeMd(String(service))}\n` +
      `🕒 Vaqt: ${escapeMd(String(time))}`;

    const reply_markup = {
      inline_keyboard: [[
        { text: '✅ Qabul qilindi',  callback_data: `accept_${queueNumber}` },
        { text: '❌ Kechiktirildi', callback_data: `delay_${queueNumber}`  }
      ]]
    };

    const tgResp = await fetchFn(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        reply_markup
      })
    });

    const tgData = await tgResp.json();
    if (!tgData.ok) {
      console.error('Telegram sendMessage error:', tgData);
      return res.status(502).json({ ok: false, error: 'Telegram API xatosi', details: tgData });
    }

    return res.json({
      ok: true,
      queueNumber,
      telegramMessageId: tgData.result.message_id
    });
  } catch (err) {
    console.error('POST /api/queue error:', err);
    return res.status(500).json({ ok: false, error: 'Server ichki xatosi' });
  }
});

/* ============================================================
 * Webhook variant (ixtiyoriy)
 *   Telegramda webhook qilib: setWebhook?url=https://your.host/api/telegram/webhook
 * ============================================================ */
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && update.callback_query) {
      await handleCallback(update.callback_query);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.json({ ok: true }); // har doim 200 qaytarish kerak
  }
});

/* ============================================================
 * Callback query handler
 *   accept_<queueNumber> -> ✅
 *   delay_<queueNumber>  -> ❌
 * ============================================================ */
async function handleCallback(cb) {
  const data = cb.data || '';
  const chatId = cb.message && cb.message.chat && cb.message.chat.id;
  const messageId = cb.message && cb.message.message_id;
  const originalText = (cb.message && cb.message.text) || '';

  let answerText = '';
  let confirmation = '';

  if (data.startsWith('accept_')) {
    const num = data.slice('accept_'.length);
    answerText = `✅ Navbat #${num} qabul qilindi`;
    confirmation = `\n\n✅ *Qabul qilindi* (#${num})`;
  } else if (data.startsWith('delay_')) {
    const num = data.slice('delay_'.length);
    answerText = `❌ Navbat #${num} kechiktirildi`;
    confirmation = `\n\n❌ *Kechiktirildi* (#${num})`;
  } else {
    answerText = 'Noma\'lum buyruq';
  }

  // 1) Callback queryga javob (tugmadagi loading spinnerni o'chiradi)
  try {
    await fetchFn(`${TG_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cb.id, text: answerText, show_alert: false })
    });
  } catch (err) {
    console.error('answerCallbackQuery error:', err);
  }

  // 2) Asl xabarni tahrirlash — tugmalarni o'chirish va status qo'shish
  if (chatId && messageId && confirmation) {
    try {
      await fetchFn(`${TG_API}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: originalText + confirmation,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }
        })
      });
    } catch (err) {
      console.error('editMessageText error:', err);
    }
  }
}

/* ============================================================
 * Long-polling (default).
 *   Webhook ishlatsangiz, .env da USE_POLLING=false qiling.
 * ============================================================ */
let pollOffset = 0;
async function pollUpdates() {
  try {
    const r = await fetchFn(`${TG_API}/getUpdates?timeout=30&offset=${pollOffset}`);
    const j = await r.json();
    if (j && j.ok && Array.isArray(j.result)) {
      for (const upd of j.result) {
        pollOffset = upd.update_id + 1;
        if (upd.callback_query) {
          await handleCallback(upd.callback_query);
        }
      }
    }
  } catch (err) {
    console.error('poll error:', err.message);
  } finally {
    setTimeout(pollUpdates, 1000);
  }
}

/* ============================================================
 * Yordamchi: Markdown'da maxsus belgilarni escape qilish
 * ============================================================ */
function escapeMd(s) {
  return String(s).replace(/([_*`\[\]])/g, '\\$1');
}

/* ============================================================
 * Server start
 * ============================================================ */
app.listen(PORT, () => {
  console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`👤 ADMIN_CHAT_ID: ${ADMIN_CHAT_ID}`);
  if (String(process.env.USE_POLLING || 'true').toLowerCase() !== 'false') {
    console.log('📡 Telegram long-polling rejimi yoqilgan...');
    pollUpdates();
  } else {
    console.log('🔗 Webhook rejimi (POST /api/telegram/webhook)');
  }
});
