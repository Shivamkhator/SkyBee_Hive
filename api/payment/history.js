const { verifyToken } = require('../../lib/auth');
const { db } = require('../../lib/firebase');
const allowCors = require('../../lib/cors');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    const limit = parseInt(req.query.limit) || 10;

    const purchasesSnapshot = await db.collection('users').doc(user.uid)
      .collection('purchases')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const purchases = [];
    purchasesSnapshot.forEach(doc => {
      purchases.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      purchases: purchases,
      total: purchases.length
    });

  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({
      error: 'Failed to fetch purchase history',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = allowCors(handler);