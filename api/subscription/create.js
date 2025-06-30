// api/subscription/create.js
const razorpay = require('../../lib/razorpay');
const { verifyToken } = require('../../lib/auth');
const { db } = require('../../lib/firebase');
const allowCors = require('../../lib/cors');

const generateShortReceipt = (userId) => {
  const shortUserId = userId.substring(0, 15);
  const timestamp = Date.now().toString().slice(-10);
  return `sub_${shortUserId}_${timestamp}`;
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = await verifyToken(req);
    const { amount, currency = 'INR', subscriptionType } = req.body;

    // Validate required fields
    if (!amount || !subscriptionType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'subscriptionType']
      });
    }

    // Validate subscription type
    if (subscriptionType !== 'queen_bee') {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }

    // Validate amount (49900 paise = ₹499)
    if (amount !== 49900) {
      return res.status(400).json({ 
        error: 'Invalid amount. Expected ₹499',
        expected: 49900,
        received: amount 
      });
    }

    console.log(`👑 Creating subscription order for user ${user.uid}, amount: ₹${amount/100}`);

    // Generate short receipt
    const receipt = generateShortReceipt(user.uid);
    console.log(`🧾 Generated subscription receipt: "${receipt}" (Length: ${receipt.length})`);

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: currency,
      receipt: receipt,
      notes: {
        userId: user.uid,
        productType: 'subscription',
        subscriptionType: 'queen_bee',
        duration: '1_month',
        appName: 'SkyBee'
      }
    };

    const order = await razorpay.orders.create(options);

    // Store subscription order in Firestore (IMPORTANT - was missing!)
    await db.collection('subscription_orders').doc(order.id).set({
      orderId: order.id,
      userId: user.uid,
      amount: amount,
      currency: currency,
      subscriptionType: 'queen_bee',
      duration: '1_month',
      status: 'created',
      createdAt: new Date(),
      receipt: receipt
    });

    console.log(`✅ Subscription order created successfully: ${order.id}`);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('❌ Error creating subscription order:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    res.status(500).json({
      error: 'Failed to create subscription order',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = allowCors(handler);