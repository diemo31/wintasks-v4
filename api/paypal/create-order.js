const { createOrder } = require('./helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    const order = await createOrder(amount);
    res.json({ id: order.id, status: order.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
