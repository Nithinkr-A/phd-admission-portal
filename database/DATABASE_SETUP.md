# Database Setup Guide

## Prerequisites
- MySQL Server installed and running
- Node.js and npm installed

## Setup Steps

### 1. Update `.env` file
Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost          # MySQL host
DB_USER=root              # MySQL username
DB_PASSWORD=your_password # MySQL password
DB_NAME=iiest_admissions  # Database name (auto-created)
PORT=3000                 # Server port
```

### 2. Install dependencies
```bash
npm install
```

### 3. Initialize the database (create tables)
```bash
node init-db.js
```

You should see:
```
✅ Statement 1 executed
✅ Statement 2 executed
✅ Database schema setup complete!
```

### 4. Start the backend
```bash
node backend.js
```

You should see:
```
✅ Database ensured: iiest_admissions
✅ Connected successfully to MySQL database: iiest_admissions
🚀 Admission backend pipeline running live on: http://localhost:3000
```

## Testing the connection
Once the backend is running, visit: `http://localhost:3000`

Submit a form to test if data is saved to the database.

## Database Schema
- **Table:** `phd_applications`
- **Table:** `users`
- **Table:** `admins`
- **Columns:** 33 fields including personal info, education records, documents, status, and timestamps
- **Indexes:** email, mobile, created_at for faster queries

## Admin Access
- Default admin account is created automatically during initialization:
  - Email: `admin@iiest.ac.in`
  - Password: `admin123`
- Admin dashboard allows reviewing applications, changing application status, and exporting tables to CSV.

## Files
- `.env` - Environment variables (MySQL credentials)
- `database-schema.sql` - SQL schema definition
- `init-db.js` - Database initialization script
- `backend.js` - Express backend with MySQL integration
