const { createOrder } = require('./helpers');

const SUPABASE_URL = 'https://hxqjhqkmzhrreysvdycl.supabase.co';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const { userId, productType, productId, userEmail } = req.body;
  if (!userId || !productType || !productId) return res.status(400).json({ error: 'Missing purchase metadata' });

  try {
    const order = await createOrder(amount);
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (serviceKey) {
      await fetch(`${SUPABASE_URL}/rest/v1/paypal_orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          paypal_order_id: order.id,
          user_id: userId,
          user_email: userEmail || '',
          product_type: productType,
          product_id: productId,
          amount_usd: amount,
        }),
      });
    }
    res.json({ id: order.id, status: order.status, approvalUrl: order.approvalUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
