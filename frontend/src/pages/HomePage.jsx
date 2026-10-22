import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api'; 

function generateCaptcha(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('candidate');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [candidateForm, setCandidateForm] = useState({ loginId: '', password: '' });
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  
  // Visibility Toggles
  const [showCandidatePassword, setShowCandidatePassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const currentUser = useMemo(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }, []);

  const isAdminUser = currentUser && ['admin', 'super_admin', 'department_admin'].includes(currentUser.role);

  useEffect(() => {
    setCaptcha(generateCaptcha());
    if (currentUser) {
      navigate(isAdminUser ? '/admin-dashboard' : '/dashboard', { replace: true });
    }
  }, [currentUser, isAdminUser, navigate]);

  const refreshCaptcha = () => setCaptcha(generateCaptcha());

  // 🌟 REFACTORED: Candidate Login
  const handleCandidateLogin = async (event) => {
    event.preventDefault();
    if (captchaInput.trim() !== captcha) {
      setMessage('Captcha mismatch. Please try again.');
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      const data = await api.candidateLogin({ loginId: candidateForm.loginId, password: candidateForm.password });
      if (data.success) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('token', data.token); // 🌟 SAVING JWT TOKEN
        navigate('/dashboard');
      } else {
        setMessage(data.message || 'Candidate login failed.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
      setCaptchaInput('');
      refreshCaptcha();
    }
  };

 // 🌟 REFACTORED: Admin Login
  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await api.adminLogin({ email: adminForm.email, password: adminForm.password });
      
      if (data.success) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('token', data.token); // The all-important security token!
        navigate('/admin-dashboard');
      } else {
        setMessage(data.message || 'Admin login failed.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotOpen(true);
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotStatus('');
  };

  const closeForgotPassword = () => {
    setForgotOpen(false);
    setForgotStep(1);
    setForgotStatus('');
  };

  // 🌟 REFACTORED: Send Forgot OTP
  const sendForgotOtp = async () => {
    if (!forgotEmail.trim()) {
      setForgotStatus('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const data = await api.sendEmailOtp({ email: forgotEmail.trim() });
      if (data.success) {
        setForgotStep(2);
        // Strictly show the success message
        setForgotStatus('OTP sent. Check your email for the 6-digit code.');
      } else {
        setForgotStatus(data.message || 'Unable to send OTP.');
      }
    } catch (error) {
      setForgotStatus(error.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // 🌟 REFACTORED: Submit Forgot Password
  const submitForgotPassword = async () => {
    if (forgotOtp.trim().length !== 6) {
      setForgotStatus('OTP must be exactly 6 digits.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotStatus('Passwords do not match.');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(forgotNewPassword)) {
      setForgotStatus('Password must have uppercase, lowercase, number, special char, and be 8+ chars.');
      return;
    }
    setForgotLoading(true);
    try {
      const data = await api.resetPassword({ 
        email: forgotEmail.trim(), 
        otp: forgotOtp.trim(), 
        newPassword: forgotNewPassword 
      });
      if (data.success) {
        setForgotStatus('Password reset successful. You can now log in.');
        setTimeout(closeForgotPassword, 1200);
      } else {
        setForgotStatus(data.message || 'Reset failed.');
      }
    } catch (error) {
      setForgotStatus(error.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <div className="hero-grid">
        <section className="hero-card">
          <span className="pill">Admissions • Enrollment • Review</span>
          <h2>PhD Admissions for batch 2026-27</h2>
          <p>Register, submit your PhD application, track progress, and manage review workflows from one polished portal.</p>
        </section>

        <section className="auth-card">
          <div className="tab-row">
            <button className={`tab-btn ${activeTab === 'candidate' ? 'active' : ''}`} onClick={() => setActiveTab('candidate')}>Candidate</button>
            <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin</button>
          </div>

          {message ? <div className="info-banner">{message}</div> : null}

          {activeTab === 'candidate' ? (
            <form className="stack-form" onSubmit={handleCandidateLogin}>
              <label>
                Login ID / Email
                <input value={candidateForm.loginId} onChange={(e) => setCandidateForm({ ...candidateForm, loginId: e.target.value })} required />
              </label>
              <label>
                Password
                <div className="password-input">
                  <input type={showCandidatePassword ? 'text' : 'password'} value={candidateForm.password} onChange={(e) => setCandidateForm({ ...candidateForm, password: e.target.value })} required />
                  <button type="button" className="password-toggle" onClick={() => setShowCandidatePassword((value) => !value)}>{showCandidatePassword ? 'Hide' : 'Show'}</button>
                </div>
              </label>

              <div className="captcha-box">
                <span>{captcha}</span>
                <button type="button" className="ghost-btn" onClick={refreshCaptcha}>Refresh</button>
              </div>
              <label>
                Enter captcha
                <input value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} required />
              </label>

              <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
              <button type="button" className="ghost-btn" onClick={openForgotPassword}>Forgot password?</button>
            </form>
          ) : (
            <form className="stack-form" onSubmit={handleAdminLogin}>
              <label>
                Admin Email
                <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required />
              </label>
              <label>
                Password
                <div className="password-input">
                  <input type={showAdminPassword ? 'text' : 'password'} value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} required />
                  <button type="button" className="password-toggle" onClick={() => setShowAdminPassword((value) => !value)}>{showAdminPassword ? 'Hide' : 'Show'}</button>
                </div>
              </label>
              <div className="info-banner">Demo admin: admin@iiest.ac.in / Admin@1234</div>
              <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Checking…' : 'Admin login'}</button>
            </form>
          )}
        </section>
      </div>

      {forgotOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ position: 'relative' }}>
            <button onClick={closeForgotPassword} style={{ position: 'absolute', top: 15, right: 20, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: 10, paddingRight: 30 }}>Reset Password</h3>
            <p>Use your registered email to receive a reset OTP.</p>
            {forgotStatus ? <div className="info-banner">{forgotStatus}</div> : null}
            {forgotStep === 1 ? (
              <div className="stack-form">
                <label>
                  Registered Email
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                </label>
                <div className="action-row">
                  <button className="secondary-btn" onClick={closeForgotPassword}>Cancel</button>
                  <button className="primary-btn" type="button" onClick={sendForgotOtp} disabled={forgotLoading}>{forgotLoading ? 'Sending…' : 'Send OTP'}</button>
                </div>
              </div>
            ) : (
              <div className="stack-form">
                <label>
                  OTP Code
                  <input value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} maxLength={6} required />
                </label>
                <label>
                  New Password
                  <div className="password-input">
                    <input type={showForgotPassword ? 'text' : 'password'} value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} required />
                    <button type="button" className="password-toggle" onClick={() => setShowForgotPassword((value) => !value)}>{showForgotPassword ? 'Hide' : 'Show'}</button>
                  </div>
                </label>
                <label>
                  Confirm Password
                  <div className="password-input">
                    <input type={showForgotConfirmPassword ? 'text' : 'password'} value={forgotConfirmPassword} onChange={(e) => setForgotConfirmPassword(e.target.value)} required />
                    <button type="button" className="password-toggle" onClick={() => setShowForgotConfirmPassword((value) => !value)}>{showForgotConfirmPassword ? 'Hide' : 'Show'}</button>
                  </div>
                </label>
                <div className="action-row">
                  <button className="secondary-btn" onClick={closeForgotPassword}>Cancel</button>
                  <button className="primary-btn" type="button" onClick={submitForgotPassword} disabled={forgotLoading}>{forgotLoading ? 'Updating…' : 'Reset Password'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}