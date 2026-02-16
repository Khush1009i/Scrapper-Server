const nodemailer = require('nodemailer');

// Configure transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Sends an OTP to the specified email address.
 * @param {string} to - Recipient email
 * @param {string} otp - The OTP code
 * @param {string} name - User's name
 */
exports.sendOTP = async (to, otp, name = "there") => {
    try {
        const mailOptions = {
            from: `"Scraper App Support" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: '🔐 Verify Your Account',
            text: `Your verification code is: ${otp}`,
            html: `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="background-color: #2563eb; padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Welcome, ${name}!</h1>
                    </div>
                    <div style="padding: 40px 30px; text-align: center; color: #1f2937;">
                        <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.5;">Thank you for signing up. Please use the verification code below to complete your registration:</p>
                        
                        <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 25px; border: 1px dashed #cbd5e1;">
                            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2563eb; font-family: monospace;">${otp}</span>
                        </div>
                        
                        <p style="font-size: 14px; color: #6b7280; margin-top: 0;">This code will expire in 10 minutes.</p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">If you didn't request this code, you can safely ignore this email.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
