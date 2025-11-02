// api/payment/create-order.js - Updated for bees
const razorpay = require('../../lib/razorpay');
const { verifyToken } = require('../../lib/auth');
const { db } = require('../../lib/firebase');
const allowCors = require('../../lib/cors');

const generateShortReceipt = (userId) => {
  const shortUserId = userId.substring(0, 15);
  const timestamp = Date.now().toString().slice(-10);
  return `${shortUserId}_${timestamp}`;
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = await verifyToken(req);
    const { amount, currency = 'INR' } = req.body;

    // Validate input
    if (!amount) {
      return res.status(400).json({ error: 'Invalid amount. Expected ₹69' });
    }

    console.log(`🛒 Creating order for user ${user.uid}, amount: ₹${amount/100}`);

    // Generate short receipt
    const receipt = generateShortReceipt(user.uid);
    console.log(`🧾 Generated receipt: "${receipt}" (Length: ${receipt.length})`);

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: currency,
      receipt: receipt,
      notes: {
        userId: user.uid,
        productType: 'bees',
        quantity: 7,
        appName: 'SkyBee'
      }
    };

    const order = await razorpay.orders.create(options);

    // Store order in Firestore
    await db.collection('payment_orders').doc(order.id).set({
      orderId: order.id,
      userId: user.uid,
      amount: amount,
      currency: currency,
      status: 'created',
      createdAt: new Date(),
      beeQuantity: 7,
      receipt: receipt
    });

    console.log(`✅ Order created successfully: ${order.id}`);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      error: 'Failed to create payment order',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = allowCors(handler);