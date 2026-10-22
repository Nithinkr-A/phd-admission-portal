CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    app_id VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    dob DATE,
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    enrollment_number VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS phd_applications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(20),
    alternate_mobile VARCHAR(20),
    department VARCHAR(100),
    admission_category VARCHAR(100),
    belongs_category VARCHAR(100),
    sponsored_category VARCHAR(100),
    fellowship_category VARCHAR(100),
    x_year INT, x_board VARCHAR(255), x_percentage DECIMAL(5,2), path_x_marksheet VARCHAR(255),
    xii_year INT, xii_board VARCHAR(255), xii_percentage DECIMAL(5,2), path_xii_marksheet VARCHAR(255),
    bachelor_year INT, bachelor_university VARCHAR(255), bachelor_percentage DECIMAL(5,2), path_bachelor_marksheet VARCHAR(255),
    master_year INT, master_university VARCHAR(255), master_percentage DECIMAL(5,2), path_master_marksheet VARCHAR(255),
    path_fellowship_cert VARCHAR(255), path_noc VARCHAR(255), path_photograph VARCHAR(255), path_signature VARCHAR(255),
    path_dob_proof VARCHAR(255), path_scanned_app_form VARCHAR(255), path_payment_receipt VARCHAR(255), path_category_certificate VARCHAR(255),

    status VARCHAR(50) DEFAULT 'Submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    specialization TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY,
    allocation_start DATE,
    allocation_end DATE,
    is_allocation_active BOOLEAN DEFAULT false,

    path_joining_form VARCHAR(255),
    path_undertaking_individual_fellowship VARCHAR(255),
    path_undertaking_institute_fellowship VARCHAR(255),
    path_undertaking_sponsored_project VARCHAR(255),
    path_undertaking_sponsored VARCHAR(255),
    path_undertaking_self_sponsored VARCHAR(255)
);
-- Insert the default master row (ID 1) if it doesn't already exist
INSERT INTO system_settings (id, is_allocation_active) 
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Create the email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    template_key VARCHAR(50) PRIMARY KEY,
    subject VARCHAR(255),
    body TEXT
);

INSERT INTO email_templates (template_key, subject, body) VALUES
('student_approved', 'Action Required: Official Selection for PhD Program', 'Dear [StudentName],

We are pleased to inform you that your application for the PhD program has been officially approved.

Your official University Enrollment Number is: [EnrollmentNumber]

Please log in to your dashboard to complete your joining formalities.'),

('supervisor_assigned', 'Official Supervisor Allocation Complete', 'Dear [StudentName],

We are pleased to inform you that your research supervisor has been officially allocated.

Assigned Guide: Prof. [FacultyName]

Please contact your supervisor to begin your academic proceedings.')
ON CONFLICT (template_key) DO NOTHING;