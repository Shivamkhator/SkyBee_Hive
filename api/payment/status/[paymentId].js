const { verifyToken } = require('../../../lib/auth');
const { db } = require('../../../lib/firebase');
const allowCors = require('../../../lib/cors');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    const { paymentId } = req.query;

    const purchaseDoc = await db.collection('users').doc(user.uid)
      .collection('purchases').doc(paymentId).get();

    if (!purchaseDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const purchaseData = purchaseDoc.data();
    res.json({
      success: true,
      payment: {
        status: purchaseData.status,
        verified: purchaseData.verified,
        amount: purchaseData.amount,
        leafsPurchased: purchaseData.leafsPurchased,
        timestamp: purchaseData.timestamp,
        transactionId: purchaseData.transactionId
      }
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      error: 'Failed to fetch payment status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = allowCors(handler);