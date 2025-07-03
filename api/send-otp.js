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
    const { email, otp, type = 'signin', name } = req.body;

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
      subject: `Your SkyBee Verification Code`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SkyBee Verification</title>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #1a1a1a; padding: 32px 0; text-align: center; }
            .brand-container { text-align: center; margin-bottom: 16px; white-space: nowrap; }
            .brand-name { color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; margin: 0; display: inline; vertical-align: middle; }
            .logo { max-width: 40px; height: 40px; display: inline; vertical-align: middle; margin-left: 12px; }
            .tagline { color: #FFD700; font-size: 14px; margin: 0; font-style: italic; font-weight: 400; }
            .content { background-color: #f8f9fa; padding: 32px 24px; }
            .main-content { background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .greeting { font-size: 18px; font-weight: 500; color: #2d3748; margin: 0 0 24px 0; }
            .message { font-size: 16px; color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-weight: 400; }
            .instruction { font-size: 16px; color: #2d3748; margin: 0 0 32px 0; font-weight: 500; }
            .otp-container { 
              text-align: center; 
              margin: 32px 0; 
              display: flex; 
              justify-content: center; 
              align-items: center;
              width: 100%;
            }
            .otp-code { 
              font-size: 36px; 
              font-weight: 700; 
              color: #ffffff; 
              letter-spacing: 4px; 
              font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
              background-color: #2d3748;
              padding: 20px 32px;
              border-radius: 8px;
              border: 1px solid #4a5568;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              min-width: 240px;
              text-align: center;
              white-space: nowrap;
              box-sizing: border-box;
              margin: 0 auto;
            }
            .security-notice { 
              background-color: #fef2f2; 
              border-left: 4px solid #ef4444; 
              padding: 16px 20px; 
              margin: 32px 0 0 0; 
              border-radius: 6px;
            }
            .security-notice p { margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5; font-weight: 400; }
            .footer { background-color: #1a1a1a; padding: 24px; text-align: center; }
            .footer-text { color: #a0aec0; font-size: 12px; line-height: 1.6; margin: 8px 0; }
            .footer-auto { color: #a0aec0; font-size: 12px; margin: 4px 0; }
            .footer-replies { color: #a0aec0; font-size: 12px; margin: 4px 0; }
            .footer-social { margin: 12px 0; }
            .footer-social a { color: #FFD700; text-decoration: none; font-size: 12px; font-weight: 500; }
            .footer-social a:hover { color: #F5C842; }
            .footer-copyright { color: #718096; font-size: 11px; margin: 16px 0 0 0; }
          </style>
        </head>
        <body>
          <div class="container">
            
            <!-- Header -->
            <div class="header">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div class="brand-container">
                      <span class="brand-name">SkyBee</span>
                      <img src="${logoUrl}" alt="SkyBee" class="logo" />
                    </div>
                    <div class="tagline">Small habits, Big changes.</div>
                  </td>
                </tr>
              </table>
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
              <div class="footer-auto">This is an automatically generated message.</div>
              <div class="footer-replies">Replies are not monitored or answered.</div>
              <div class="footer-social">
                <a href="https://instagram.com/weareskybee" target="_blank">Follow us @weareskybee</a>
              </div>
              <div class="footer-copyright">© ${new Date().getFullYear()} SkyBee. All rights reserved.</div>
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