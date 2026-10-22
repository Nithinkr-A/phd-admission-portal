const db = require('../config/db');
const mailTransporter = require('../config/mail');
const jwt = require('jsonwebtoken'); // 🌟 Required for generating secure login tokens

// Local cache for OTPs
const activeOtpCache = {};

exports.sendEmailOtp = (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email address missing.' });

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtpCache[email] = { otp: generatedOtp, expiresAt: Date.now() + 5 * 60 * 1000 };

    const emailOptions = {
        from: `"IIEST PhD Admissions Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Account Verification Security Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #4a148c; margin-top: 0;">Email Verification</h2>
                <p>Thank you for registering. Use the security code below to complete your verification setup:</p>
                <div style="background: #f3e5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4a148c; border-radius: 6px; margin: 20px 0;">
                    ${generatedOtp}
                </div>
                <p style="font-size: 13px; color: #666;">This verification token will expire in 5 minutes. If you did not make this request, please safely disregard this notice.</p>
            </div>
        `
    };

    mailTransporter.sendMail(emailOptions, (err) => {
        if (err) {
            console.error('❌ OTP Delivery Failure:', err);
            return res.status(500).json({ success: false, message: 'Failed to deliver OTP.' });
        }
        res.json({ success: true, message: 'Verification token delivered.' });
    });
};

exports.verifyEmailOtp = (req, res) => {
    const { email, userTypedOtp } = req.body;
    const record = activeOtpCache[email];

    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested or session expired.' });
    if (Date.now() > record.expiresAt) {
        delete activeOtpCache[email]; 
        return res.status(400).json({ success: false, message: 'Session expired.' });
    }
    if (record.otp !== userTypedOtp.trim()) return res.status(400).json({ success: false, message: 'Invalid token code.' });

    delete activeOtpCache[email]; 
    res.json({ success: true, message: 'Email confirmed successfully.' });
};

exports.forgotPasswordOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No account found with this email address.' });
        }

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        activeOtpCache[email] = { otp: generatedOtp, expiresAt: Date.now() + 5 * 60 * 1000 };
        
        mailTransporter.sendMail({
            from: `"IIEST Admissions" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #059669;">Password Reset Code</h2>
                    <p>You requested a password reset for your IIEST Admissions account.</p>
                    <p>Your 6-digit verification code is: <strong style="font-size: 24px; color: #333;">${generatedOtp}</strong></p>
                    <p><em>This code will expire in 5 minutes. If you did not request this, please ignore this email.</em></p>
                </div>
            `
        }, (err) => {
            if (err) {
                console.error('❌ Forgot Password Email Failure:', err);
                return res.status(500).json({ success: false, message: 'Failed to send email.' });
            }
            res.json({ success: true, message: 'OTP sent successfully!' });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const record = activeOtpCache[email];

    if (record && record.otp === otp.trim()) {
        try {
            await db.query('UPDATE users SET password = $1 WHERE email = $2', [newPassword, email]);
            delete activeOtpCache[email]; 
            res.json({ success: true, message: 'Password updated successfully!' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Database error updating password.' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }
};

exports.registerCandidate = (req, res) => {
    const { name, dob, phone, email, password } = req.body;
    if (!name || !dob || !phone || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields.' });

    const currentYear = new Date().getFullYear();
    const generatedAppId = `IIEST-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`;

    const sql = `INSERT INTO users (app_id, name, dob, phone, email, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    
    db.query(sql, [generatedAppId, name, dob, phone, email, password], (err, result) => {
        if (err) {
            if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email is already registered.' });
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        const welcomeOptions = {
            from: `"IIEST Admissions" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Account Created — Your IIEST PhD Application ID',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #4a148c; margin-top: 0;">Welcome to IIEST Admissions</h2>
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your applicant registration framework profile has been successfully set up.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-left: 5px solid #4a148c; font-size: 18px; margin: 20px 0;">
                        <strong>Application ID:</strong> <span style="color: #0b74de; font-weight: bold;">${generatedAppId}</span>
                    </div>
                    <p>Best Regards,</p>
                    <p><strong>Office of the Dean (Academic)</strong><br>IIEST Shibpur</p>
                </div>
            `
        };

        mailTransporter.sendMail(welcomeOptions, (welcomeErr) => {
            if (welcomeErr) console.error('⚠️ Failed to dispatch welcome ID email:', welcomeErr);
        });

        res.json({ 
            success: true, 
            appId: generatedAppId,
            user: { id: result.rows[0].id, app_id: generatedAppId, name: name, email: email, role: 'candidate' },
            message: 'Registration completed.' 
        });
    });
};

exports.candidateLogin = async (req, res) => {
    const { loginId, password } = req.body;
    if (!loginId || !password) return res.status(400).json({ success: false, message: 'Missing credentials.' });

    const sql = `SELECT id, app_id, name, email, phone FROM users WHERE (email = $1 OR app_id = $2) AND password = $3 LIMIT 1`;
    db.query(sql, [loginId, loginId, password], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error.' });
        if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        
        const user = Object.assign({}, result.rows[0], { role: 'candidate' });

        try {
            // 🌟 Using a built-in fallback secret just in case your .env is missing!
            const secretKey = process.env.JWT_SECRET || 'iiest_bulletproof_secret_key_2026';
            const token = jwt.sign(
                { id: user.id, email: user.email, role: 'candidate' },
                secretKey,
                { expiresIn: '8h' }
            );
            res.json({ success: true, token, user });
        } catch (tokenError) {
            console.error("Token Generation Failed:", tokenError);
            res.status(500).json({ success: false, message: 'Failed to generate secure token.' });
        }
    });
};

exports.adminLogin = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing credentials.' });

    const sql = `SELECT id, name, email, role, department FROM admins WHERE email = $1 AND password = $2 LIMIT 1`;
    db.query(sql, [email, password], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error.' });
        if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
        
        const adminUser = result.rows[0];

        try {
            // 🌟 Using a built-in fallback secret just in case your .env is missing!
            const secretKey = process.env.JWT_SECRET || 'iiest_bulletproof_secret_key_2026';
            const token = jwt.sign(
                { id: adminUser.id, email: adminUser.email, role: adminUser.role },
                secretKey,
                { expiresIn: '8h' }
            );
            res.json({ success: true, token, user: adminUser });
        } catch (tokenError) {
            console.error("Token Generation Failed:", tokenError);
            res.status(500).json({ success: false, message: 'Failed to generate secure admin token.' });
        }
    });
};