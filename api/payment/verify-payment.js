// api/payment/verify-payment.js - Fully Fixed with Upsert Logic

const crypto = require('crypto');
const razorpay = require('../../lib/razorpay');
const { verifyToken } = require('../../lib/auth');
const { db } = require('../../lib/firebase');
const allowCors = require('../../lib/cors');
// NOTE: Must ensure 'firebase-admin' is available for FieldValue.increment()
const admin = require('firebase-admin'); 

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
      const orderRef = db.collection('payment_orders').doc(razorpay_order_id);
      
      const userDoc = await transaction.get(userRef);
      const beeQuantity = orderData.beeQuantity;
      
      let previousBeeCount = 0;
      
      // 🛑 FIX: UPSERT LOGIC 
      if (!userDoc.exists) {
        // 1. Initialize the document using SET (mandatory for non-existent doc)
        const initialProfile = {
            bees: 0,
            pollen: 0,
            totalPurchases: 0,
            totalSpent: 0,
            isQueenSubscriber: false,
            createdAt: new Date(),
            // Store Clerk ID for clarity
            clerkId: user.uid, 
        };
        transaction.set(userRef, initialProfile);
        console.log(`Profile initialized for new Clerk user: ${user.uid}`);
        
        previousBeeCount = 0;
        
      } else {
        // 2. Existing user: get current count
        const userData = userDoc.data();
        previousBeeCount = userData.bees || 0;
      }

      const newBeeCount = previousBeeCount + beeQuantity; // Calculate for return data

      // 3. Perform the atomic update using UPDATE
      // This ensures both new and existing documents get the purchase recorded atomically.
      transaction.update(userRef, {
        bees: admin.firestore.FieldValue.increment(beeQuantity),
        lastPurchase: new Date(),
        totalPurchases: admin.firestore.FieldValue.increment(1),
        totalSpent: admin.firestore.FieldValue.increment(orderData.amount / 100)
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
      transaction.update(orderRef, {
        status: 'completed',
        paymentId: razorpay_payment_id,
        completedAt: new Date(),
        verified: true
      });

      return {
        newBeeCount: newBeeCount,
        beesAdded: orderData.beeQuantity,
        previousBeeCount: previousBeeCount
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