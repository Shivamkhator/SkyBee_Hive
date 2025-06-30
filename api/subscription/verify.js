// api/subscription/verify.js
const crypto = require('crypto');
const razorpay = require('../../lib/razorpay');
const { verifyToken } = require('../../lib/auth');
const { db } = require('../../lib/firebase');
const allowCors = require('../../lib/cors');

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
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
        error: 'Missing required payment details'
      });
    }

    console.log(`👑 Verifying subscription payment for user ${user.uid}: ${razorpay_payment_id}`);

    // Verify signature
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get subscription order from Firestore
    const orderDoc = await db.collection('subscription_orders').doc(razorpay_order_id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Subscription order not found' });
    }

    const orderData = orderDoc.data();
    
    if (orderData.userId !== user.uid) {
      return res.status(403).json({ error: 'Unauthorized access to subscription order' });
    }

    if (orderData.status === 'completed') {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      return res.json({
        success: true,
        message: 'Subscription already activated',
        subscriptionType: orderData.subscriptionType,
        transactionId: razorpay_payment_id
      });
    }

    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not captured' });
    }

    if (payment.amount !== orderData.amount) {
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    // Calculate subscription dates
    const subscriptionStart = new Date();
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 1);

    // Process subscription in transaction
    const result = await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(user.uid);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();

      // Update user profile with subscription
      transaction.update(userRef, {
        isQueenSubscriber: true,
        queenSubscriptionExpiry: subscriptionExpiry,
        queenSubscriptionStart: subscriptionStart,
        lastWeeklyBeesGiven: null, // Reset weekly bees
        totalSubscriptions: (userData.totalSubscriptions || 0) + 1,
        totalSpent: (userData.totalSpent || 0) + (orderData.amount / 100),
        lastPurchase: new Date() // Same as your payment verification
      });

      // Create subscription record
      const subscriptionRef = db.collection('users').doc(user.uid)
        .collection('subscriptions').doc(razorpay_payment_id);
      transaction.set(subscriptionRef, {
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        amount: orderData.amount / 100,
        subscriptionType: orderData.subscriptionType,
        startDate: subscriptionStart,
        expiryDate: subscriptionExpiry,
        timestamp: new Date(),
        status: 'active',
        verified: true,
        paymentMethod: payment.method,
        paymentDetails: {
          email: payment.email,
          contact: payment.contact,
          bank: payment.bank || null,
          wallet: payment.wallet || null
        }
      });

      // Update subscription order status
      const orderRef = db.collection('subscription_orders').doc(razorpay_order_id);
      transaction.update(orderRef, {
        status: 'completed',
        paymentId: razorpay_payment_id,
        completedAt: new Date(),
        verified: true,
        subscriptionStart: subscriptionStart,
        subscriptionExpiry: subscriptionExpiry
      });

      return {
        subscriptionType: orderData.subscriptionType,
        subscriptionExpiry: subscriptionExpiry.toISOString()
      };
    });

    console.log('✅ Subscription payment verified and activated successfully');

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscriptionType: result.subscriptionType,
      subscriptionExpiry: result.subscriptionExpiry,
      transactionId: razorpay_payment_id
    });

  } catch (error) {
    console.error('❌ Subscription verification failed:', error);
    res.status(500).json({
      error: 'Subscription verification failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = allowCors(handler);