const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // Raw body is needed for signature verification
  let rawBody = '';
  await new Promise((resolve) => {
    req.on('data', (chunk) => {
      rawBody += chunk;
    });
    req.on('end', resolve);
  });

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const isAuthentic = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );

  if (!isAuthentic) {
    console.error('❌ Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // ✅ Valid signature
  const event = JSON.parse(rawBody);

  console.log("📩 Event received: ${event.event}");

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    console.log('💰 Payment Captured:', payment);
  }

  return res.status(200).json({ status: 'Webhook received' });
};