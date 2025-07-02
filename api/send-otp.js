// api/send-otp.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { email, otp, type = 'signin' } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
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

    // Create Gmail SMTP transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password (not regular password)
      }
    });

    // Email content
    const mailOptions = {
      from: {
        name: 'SkyBee',
        address: process.env.GMAIL_USER
      },
      to: email,
      subject: `Your SkyBee ${type === 'signup' ? 'Sign Up' : 'Sign In'} OTP`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: white;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FBBF24; margin: 0; font-size: 28px;">🐝 SkyBee</h1>
          </div>
          
          <div style="background-color: #1a1a1a; padding: 30px; border-radius: 10px; border: 1px solid #2a2a2a;">
            <h2 style="color: white; margin: 0 0 20px 0; font-size: 24px;">
              ${type === 'signup' ? '🎉 Welcome to SkyBee!' : '🔐 Sign In to SkyBee'}
            </h2>
            
            <p style="color: #D1D5DB; font-size: 16px; margin-bottom: 25px; line-height: 1.5;">
              ${type === 'signup' ? 
                'Thank you for joining SkyBee! Use the verification code below to complete your registration:' : 
                'Use the verification code below to sign in to your SkyBee account:'
              }
            </p>
            
            <div style="background: linear-gradient(135deg, #22D3EE, #1E40AF); color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; letter-spacing: 5px; margin: 25px 0; box-shadow: 0 4px 15px rgba(34, 211, 238, 0.3);">
              ${otp}
            </div>
            
            <div style="background-color: #374151; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="color: #F59E0B; font-size: 14px; margin: 0; font-weight: bold;">
                ⚠️ Security Notice
              </p>
              <p style="color: #D1D5DB; font-size: 14px; margin: 5px 0 0 0;">
                This code expires in <strong>10 minutes</strong>. Never share this code with anyone.
              </p>
            </div>
            
            <p style="color: #9CA3AF; font-size: 14px; margin-top: 25px; line-height: 1.4;">
              If you didn't request this code, please ignore this email or contact our support team if you have concerns.
            </p>
            
            <div style="border-top: 1px solid #2a2a2a; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #6B7280; font-size: 12px; margin: 0;">
                This email was sent by SkyBee • Please do not reply to this email
              </p>
            </div>
          </div>
        </div>
      `,
      // Plain text fallback
      text: `
        SkyBee ${type === 'signup' ? 'Sign Up' : 'Sign In'} Verification
        
        Your verification code is: ${otp}
        
        This code expires in 10 minutes.
        If you didn't request this code, please ignore this email.
        
        - SkyBee Team
      `
    };

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