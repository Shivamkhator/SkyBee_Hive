const allowCors = require('../../lib/cors');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({
    service: 'payment',
    status: 'OK',
    timestamp: new Date().toISOString(),
    razorpay: {
      connected: !!process.env.RAZORPAY_KEY_ID,
      keyId: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.slice(0, 12)}...` : 'not set'
    },
    firebase: {
      connected: !!process.env.FIREBASE_PROJECT_ID,
      projectId: process.env.FIREBASE_PROJECT_ID || 'not set'
    }
  });
};

module.exports = allowCors(handler);