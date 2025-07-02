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

    // Email content with SVG logo support
    const logoUrl = process.env.SKYBEE_LOGO_URL || 'https://skybee.vercel.app/SkyBee.svg';
    
    const mailOptions = {
      from: {
        name: 'SkyBee',
        address: process.env.GMAIL_USER
      },
      to: email,
      subject: `Your SkyBee ${type === 'signup' ? 'Sign Up' : 'Sign In'} OTP`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SkyBee Verification</title>
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #000000;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #000000;">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 0 0 48px 0;">
                      <div style="display: inline-block; position: relative;">
                        <!-- SVG Logo with fallback -->
                        <div style="text-align: center; margin-bottom: 16px;">
                          <img src="${logoUrl}" 
                               alt="SkyBee Logo" 
                               width="140" 
                               height="45" 
                               style="display: block; margin: 0 auto; max-width: 140px; height: auto; border: 0; filter: brightness(1);"
                               onerror="this.style.display='none'; document.getElementById('fallback-logo').style.display='block';" />
                          
                          <!-- Fallback Text Logo -->
                          <div id="fallback-logo" style="display: none;">
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 42px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1;">
                              Sky<span style="color: #FBBF24;">Bee</span>
                            </h1>
                          </div>
                        </div>
                        
                        <!-- Decorative bee icon -->
                        <div style="position: relative; top: -8px; display: flex; justify-content: center;">
                          <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #FBBF24, #F59E0B); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);">
                            🐝
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- Main Content Card -->
                  <tr>
                    <td>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(145deg, #0A0A0A, #111111); border: 1px solid #1F1F1F; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);">
                        
                        <!-- Content Header -->
                        <tr>
                          <td style="padding: 48px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, rgba(251, 191, 36, 0.05), rgba(16, 185, 129, 0.05));">
                            <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: linear-gradient(135deg, #FBBF24, #10B981); border-radius: 50%; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(251, 191, 36, 0.3);">
                              <span style="font-size: 36px; color: #000000;">${type === 'signup' ? '🎉' : '🔐'}</span>
                            </div>
                            <h2 style="margin: 0 0 12px 0; color: #FFFFFF; font-size: 28px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2;">
                              ${type === 'signup' ? 'Welcome to SkyBee!' : 'Sign In Verification'}
                            </h2>
                            <p style="margin: 0; color: #A1A1AA; font-size: 16px; font-weight: 300; line-height: 1.5; font-style: italic;">
                              ${type === 'signup' ? 'Small habits, Big changes.' : 'Your journey continues.'}
                            </p>
                          </td>
                        </tr>

                        <!-- OTP Section -->
                        <tr>
                          <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 32px 0; color: #D4D4D8; font-size: 16px; line-height: 1.6; text-align: center;">
                              ${type === 'signup' ? 
                                'Thank you for joining SkyBee! Use the verification code below to complete your registration and begin your journey to better habits.' : 
                                'Use the verification code below to sign in to your SkyBee account and continue building your habits.'
                              }
                            </p>
                            
                            <!-- OTP Code -->
                            <div style="text-align: center; margin: 40px 0;">
                              <div style="display: inline-block; background: linear-gradient(135deg, #FBBF24, #F59E0B); padding: 3px; border-radius: 16px; box-shadow: 0 8px 32px rgba(251, 191, 36, 0.4);">
                                <div style="background: #000000; padding: 24px 32px; border-radius: 13px;">
                                  <span style="color: #FBBF24; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;">
                                    ${otp}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <!-- Security Notice -->
                            <div style="background: linear-gradient(135deg, #1F1F1F, #2A2A2A); border: 1px solid #3F3F3F; border-radius: 12px; padding: 20px; margin: 32px 0;">
                              <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="flex-shrink: 0; width: 24px; height: 24px; background: linear-gradient(135deg, #F59E0B, #EAB308); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                                  <span style="color: #000000; font-size: 12px; font-weight: 600;">⚠</span>
                                </div>
                                <div>
                                  <p style="margin: 0 0 8px 0; color: #F59E0B; font-size: 14px; font-weight: 600;">
                                    Security Notice
                                  </p>
                                  <p style="margin: 0; color: #D4D4D8; font-size: 14px; line-height: 1.5;">
                                    This code expires in <strong style="color: #FBBF24;">10 minutes</strong>. Never share this code with anyone. SkyBee will never ask for your verification code.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <p style="margin: 32px 0 0 0; color: #71717A; font-size: 14px; line-height: 1.5; text-align: center;">
                              If you didn't request this code, please ignore this email or contact our support team if you have concerns about your account security.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 48px 0 0 0; text-align: center;">
                      <div style="border-top: 1px solid #1F1F1F; padding-top: 32px;">
                        <p style="margin: 0 0 8px 0; color: #FBBF24; font-size: 18px; font-weight: 600; letter-spacing: 1px;">
                          SkyBee
                        </p>
                        <p style="margin: 0 0 16px 0; color: #52525B; font-size: 12px; line-height: 1.4;">
                          This email was sent by SkyBee • Please do not reply to this email
                        </p>
                        <p style="margin: 0; color: #3F3F46; font-size: 11px;">
                          © ${new Date().getFullYear()} SkyBee. Building better habits, one buzz at a time.
                        </p>
                      </div>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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