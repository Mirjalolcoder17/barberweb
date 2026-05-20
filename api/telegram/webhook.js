const { handleUpdate } = require('../../lib/bot');
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try { await handleUpdate(req.body); } catch(e) { console.error(e); }
  }
  res.json({ ok: true });
};
