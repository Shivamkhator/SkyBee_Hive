// api/subscription/create.js
import Razorpay from 'razorpay';
import { verifyToken } from '../../lib/auth.js';
import { corsMiddleware } from '../../lib/cors.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    const { amount, currency, subscriptionType } = req.body;

    // Validate required fields
    if (!amount || !currency || !subscriptionType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'currency', 'subscriptionType']
      });
    }

    // Validate subscription type
    if (subscriptionType !== 'queen_bee') {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }

    // Validate amount (49900 paise = ₹499)
    const expectedAmount = 49900; // ₹499 in paise
    if (amount !== expectedAmount) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        expected: expectedAmount,
        received: amount 
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount,
      currency: currency,
      receipt: `sub_${user.uid}_${Date.now()}`,
      notes: {
        userId: user.uid,
        subscriptionType: subscriptionType,
        userEmail: user.email || 'unknown',
        createdAt: new Date().toISOString()
      }
    });

    console.log('✅ Subscription order created:', {
      orderId: order.id,
      amount: order.amount,
      userId: user.uid,
      subscriptionType
    });

    res.status(200).json({
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
      details: error.message 
    });
  }
};

export default corsMiddleware(handler);