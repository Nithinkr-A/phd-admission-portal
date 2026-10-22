require('dotenv').config();
const express = require('express');
const path = require('path');
const dns = require('dns');

// Force IPv4 for external connections (Fixes the ENETUNREACH error)
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendBuildPath = path.join(__dirname, '../frontend', 'dist');

// 1. Basic Setup & Security Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
    }
    next(err);
});

// 2. Import & Mount API Routes
// 🌟 We removed the deleted api.js file and use the combined adminRoutes file
const appRoutes = require('./routes/adminRoutes'); 

// 🌟 Mount the combined router to the root '/' so all URLs match the frontend exactly
app.use('/', appRoutes);

// 3. Serve the Static React Files
app.use(express.static(frontendBuildPath));
app.use(express.static(__dirname));

// 4. The "Catch-All" React Router Fix (Express v5 compliant)
app.use((req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// 5. Start the Application
app.listen(PORT, () => {
    console.log(`🚀 Admission Server running live on: http://localhost:${PORT}`);
});