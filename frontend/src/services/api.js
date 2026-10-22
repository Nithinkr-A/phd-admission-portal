const request = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };
  
  // If it's a file upload (FormData), the browser automatically sets the correct Content-Type 
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(endpoint, { ...options, headers });
    return await response.json();
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error);
    throw new Error('Network error or backend is unreachable.');
  }
};

export const api = {
  // --- AUTHENTICATION ---
  candidateLogin: (data) => request('/login', { method: 'POST', body: JSON.stringify(data) }),
  adminLogin: (data) => request('/admin/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/register', { method: 'POST', body: JSON.stringify(data) }),
  
  // --- OTP & PASSWORDS ---
  sendEmailOtp: (data) => request('/api/send-email-otp', { method: 'POST', body: JSON.stringify(data) }),
  verifyEmailOtp: (data) => request('/api/verify-email-otp', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => request('/api/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // --- CANDIDATE DASHBOARD & APPLICATION ---
  getMyApplication: (email) => request(`/api/my-application/${encodeURIComponent(email)}`),
  submitApplication: (formData) => request('/submit-application', { method: 'POST', body: formData }),
  checkAllocationWindow: () => request('/api/allocation-window'), 
  
  // 🌟 The new Joining Form submission
  submitJoiningForm: (formData) => request('/api/submit-joining', { method: 'POST', body: formData }),

  // --- ADMIN DASHBOARD ---
  getApplications: (email) => request(`/admin/applications?admin_email=${encodeURIComponent(email)}`),
  updateAppStatus: (id, status) => request(`/admin/application/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  scheduleInterview: (data) => request('/admin/schedule-interview', { method: 'POST', body: JSON.stringify(data) }),
  approveStudent: (data) => request('/api/admin/approve-student', { method: 'POST', body: JSON.stringify(data) }),
  
  // --- EMAIL TEMPLATES ---
  getEmailTemplates: () => request('/admin/email-templates'),
  updateEmailTemplate: (formData) => request('/admin/email-templates', { method: 'POST', body: formData }),
  
  // --- PORTAL SETTINGS --- 
  getAllocationSettings: () => request('/admin/allocation-settings'),
  updateAllocationSettings: (formData) => request('/admin/allocation-settings', { method: 'POST', body: formData }),

  // --- FACULTY MANAGEMENT ---
  getFaculty: () => request('/admin/faculty'),
  addFaculty: (data) => request('/admin/faculty', { method: 'POST', body: JSON.stringify(data) }),
  deleteFaculty: (id) => request(`/admin/faculty/${id}`, { method: 'DELETE' }),
};