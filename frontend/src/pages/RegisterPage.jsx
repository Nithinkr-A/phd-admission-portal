import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api'; 

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', dob: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const sendOtp = async () => {
    if (!form.email) {
      setMessage('Please enter your email before requesting an OTP.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.sendEmailOtp({ email: form.email });
      if (data.success) {
        setOtpSent(true);
        setMessage('Verification code sent to your email.'); 
      } else {
        setMessage(data.message || 'Failed to send OTP.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const data = await api.verifyEmailOtp({ email: form.email, userTypedOtp: otp });
      if (data.success) {
        setVerified(true);
        setMessage('Email verified successfully.');
      } else {
        setMessage(data.message || 'Verification failed.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!verified) {
      setMessage('Please verify your email before creating an account.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setMessage('Password must contain uppercase, lowercase, number, special character and be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.register({ 
        name: form.name, 
        dob: form.dob, 
        phone: form.phone, 
        email: form.email, 
        password: form.password 
      });
      
      if (data.success) {
        setSuccessData(data);
        setMessage('Registration complete.');
      } else {
        setMessage(data.message || 'Registration failed.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const continueToDashboard = () => {
    if (successData?.user) {
      localStorage.setItem('currentUser', JSON.stringify(successData.user));
      navigate('/dashboard');
    }
  };

  return (
    <div className="panel-card">
      <h2>Register for the admissions portal</h2>
      <p>Create your account and verify your email before submitting an application.</p>

      {message ? <div className="info-banner">{message}</div> : null}

      <form className="stack-form" onSubmit={submit}>
        <div className="grid-2">
          <label>
            Full name
            <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </label>
          <label>
            Date of birth
            <input type="date" value={form.dob} onChange={(e) => updateField('dob', e.target.value)} required />
          </label>
        </div>

        <div className="grid-2">
          <label>
            Phone number
            <input 
              type="tel" 
              pattern="[0-9]{10}" 
              maxLength="10" 
              title="Must be exactly 10 digits"
              placeholder="10-digit mobile number" 
              value={form.phone} 
              onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))} 
              required 
            />
          </label>
          <label>
            Email address
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </label>
        </div>

        <div className="grid-2">
          <label>
            Password
            <div className="password-input">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <label>
            Confirm password
            <div className="password-input">
              <input type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required />
              <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
        </div>

        <div className="otp-card">
          <button type="button" className="secondary-btn" onClick={sendOtp} disabled={loading}>
            {otpSent ? 'Resend OTP' : 'Send OTP'}
          </button>
          {otpSent ? (
            <>
              <input placeholder="Enter 6-digit code" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <button type="button" className="primary-btn" onClick={verifyOtp} disabled={loading}>Verify</button>
            </>
          ) : null}
        </div>

        <button className="primary-btn" type="submit" disabled={loading || !verified}>
          {loading ? 'Creating account...' : 'Register account'}
        </button>
      </form>

      {successData ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Registration successful</h3>
            <p>Your application ID is <strong>{successData.appId}</strong>.</p>
            <button className="primary-btn" onClick={continueToDashboard}>Continue to dashboard</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}