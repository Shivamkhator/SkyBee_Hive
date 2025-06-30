// api/payment/verify-payment.js - Updated for bees
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

    console.log(`💳 Verifying payment for user ${user.uid}: ${razorpay_payment_id}`);

    // Verify signature
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get order from Firestore
    const orderDoc = await db.collection('payment_orders').doc(razorpay_order_id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();
    
    if (orderData.userId !== user.uid) {
      return res.status(403).json({ error: 'Unauthorized access to order' });
    }

    if (orderData.status === 'completed') {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const currentBees = userDoc.exists ? (userDoc.data().bees || 0) : 0;
      
      return res.json({
        success: true,
        message: 'Payment already processed',
        beesAdded: orderData.beeQuantity,
        newBeeCount: currentBees,
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

    // Process payment in transaction
    const result = await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(user.uid);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const currentBees = userData.bees || 0;
      const newBeeCount = currentBees + orderData.beeQuantity;

      // Update user profile
      transaction.update(userRef, {
        bees: newBeeCount,
        lastPurchase: new Date(),
        totalPurchases: (userData.totalPurchases || 0) + 1,
        totalSpent: (userData.totalSpent || 0) + (orderData.amount / 100)
      });

      // Create purchase record
      const purchaseRef = db.collection('users').doc(user.uid)
        .collection('purchases').doc(razorpay_payment_id);
      transaction.set(purchaseRef, {
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        amount: orderData.amount / 100,
        beesPurchased: orderData.beeQuantity,
        timestamp: new Date(),
        status: 'completed',
        verified: true,
        paymentMethod: payment.method,
        paymentDetails: {
          email: payment.email,
          contact: payment.contact,
          bank: payment.bank || null,
          wallet: payment.wallet || null
        }
      });

      // Update order status
      const orderRef = db.collection('payment_orders').doc(razorpay_order_id);
      transaction.update(orderRef, {
        status: 'completed',
        paymentId: razorpay_payment_id,
        completedAt: new Date(),
        verified: true
      });

      return {
        newBeeCount: newBeeCount,
        beesAdded: orderData.beeQuantity,
        previousBeeCount: currentBees
      };
    });

    console.log('✅ Payment verified and processed successfully');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      beesAdded: result.beesAdded,
      newBeeCount: result.newBeeCount,
      transactionId: razorpay_payment_id
    });

  } catch (error) {
    console.error('❌ Payment verification failed:', error);
    res.status(500).json({
      error: 'Payment verification failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = allowCors(handler);