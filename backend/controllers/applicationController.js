const db = require('../config/db');
const mailTransporter = require('../config/mail');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// 🌟 BULLETPROOF TEMPLATE LINK: APPLICATION SUBMITTED
exports.submitApp = (req, res) => {
    const body = req.body;
    const files = req.files || {};
    
    const getFilePath = fieldName => {
        if (Array.isArray(files)) {
            const file = files.find(f => f.fieldname === fieldName);
            return file ? 'uploads/' + file.filename : null;
        }
        return files[fieldName] ? 'uploads/' + files[fieldName][0].filename : null;
    };

    try {
        const queryData = [
            body.name || null, body.category || null, body.mobile || null, body.alternate_mobile || null, 
            body.email || null, body.department || null,
            body.x_year ? parseInt(body.x_year) : null, body.x_board || null, body.x_percentage ? parseFloat(body.x_percentage) : null, getFilePath('x_marksheet'),
            body.xii_year ? parseInt(body.xii_year) : null, body.xii_board || null, body.xii_percentage ? parseFloat(body.xii_percentage) : null, getFilePath('xii_marksheet'),
            body.bachelor_year ? parseInt(body.bachelor_year) : null, body.bachelor_university || null, body.bachelor_percentage ? parseFloat(body.bachelor_percentage) : null, getFilePath('bachelor_marksheet'),
            body.master_year ? parseInt(body.master_year) : null, body.master_university || null, body.master_percentage ? parseFloat(body.master_percentage) : null, getFilePath('master_marksheet'),
            body.belongs_category || null, body.fellowship_category || null, getFilePath('gate_net_certificate'), body.sponsored_category || null, getFilePath('noc'),
            getFilePath('photograph'), getFilePath('signature'), getFilePath('dob_proof'), getFilePath('scanned_app_form'), getFilePath('payment_receipt'), getFilePath('category_certificate')
        ];

        const sqlInsertStatement = `
            INSERT INTO phd_applications (
                name, admission_category, mobile, alternate_mobile, email, department,
                x_year, x_board, x_percentage, path_x_marksheet,
                xii_year, xii_board, xii_percentage, path_xii_marksheet,
                bachelor_year, bachelor_university, bachelor_percentage, path_bachelor_marksheet,
                master_year, master_university, master_percentage, path_master_marksheet,
                belongs_category, fellowship_category, path_fellowship_cert, sponsored_category, path_noc,
                path_photograph, path_signature, path_dob_proof, path_scanned_app_form, path_payment_receipt, path_category_certificate
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33) RETURNING id
        `;

        db.query(sqlInsertStatement, queryData, async (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Failed to save application.' });

            try {
                // Fetch template for Application Received
                const templateCheck = await db.query(`SELECT subject, body FROM email_templates WHERE UPPER(REPLACE(template_key, ' ', '_')) = 'APPLICATION_SUBMITTED' LIMIT 1`);
                
                let emailSubject = 'Application Locked & Received — IIEST Shibpur PhD Admissions';
                let emailBody = `<p>Dear <strong>${body.name}</strong>,</p><p>Your PhD application for the <strong>${body.department}</strong> department has been successfully received.</p>`;

                if (templateCheck.rows.length > 0) {
                    emailSubject = templateCheck.rows[0].subject;
                    let rawBody = templateCheck.rows[0].body
                        .replace(/\[StudentName\]/g, body.name)
                        .replace(/\[Department\]/g, body.department || 'your department')
                        .replace(/\n/g, '<br>');
                    emailBody = `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">${rawBody}</div>`;
                }

                mailTransporter.sendMail({
                    from: `"IIEST Admissions" <${process.env.EMAIL_USER}>`,
                    to: body.email,
                    subject: emailSubject,
                    html: emailBody
                });
            } catch (mailErr) {
                console.error('Silently failed to fetch/send custom receipt template:', mailErr);
            }

            res.json({ success: true, insertId: result.rows[0].id });
        });
    } catch (uploadError) {
        return res.status(500).json({ success: false, message: 'Failed to process application files.' });
    }
};

// 2. FETCH STATUS
exports.getStatus = (req, res) => {
    const query = `
        SELECT 
            p.*, 
            u.enrollment_number AS user_enrollment,
            u.app_id AS user_app_id
        FROM phd_applications p
        LEFT JOIN users u ON p.email = u.email
        WHERE p.email = $1 
        LIMIT 1
    `;

    db.query(query, [req.params.email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (result.rows.length === 0) return res.json({ submitted: false });
        
        const appData = result.rows[0];

        appData.enrollment_number = 
            appData.enrollment_number || 
            appData.user_enrollment || 
            appData.user_app_id || 
            appData.app_id || 
            appData.enrolment_no || 
            'Pending Generation';

        res.json({ submitted: true, application: appData });
    });
};

// 3. ENHANCED SECURE FILE VIEWING (JWT Token Gatekeeper)
exports.secureFileGatekeeper = (req, res) => {
    const filename = req.params.filename;
    const role = req.query.role;
    const token = req.query.token;

    // If the user has the 'student-access' token or 'admin' role, let them in!
    if (role === 'admin' || token === 'student-access') {
        
        // 🌟 THE FIX: Tell the gatekeeper to check both possible upload directories
        const backendFolder = path.join(__dirname, '../uploads', filename);     // checks /backend/uploads/
        const rootFolder = path.join(__dirname, '../../uploads', filename);    // checks /uploads/

        let actualFilePath = null;
        
        // Check which folder the file actually lives in
        if (fs.existsSync(backendFolder)) {
            actualFilePath = backendFolder;
        } else if (fs.existsSync(rootFolder)) {
            actualFilePath = rootFolder;
        }

        // If it isn't in either folder, show a clean error message
        if (!actualFilePath) {
            return res.status(404).send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    <h2 style="color: #dc2626;">404 Not Found</h2>
                    <p style="color: #475569;">The file exists in the database, but is physically missing from the uploads folder.</p>
                    <p style="color: #64748b; font-size: 0.9em;">Please ask the Admin to re-upload this form in the Portal Settings.</p>
                </div>
            `);
        }

        // Securely deliver the file
        return res.sendFile(actualFilePath, (err) => {
            if (err) {
                console.error("File download error:", err);
                return res.status(500).send('Error delivering the file.');
            }
        });
    }

    // If they don't have the VIP token, block them
    res.status(403).send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h2 style="color: #dc2626;">403 Forbidden</h2>
            <p style="color: #475569;">Access Denied: Missing security authorization token.</p>
        </div>
    `);
};

exports.submitJoiningForm = async (req, res) => {
    const { email } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    try {
        const filePath = 'uploads/' + file.filename;
        
        // Save the file path and update the status to "Joining Submitted"
        await db.query(
            `UPDATE phd_applications SET path_undertaking_form = $1, status = 'Joining Submitted' WHERE email = $2`, 
            [filePath, email]
        );
        
        res.json({ success: true, message: 'Form submitted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
};

// IMPORTANT: In this same file, find `exports.checkAllocationWindow`
// Make sure it sends the settings back so the dashboard can see the form paths!
// Change `return res.json({ success: true, active: false });` 
// To `return res.json({ success: true, active: false, settings: settings });`