// api/subscription/verify.js
import crypto from 'crypto';
import { verifyToken } from '../../lib/auth.js';
import { corsMiddleware } from '../../lib/cors.js';
import { db, admin } from '../../lib/firebase.js';

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']
      });
    }

    // Verify Razorpay signature
    const isSignatureValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      console.error('❌ Invalid Razorpay signature:', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        userId: user.uid
      });
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    console.log('✅ Razorpay signature verified successfully');

    // Calculate subscription expiry (1 month from now)
    const subscriptionStart = new Date();
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 1);

    // Update user profile with subscription
    const userRef = db.collection('users').doc(user.uid);
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      
      // Update user with subscription details
      transaction.update(userRef, {
        isQueenSubscriber: true,
        queenSubscriptionExpiry: admin.firestore.Timestamp.fromDate(subscriptionExpiry),
        queenSubscriptionStart: admin.firestore.Timestamp.fromDate(subscriptionStart),
        lastWeeklyBeesGiven: null, // Reset weekly bees
        totalSubscriptions: (userData.totalSubscriptions || 0) + 1,
        totalSpent: (userData.totalSpent || 0) + 499, // ₹499
        lastSubscriptionPayment: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          amount: 49900, // ₹499 in paise
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    });

    // Log successful subscription
    console.log('✅ Subscription activated successfully:', {
      userId: user.uid,
      paymentId: razorpay_payment_id,
      subscriptionExpiry: subscriptionExpiry.toISOString()
    });

    // Store subscription transaction record
    await db.collection('subscriptions').add({
      userId: user.uid,
      userEmail: user.email || 'unknown',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: 49900,
      currency: 'INR',
      subscriptionType: 'queen_bee',
      startDate: admin.firestore.Timestamp.fromDate(subscriptionStart),
      expiryDate: admin.firestore.Timestamp.fromDate(subscriptionExpiry),
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      subscriptionExpiry: subscriptionExpiry.toISOString(),
      subscriptionType: 'queen_bee'
    });

  } catch (error) {
    console.error('❌ Error verifying subscription:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    res.status(500).json({ 
      error: 'Failed to verify subscription',
      details: error.message 
    });
  }
};

export default corsMiddleware(handler);