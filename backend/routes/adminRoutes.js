const express = require('express');
const router = express.Router();

// 1. IMPORT YOUR MIDDLEWARE FIRST
const { upload } = require('../middleware/upload'); 

// 2. IMPORT YOUR CONTROLLERS
const authController = require('../controllers/authController');
const appController = require('../controllers/applicationController');
const adminController = require('../controllers/adminController');

// ==========================================================
// 🔑 AUTHENTICATION & SECURITY ROUTES
// ==========================================================
router.post('/api/send-email-otp', authController.sendEmailOtp);
router.post('/api/verify-email-otp', authController.verifyEmailOtp);
router.post('/api/forgot-password-otp', authController.forgotPasswordOtp);
router.post('/api/reset-password', authController.resetPassword);
router.post('/register', authController.registerCandidate);
router.post('/login', authController.candidateLogin);
router.post('/admin/login', authController.adminLogin);

// ==========================================================
// 📝 CANDIDATE APPLICATION & JOINING ROUTES
// ==========================================================
router.post('/submit-application', upload.any(), appController.submitApp);
router.get('/api/my-application/:email', appController.getStatus);
router.get('/uploads/:filename', appController.secureFileGatekeeper);

// 🌟 THE NEW JOINING FORM ROUTE
router.post('/api/submit-joining', upload.single('undertaking_form'), appController.submitJoiningForm);

// ==========================================================
// 🛡️ ADMIN MANAGEMENT ROUTES
// ==========================================================
router.get('/admin/applications', adminController.getApplications);
router.patch('/admin/application/:id/status', adminController.updateStatus);
router.post('/admin/schedule-interview', adminController.scheduleInterview);
router.post('/admin/send-bulk-emails', adminController.sendBulkEmails);
router.get('/admin/export', adminController.exportData);

// 🌟 The approve student route to ensure generating IDs works!
router.post('/api/admin/approve-student', adminController.approveStudent); 

// ==========================================================
// ⚙️ PORTAL SETTINGS ROUTES
// ==========================================================
router.get('/admin/allocation-settings', adminController.getAllocationSettings);

// 🌟 THE FIX: Added upload.any() so the backend parses the PDFs properly!
router.post('/admin/allocation-settings', upload.any(), adminController.updateAllocationSettings);

router.get('/api/allocation-window', adminController.checkAllocationWindow); // Public check

// ==========================================================
// 📧 EMAIL TEMPLATE ROUTES
// ==========================================================
router.get('/admin/email-templates', adminController.getEmailTemplates);
router.post('/admin/email-templates', upload.single('attachment'), adminController.updateEmailTemplate);

// ==========================================================
// 👨‍🏫 FACULTY ROUTES
// ==========================================================
router.get('/admin/faculty', adminController.getFaculty);
router.post('/admin/faculty', adminController.addFaculty);
router.delete('/admin/faculty/:id', adminController.deleteFaculty);

// 🌟 CRITICAL: THIS MUST BE AT THE VERY BOTTOM
module.exports = router;