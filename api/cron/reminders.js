const { checkReminders } = require('../../lib/bot');
module.exports = async (req, res) => {
  await checkReminders();
  res.json({ ok: true, time: new Date().toISOString() });
};
