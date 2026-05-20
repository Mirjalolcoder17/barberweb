const { sendMessage, scheduleReminder } = require('../lib/bot');
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '8536944196';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { name, service, time, queueNumber, telegram_id, telegram_name, barber_name,
          booking_date, booking_time, phone, services_text, total_price, duration_min, note, id } = req.body || {};

  const msg = `🔔 <b>Yangi navbat!</b>\n\n` +
    `👤 Mijoz: <b>${telegram_name || name || "Noma'lum"}</b>\n` +
    `📱 Telefon: <code>${phone || '—'}</code>\n` +
    `✂️ Master: ${barber_name || service}\n` +
    `💈 Xizmat: ${services_text || service}\n` +
    `📅 Sana: <b>${booking_date || time}</b> ${booking_time || ''}\n` +
    `💰 Summa: <b>${total_price ? total_price.toLocaleString() + " so'm" : '—'}</b>\n` +
    `⏱ Davomiylik: ${duration_min || '—'} daqiqa` +
    (note ? `\n📝 Izoh: ${note}` : '');

  await sendMessage(ADMIN_CHAT_ID, msg, {
    reply_markup: JSON.stringify({ inline_keyboard: [[
      { text: '✅ Qabul', callback_data: 'accept_' + (id || queueNumber || Date.now()) },
      { text: '❌ Bekor', callback_data: 'cancel_' + (id || queueNumber || Date.now()) }
    ]]})
  });

  res.json({ ok: true });
};
