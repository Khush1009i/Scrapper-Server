const AppError = require('../utils/AppError');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// In-memory User storage for demo purposes DELETED
// In production, this would be a MongoDB collection or SQL table DELETED
const { sendOTP } = require('../utils/mailer');
const { getDB } = require('../db');

// In-memory OTP storage: { email: { code: '123456', expires: timestamp } }
const otpStore = new Map();

exports.sendVerificationCode = async (req, res) => {
    try {
        let { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        email = email.toLowerCase(); // Consistent lowercase

        const db = await getDB();
        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            console.log(`[OTP REQ] User already exists: ${email}`);
            return res.status(400).json({ error: 'User already exists. Please login.' });
        }

        // ... (rest of OTP logic remains same but need to capture consistent variable if used later) ...
        // Since I'm editing the whole function block or just part of it? 
        // I will replace the start of the function up to the OTP generation to ensure email is lowercased.

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP and Name
        otpStore.set(email, { code: otp, expires, name: name || 'User' });
        console.log(`[OTP SENT] Code: ${otp} for ${email}`);

        // Send Email
        const sent = await sendOTP(email, otp, name || 'User');
        if (sent) {
            res.json({ message: 'Verification code sent to your email.' });
        } else {
            console.error('[OTP ERROR] Email send failed');
            res.status(500).json({ error: 'Failed to send verification email.' });
        }

    } catch (err) {
        next(err);
    }
};

exports.register = async (req, res) => {
    try {
        let { email, password, otp, name } = req.body;

        if (!email || !password || !otp) {
            return res.status(400).json({ error: 'Email, password, and OTP are required.' });
        }

        email = email.toLowerCase(); // Consistent lowercase

        // Verify OTP
        const record = otpStore.get(email);
        if (!record) {
            console.log(`[REGISTER FAIL] No OTP record for ${email}`);
            return res.status(400).json({ error: 'No verification code found for this email. Please request a new code.' });
        }

        if (Date.now() > record.expires) {
            otpStore.delete(email); // Cleanup
            return res.status(400).json({ error: 'Verification code expired.' });
        }

        if (record.code !== otp) {
            console.log(`[REGISTER FAIL] Invalid OTP for ${email}. Expected: ${record.code}, Got: ${otp}`);
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        // OTP Valid - Proceed to create user
        // Check if user already exists (double check)
        const db = await getDB();
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        // Use name from request body if provided, otherwise use name from OTP record, otherwise default
        const userName = name || record.name || 'User';

        const result = await db.run(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [userName, email, hashedPassword]
        );

        const userId = result.lastID; // Get the generated ID

        console.log(`[REGISTER SUCCESS] User created: ${email} (${userName})`);

        // Clear OTP
        otpStore.delete(email);

        // Generate JWT
        const token = jwt.sign(
            { id: userId, email, name: userName },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'User verification successful and account created.',
            token,
            user: { id: userId, name: userName, email: email }
        });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Ensure email is lowercase to match schema
        email = email.toLowerCase();

        console.log(`[LOGIN ATTEMPT] Email: ${email}`);

        const db = await getDB();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            console.log('[LOGIN FAIL] User not found in DB');
            return res.status(400).json({ error: 'User not found. Please register first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[LOGIN CHECK] Password match: ${isMatch}`);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful', token });
    } catch (err) {
        next(err);
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        // req.user is populated by authMiddleware
        const db = await getDB();
        const user = await db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name, // Return name
            // Add other non-sensitive fields here if they exist in the future
            joinedAt: user.created_at
        });
    } catch (err) {
        next(err);
    }
};
