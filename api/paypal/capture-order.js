const { captureOrder } = require('./helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const capture = await captureOrder(orderId);
    const status = capture.status;
    const payerEmail = capture.payer?.email_address;
    const grossAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    res.json({ status, payerEmail, grossAmount, id: capture.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
