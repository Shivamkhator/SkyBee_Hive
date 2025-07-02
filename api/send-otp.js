// api/send-otp.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const handler = async (req, res) => {
  // Add CORS headers for web requests
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
    const { email, otp, type = 'signin' } = req.body;

    // Debug: Check ALL environment variables
    console.log('🔍 Environment Debug:', {
      nodeEnv: process.env.NODE_ENV,
      hasGmailUser: !!process.env.GMAIL_USER,
      hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
      gmailUserLength: process.env.GMAIL_USER ? process.env.GMAIL_USER.length : 0,
      gmailPasswordLength: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : 0,
      gmailUserPreview: process.env.GMAIL_USER ? process.env.GMAIL_USER.substring(0, 3) + '***' : 'MISSING',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('GMAIL'))
    });

    // Validate environment variables first
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing environment variables');
      return res.status(500).json({
        success: false,
        message: 'Email service not configured properly - please redeploy after setting environment variables',
        debug: {
          hasGmailUser: !!process.env.GMAIL_USER,
          hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
          availableEnvVars: Object.keys(process.env).filter(key => key.includes('GMAIL')),
          instruction: 'Environment variables are set in Vercel but may need redeployment'
        }
      });
    }
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Validate required fields
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Create Gmail SMTP transporter with explicit configuration
    console.log('📧 Creating SMTP transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Email content with professional styling similar to Gameloft Club
    const logoUrl = 'https://skybee.vercel.app/SkyBee.png';
    
    const mailOptions = {
      from: {
        name: 'SkyBee',
        address: process.env.GMAIL_USER
      },
      to: email,
      subject: `Your SkyBee Verification Code - ${type === 'signup' ? 'Sign Up' : 'Sign In'}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SkyBee Verification</title>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #1a1a1a; padding: 40px 0; text-align: center; }
            .logo-container { display: inline-block; }
            .logo { max-width: 200px; height: auto; }
            .tagline { color: #888888; font-size: 14px; margin-top: 10px; font-style: italic; }
            .content { background-color: #f8f9fa; padding: 40px 30px; }
            .main-content { background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
            .message { font-size: 16px; color: #333333; line-height: 1.6; margin-bottom: 30px; }
            .instruction { font-size: 16px; color: #333333; margin-bottom: 30px; }
            .otp-container { text-align: center; margin: 40px 0; }
            .otp-code { 
              font-size: 42px; 
              font-weight: bold; 
              color: #ffffff; 
              letter-spacing: 6px; 
              font-family: 'Courier New', Courier, monospace;
              background-color: #2a2a2a;
              padding: 25px 35px;
              border-radius: 12px;
              display: inline-block;
              border: 2px solid #404040;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              min-width: 280px;
              text-align: center;
              word-spacing: normal;
              white-space: nowrap;
              overflow: hidden;
              box-sizing: border-box;
            }
            .security-notice { 
              background-color: #f8f9fa; 
              border-left: 4px solid #ffc107; 
              padding: 20px; 
              margin: 30px 0; 
              border-radius: 4px;
            }
            .security-notice p { margin: 0; color: #666666; font-size: 14px; line-height: 1.5; }
            .footer { background-color: #1a1a1a; padding: 30px; text-align: center; }
            .footer-text { color: #888888; font-size: 12px; line-height: 1.5; margin: 5px 0; }
            .footer-brand { color: #ffffff; font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .footer-copyright { color: #666666; font-size: 11px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            
            <!-- Header -->
            <div class="header">
              <div class="logo-container">
                <img src="${logoUrl}" alt="SkyBee" class="logo" />
                <div class="tagline">Small habits, Big changes.</div>
              </div>
            </div>

            <!-- Content -->
            <div class="content">
              <div class="main-content">
                
                <div class="greeting">Hi,</div>
                
                <div class="message">
                  You recently tried to ${type === 'signup' ? 'sign up for' : 'log in to'} SkyBee using your email address.
                </div>
                
                <div class="instruction">
                  Please enter the following code to ${type === 'signup' ? 'complete your registration' : 'log in'}:
                </div>
                
                <!-- OTP Code -->
                <div class="otp-container">
                  <div class="otp-code">${otp}</div>
                </div>

                <!-- Security Notice -->
                <div class="security-notice">
                  <p><strong>Security Notice:</strong> This code expires in 10 minutes. If you did not make this request, please ignore this email or contact our support team.</p>
                </div>

              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-brand">SkyBee</div>
              <div class="footer-text">This is an automatically generated message. Replies are not monitored or answered.</div>
              <div class="footer-copyright">© 2025 SkyBee. All rights reserved.</div>
            </div>

          </div>
        </body>
        </html>
      `,
      // Plain text fallback
      text: `
        SkyBee ${type === 'signup' ? 'Sign Up' : 'Sign In'} Verification
        
        Hi,
        
        You recently tried to ${type === 'signup' ? 'sign up for' : 'log in to'} SkyBee using your email address.
        
        Please enter the following code to ${type === 'signup' ? 'complete your registration' : 'log in'}:
        
        ${otp}
        
        This code expires in 10 minutes.
        If you did not make this request, please ignore this email.
        
        © 2025 SkyBee. All rights reserved.
      `
    };

    // Test connection before sending
    console.log('🔗 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    // Send email
    await transporter.sendMail(mailOptions);

    // Log success (remove in production)
    console.log(`OTP email sent successfully to ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      email: email // Don't include OTP in response for security
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    // Handle specific errors
    let errorMessage = 'Failed to send OTP';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Email service connection failed';
    } else if (error.responseCode === 550) {
      errorMessage = 'Invalid recipient email address';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = handler;