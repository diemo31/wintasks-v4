const { captureOrder } = require('./helpers');

const SUPABASE_URL = 'https://hxqjhqkmzhrreysvdycl.supabase.co';

const TOKEN_PACKS = {
  p0: { tokens: 200, expiryMonths: 6 },
  p1: { tokens: 500, expiryMonths: 6 },
  p2: { tokens: 1000, expiryMonths: 6 },
  p3: { tokens: 2500, expiryMonths: 12 },
  p4: { tokens: 5000, expiryMonths: 12 },
  p5: { tokens: 9000, expiryMonths: 12 },
};

const MEMBERSHIP_MONTHS = { '1mes': 1, '3meses': 3, '6meses': 6 };

const supabaseFetch = (path, options = {}) => {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, 'Authorization': `Bearer ${key}` },
  });
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const capture = await captureOrder(orderId);
    const status = capture.status;
    const payerEmail = capture.payer?.email_address;
    const grossAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;

    if (status === 'COMPLETED') {
      const key = process.env.SUPABASE_SERVICE_KEY;
      if (key) {
        const orderRes = await supabaseFetch(`/rest/v1/paypal_orders?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=*`);
        const orders = await orderRes.json();
        const po = orders?.[0];
        if (po && po.status === 'pending') {
          const { user_id, product_type, product_id } = po;

          if (product_type === 'tokens') {
            const pack = TOKEN_PACKS[product_id];
            if (pack) {
              const expiresAt = new Date(Date.now() + pack.expiryMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
              await supabaseFetch('/rest/v1/rpc/add_tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  p_user_id: user_id, p_amount: pack.tokens,
                  p_source: `purchase_${product_id}`, p_expires_at: expiresAt,
                }),
              });
            }
          }

          if (product_type === 'membership') {
            const months = MEMBERSHIP_MONTHS[product_id];
            if (months) {
              const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
              const ref = `PP-${user_id.slice(-4)}-${Date.now().toString().slice(-5)}`;
              await supabaseFetch(`/rest/v1/memberships?onConflict=user_id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({
                  user_id, plan: product_id, status: 'active',
                  payment_status: 'verified', payment_ref: ref,
                  start_date: new Date().toISOString(), end_date: endDate,
                  amount_usd: grossAmount || po.amount_usd,
                  user_email: payerEmail || '',
                }),
              });
            }
          }

          await supabaseFetch(`/rest/v1/paypal_orders?id=eq.${po.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
          });
        }
      }
    }

    res.json({ status, payerEmail, grossAmount, id: capture.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
