// api/create-custom-token.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (do this once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const handler = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Create custom token using email as UID
    const customToken = await admin.auth().createCustomToken(email, {
      email: email,
      signInMethod: 'email-otp'
    });

    console.log(`✅ Custom token created for ${email}`);

    res.status(200).json({
      success: true,
      token: customToken,
      message: 'Custom token created successfully'
    });

  } catch (error) {
    console.error('❌ Custom token creation error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create custom token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = handler;