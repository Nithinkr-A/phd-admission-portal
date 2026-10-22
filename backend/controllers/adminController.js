const db = require('../config/db');
const mailTransporter = require('../config/mail');
const path = require('path');

exports.getApplications = async (req, res) => {
    const adminEmail = req.query.admin_email;
    if (!adminEmail) return res.status(403).json({ success: false, message: 'No admin email provided.' });

    try {
        const adminCheck = await db.query('SELECT role, department FROM admins WHERE email = $1 LIMIT 1', [adminEmail]);
        if (adminCheck.rows.length === 0) return res.status(403).json({ success: false, message: 'Unauthorized access.' });

        const adminInfo = adminCheck.rows[0];
        let sql = `SELECT p.*, u.app_id AS true_app_id, COALESCE(p.status, 'Submitted') AS status FROM phd_applications p LEFT JOIN users u ON p.email = u.email`;
        let queryParams = [];

        if (adminInfo.role === 'department_admin') {
            sql += ` WHERE p.department = $1`;
            queryParams.push(adminInfo.department);
        }
        sql += ` ORDER BY p.id DESC`;

        const applications = await db.query(sql, queryParams);
        res.json({ success: true, applications: applications.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error fetching applications.' });
    }
};

exports.updateStatus = (req, res) => {
    db.query('UPDATE phd_applications SET status = $1 WHERE id = $2', [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
};

exports.getFaculty = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM faculty ORDER BY department ASC, name ASC');
        res.json({ success: true, faculty: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error fetching faculty.' });
    }
};

exports.addFaculty = async (req, res) => {
    const { name, email, department, designation, specialization } = req.body;
    try {
        await db.query('INSERT INTO faculty (name, email, department, designation, specialization) VALUES ($1, $2, $3, $4, $5)', [name, email, department, designation, specialization || null]);
        res.json({ success: true, message: 'Faculty added successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error adding faculty.' });
    }
};

exports.deleteFaculty = async (req, res) => {
    try {
        await db.query('DELETE FROM faculty WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error deleting faculty.' });
    }
};

exports.scheduleInterview = async (req, res) => {
    const { applicationId, interviewDate, interviewTime, venue } = req.body;
    try {
        const applicantCheck = await db.query(`SELECT p.department, p.email, u.name AS candidate_name, u.app_id AS user_app_id FROM phd_applications p LEFT JOIN users u ON p.email = u.email WHERE p.id = $1`, [applicationId]);
        if (applicantCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Applicant not found.' });
        const applicant = applicantCheck.rows[0];

        await db.query(`INSERT INTO interview_schedules (application_id, user_app_id, candidate_name, interview_date, interview_time, venue) VALUES ($1, $2, $3, $4, $5, $6)`, [applicationId, applicant.user_app_id, applicant.candidate_name, interviewDate, interviewTime, venue]);
        await db.query(`UPDATE phd_applications SET status = 'Shortlisted' WHERE id = $1`, [applicationId]);

        const templateCheck = await db.query(`SELECT subject, body FROM email_templates WHERE UPPER(REPLACE(template_key, ' ', '_')) = 'INTERVIEW_SCHEDULED' LIMIT 1`);
        
        let emailSubject = 'ACTION REQUIRED: PhD Interview Call Letter';
        let emailBody = `<p>Dear ${applicant.candidate_name}, your interview is scheduled on ${interviewDate} at ${interviewTime}. Venue: ${venue}</p>`;

        if (templateCheck.rows.length > 0) {
            emailSubject = templateCheck.rows[0].subject;
            emailBody = templateCheck.rows[0].body
                .replace(/\[StudentName\]/g, applicant.candidate_name)
                .replace(/\[Department\]/g, applicant.department || 'your department')
                .replace(/\[InterviewDate\]/g, interviewDate)
                .replace(/\[InterviewTime\]/g, interviewTime)
                .replace(/\[Venue\]/g, venue)
                .replace(/\n/g, '<br>');
            emailBody = `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">${emailBody}</div>`;
        }

        mailTransporter.sendMail({
            from: `"IIEST Admissions" <${process.env.EMAIL_USER}>`,
            to: applicant.email,
            subject: emailSubject,
            html: emailBody
        });

        res.json({ success: true, message: 'Interview scheduled.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error while scheduling.' });
    }
};

exports.sendBulkEmails = async (req, res) => {
    const { targetStatus, selectedIds = [], subject, body, mode = 'manual' } = req.body;
    if (!['Accepted', 'Rejected', 'Approved'].includes(targetStatus)) return res.status(400).json({ success: false, message: 'Invalid status.' });

    const normalizedIds = (selectedIds || []).map((id) => parseInt(String(id), 10)).filter(Number.isFinite);
    let sql = 'SELECT name, email, department FROM phd_applications WHERE status = $1';
    let queryParams = [targetStatus];

    if (normalizedIds.length > 0) {
        sql = 'SELECT name, email, department FROM phd_applications WHERE id = ANY($1::int[]) AND status = $2';
        queryParams = [normalizedIds, targetStatus];
    }

    try {
        const result = await db.query(sql, queryParams);
        if (result.rows.length === 0) return res.status(200).json({ success: true, message: `No applicants found.` });

        const recipients = result.rows.filter((applicant) => applicant.email).map((applicant) => applicant.email);
        
        const templateKey = (targetStatus === 'Accepted' || targetStatus === 'Approved') ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED';
        const templateCheck = await db.query(`SELECT subject, body FROM email_templates WHERE UPPER(REPLACE(template_key, ' ', '_')) = $1 LIMIT 1`, [templateKey]);
        
        let finalSubject = subject || 'IIEST Shibpur PhD Admissions Update';
        let rawBodyTemplate = body || 'Dear [StudentName],\n\nYour application status is now: ' + targetStatus;

        if (templateCheck.rows.length > 0 && !subject && !body) {
            finalSubject = templateCheck.rows[0].subject;
            rawBodyTemplate = templateCheck.rows[0].body;
        }

        if (mode === 'manual') {
            const mailtoUrl = `mailto:?bcc=${encodeURIComponent(recipients.join(','))}&subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(rawBodyTemplate)}`;
            return res.status(200).json({ success: true, message: 'Mail composer ready.', mailtoUrl, recipientCount: recipients.length, recipients });
        }

        let successCount = 0, failureCount = 0;
        for (const applicant of result.rows) {
            try {
                let personalizedBody = rawBodyTemplate
                    .replace(/\[StudentName\]/g, applicant.name || 'Applicant')
                    .replace(/\[Department\]/g, applicant.department || 'your department')
                    .replace(/\n/g, '<br>');

                await mailTransporter.sendMail({
                    from: `"IIEST Admissions" <${process.env.EMAIL_USER}>`,
                    to: applicant.email,
                    subject: finalSubject,
                    html: `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">${personalizedBody}</div>`
                });
                successCount++;
            } catch (e) {
                failureCount++;
            }
        }
        res.status(200).json({ success: true, message: `Successfully sent: ${successCount}. Failed: ${failureCount}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
};

exports.exportData = (req, res) => {
    const table = req.query.table;
    if (!['users', 'phd_applications'].includes(table)) return res.status(400).json({ success: false, message: 'Invalid table.' });

    db.query(`SELECT * FROM ${table}`, (err, result) => {
        if (err || result.rows.length === 0) return res.status(404).json({ success: false, message: 'No data.' });

        const headers = Object.keys(result.rows[0]);
        const rows = result.rows.map(row => headers.map(h => {
            let value = row[h];
            if (typeof value === 'string' && h.startsWith('path_') && value.trim() !== '') {
                value = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(path.basename(value))}?role=admin`;
            }
            return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
        }).join(','));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
        res.send([headers.join(','), ...rows].join('\n'));
    });
};

exports.approveStudent = async (req, res) => {
    const { userId, departmentCode, userEmail, userName } = req.body; 

    try {
        const currentYear = new Date().getFullYear(); 
        const deptCodes = {
            "Aerospace Engineering": "AE", "Architecture, Town and Regional Planning": "AR",
            "Chemistry": "CH", "Civil Engineering": "CE", "Computer Science & Engineering": "CS",
            "Earth Sciences": "ES", "Electrical Engineering": "EE", "Electronics & Telecommunication Engineering": "ET",
            "Humanities and Social Sciences": "HU", "Information Technology": "IT", "Mathematics": "MA",
            "Mechanical Engineering": "ME", "Metallurgy and Materials Engineering": "MM", "Mining Engineering": "MN", "Physics": "PH"
        };
        const mappedCode = deptCodes[departmentCode] || departmentCode.substring(0, 2).toUpperCase();
        const prefix = `${currentYear}${mappedCode}P`; 

        const result = await db.query(
            `SELECT enrollment_number FROM users WHERE enrollment_number LIKE $1 ORDER BY enrollment_number DESC LIMIT 1`,
            [`${prefix}%`]
        );

        let newSequence = 1;
        if (result.rows.length > 0 && result.rows[0].enrollment_number) {
            const lastNumber = result.rows[0].enrollment_number;
            const lastSequence = parseInt(lastNumber.slice(-3), 10);
            newSequence = lastSequence + 1;
        }

        const formattedSequence = newSequence.toString().padStart(3, '0');
        const finalEnrollmentNumber = `${prefix}${formattedSequence}`;

        await db.query(`UPDATE users SET enrollment_number = $1 WHERE email = $2`, [finalEnrollmentNumber, userEmail]);
        await db.query(`UPDATE phd_applications SET status = 'Approved' WHERE email = $1`, [userEmail]);

        const templateCheck = await db.query(`SELECT subject, body FROM email_templates WHERE UPPER(REPLACE(template_key, ' ', '_')) = 'STUDENT_APPROVED' LIMIT 1`);
        
        let emailSubject = 'Action Required: Official Selection for PhD Program';
        let emailBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #002884;">Congratulations, ${userName}!</h2>
                <p>We are pleased to inform you that your application for the PhD program has been officially approved.</p>
                <p>Your official University Enrollment Number is: <strong>${finalEnrollmentNumber}</strong></p>
            </div>
        `;

        if (templateCheck.rows.length > 0) {
            emailSubject = templateCheck.rows[0].subject;
            let rawBody = templateCheck.rows[0].body
                .replace(/\[StudentName\]/g, userName)
                .replace(/\[EnrollmentNumber\]/g, finalEnrollmentNumber)
                .replace(/\n/g, '<br>');
            emailBody = `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">${rawBody}</div>`;
        }

        mailTransporter.sendMail({
            from: `"IIEST Shibpur Admissions" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: emailSubject,
            html: emailBody
        }, (err) => {
            if (err) console.error('Email failed:', err);
        });

        res.json({ success: true, enrollment_number: finalEnrollmentNumber });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ==========================================
// ⚙️ SYSTEM SETTINGS & PORTAL CONTROLS
// ==========================================

exports.getAllocationSettings = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM system_settings WHERE id = 1');
        res.json({ success: true, settings: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error fetching settings.' });
    }
};

// 🌟 UPDATED TO HANDLE 6 FILES
exports.updateAllocationSettings = async (req, res) => {
    const { allocation_start, allocation_end, is_allocation_active } = req.body;
    const files = req.files || {}; 

    // Helper to extract the file path dynamically
    const getFilePath = fieldName => {
        if (Array.isArray(files)) {
            const file = files.find(f => f.fieldname === fieldName);
            return file ? 'uploads/' + file.filename : null;
        }
        return files[fieldName] ? 'uploads/' + files[fieldName][0].filename : null;
    };

    const path_joining_form = getFilePath('joining_form');
    const path_undertaking_individual_fellowship = getFilePath('undertaking_ind_fellowship');
    const path_undertaking_institute_fellowship = getFilePath('undertaking_inst_fellowship');
    const path_undertaking_sponsored_project = getFilePath('undertaking_sponsored_project');
    const path_undertaking_sponsored = getFilePath('undertaking_sponsored');
    const path_undertaking_self_sponsored = getFilePath('undertaking_self_sponsored');

    try {
        let query = 'UPDATE system_settings SET allocation_start = $1, allocation_end = $2, is_allocation_active = $3';
        let values = [allocation_start || null, allocation_end || null, is_allocation_active];
        let paramIndex = 4;

        if (path_joining_form) { 
            query += `, path_joining_form = $${paramIndex++}`; 
            values.push(path_joining_form); 
        }
        if (path_undertaking_individual_fellowship) { 
            query += `, path_undertaking_individual_fellowship = $${paramIndex++}`; 
            values.push(path_undertaking_individual_fellowship); 
        }
        if (path_undertaking_institute_fellowship) { 
            query += `, path_undertaking_institute_fellowship = $${paramIndex++}`; 
            values.push(path_undertaking_institute_fellowship); 
        }
        if (path_undertaking_sponsored_project) { 
            query += `, path_undertaking_sponsored_project = $${paramIndex++}`; 
            values.push(path_undertaking_sponsored_project); 
        }
        if (path_undertaking_sponsored) { 
            query += `, path_undertaking_sponsored = $${paramIndex++}`; 
            values.push(path_undertaking_sponsored); 
        }
        if (path_undertaking_self_sponsored) { 
            query += `, path_undertaking_self_sponsored = $${paramIndex++}`; 
            values.push(path_undertaking_self_sponsored); 
        }

        query += ' WHERE id = 1';

        await db.query(query, values);
        res.json({ success: true, message: 'Settings and blank forms updated successfully.' });
    } catch (error) {
        console.error('Settings Update Error:', error);
        res.status(500).json({ success: false, message: 'Database error updating settings.' });
    }
};

exports.checkAllocationWindow = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM system_settings WHERE id = 1');
        const settings = result.rows[0];

        if (!settings || !settings.is_allocation_active || !settings.allocation_start || !settings.allocation_end) {
            return res.json({ success: true, active: false, settings: settings });
        }

        const now = new Date();
        const start = new Date(settings.allocation_start);
        const end = new Date(settings.allocation_end);
        
        end.setHours(23, 59, 59, 999); 

        if (now >= start && now <= end) {
            return res.json({ success: true, active: true, end_date: settings.allocation_end, settings: settings });
        } else {
            return res.json({ success: true, active: false, settings: settings });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error checking window.' });
    }
};

// ==========================================
// 📧 DYNAMIC EMAIL TEMPLATES
// ==========================================

exports.getEmailTemplates = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM email_templates ORDER BY template_key ASC');
        res.json({ success: true, templates: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error fetching templates.' });
    }
};

exports.updateEmailTemplate = async (req, res) => {
    const { template_key, subject, body } = req.body;

    try {
        await db.query(
            'UPDATE email_templates SET subject = $1, body = $2 WHERE template_key = $3',
            [subject, body, template_key]
        );
        res.json({ success: true, message: 'Template updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error updating template.' });
    }
};