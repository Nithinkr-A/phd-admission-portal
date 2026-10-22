import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api'; 

export default function SupervisorAllocationForm() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [facultyList, setFacultyList] = useState([]);

  const currentUser = useMemo(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }, []);

  const [form, setForm] = useState({
    scholarName: '', enrolmentNo: '', programme: 'PhD', department: '', specialization: '',
    pref1Area: '', pref1Sup: '', pref2Area: '', pref2Sup: '', pref3Area: '', pref3Sup: ''
  });

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      navigate('/');
      return;
    }

    // 🌟 REFACTORED: API Calls
    api.getMyApplication(currentUser.email || '')
      .then(data => {
        if (data.submitted && data.application) {
          setForm(current => ({
            ...current,
            scholarName: currentUser.name || '',
            // 🌟 FIX: Now pulling the official enrollment number instead of the temporary ID!
            enrolmentNo: data.application.enrollment_number || 'Pending Generation',
            department: data.application.department || '' 
          }));
        }
      })
      .catch(err => console.error('Failed to fetch application details:', err));

    api.getFaculty()
      .then(data => {
        if (data.success) setFacultyList(data.faculty || []);
      })
      .catch(err => console.error('Failed to fetch faculty:', err));
  }, [currentUser, navigate]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setMessage('Your supervisor preferences have been submitted to the DPGC for approval.');
    }, 1500);
  };

  const displayFaculty = facultyList.filter(
    f => f.department.toLowerCase().trim() === (form.department || '').toLowerCase().trim()
  );

  const getAvailableFaculty = (currentPrefKey) => {
    return displayFaculty.filter(f => {
      if (f.name === form[currentPrefKey]) return true;
      if (currentPrefKey !== 'pref1Sup' && f.name === form.pref1Sup) return false;
      if (currentPrefKey !== 'pref2Sup' && f.name === form.pref2Sup) return false;
      if (currentPrefKey !== 'pref3Sup' && f.name === form.pref3Sup) return false;
      return true; 
    });
  };

  if (!currentUser) return null;

  return (
    <div className="panel-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="action-row" style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#4a148c' }}>Request for Thesis Supervisor Allocation</h2>
        <p className="muted" style={{ margin: '5px 0 0 0' }}>Complete this form to submit your supervisor preferences to the DPGC.</p>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}

      {submitted ? (
        <div className="empty-state" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#059669' }}>Allocation Request Received</h3>
          <p>Your preferences are currently under review by the Departmental Postgraduate Committee (DPGC).</p>
          <button className="secondary-btn" onClick={() => navigate('/dashboard')} style={{ marginTop: '15px' }}>
            Return to Dashboard
          </button>
        </div>
      ) : (
        <form className="stack-form" onSubmit={handleSubmit}>
          <h4 style={{ marginBottom: '5px', color: '#334155' }}>1. Scholar Details</h4>
          <div className="grid-2">
            <label>Scholar's Name<input value={form.scholarName} disabled style={{ background: '#f8fafc' }} /></label>
            <label>Enrolment No<input value={form.enrolmentNo} disabled style={{ background: '#f8fafc' }} /></label>
            <label>Programme<input value={form.programme} disabled style={{ background: '#f8fafc' }} /></label>
            <label>Department/School/Centre<input value={form.department} disabled style={{ background: '#f8fafc' }} /></label>
          </div>
          
          <label style={{ marginTop: '10px' }}>
            Area of Specialization
            <input value={form.specialization} onChange={(e) => updateField('specialization', e.target.value)} placeholder="e.g. Machine Learning, Information Theory" required />
          </label>

          <h4 style={{ marginTop: '20px', marginBottom: '5px', color: '#334155' }}>2. Supervisor Preferences</h4>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '15px' }}>Please list your top three preferences for research areas and faculty members.</p>
          
          <div className="table-card" style={{ marginBottom: '20px' }}>
            <table>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Preference</th><th style={{ width: '40%' }}>Research Area</th><th style={{ width: '45%' }}>Choice of Supervisor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>1st Choice</strong></td>
                  <td><input style={{ width: '100%', border: 'none', background: 'transparent' }} placeholder="Primary research interest" value={form.pref1Area} onChange={(e) => updateField('pref1Area', e.target.value)} required /></td>
                  <td>
                    <select style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} value={form.pref1Sup} onChange={(e) => updateField('pref1Sup', e.target.value)} required>
                      <option value="" disabled>Select a Supervisor</option>
                      {getAvailableFaculty('pref1Sup').map(f => <option key={f.id} value={f.name}>{f.name} ({f.designation})</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>2nd Choice</strong></td>
                  <td><input style={{ width: '100%', border: 'none', background: 'transparent' }} placeholder="Secondary research interest" value={form.pref2Area} onChange={(e) => updateField('pref2Area', e.target.value)} required /></td>
                  <td>
                    <select style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} value={form.pref2Sup} onChange={(e) => updateField('pref2Sup', e.target.value)} required>
                      <option value="" disabled>Select a Supervisor</option>
                      {getAvailableFaculty('pref2Sup').map(f => <option key={f.id} value={f.name}>{f.name} ({f.designation})</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>3rd Choice</strong></td>
                  <td><input style={{ width: '100%', border: 'none', background: 'transparent' }} placeholder="Tertiary research interest" value={form.pref3Area} onChange={(e) => updateField('pref3Area', e.target.value)} required /></td>
                  <td>
                    <select style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} value={form.pref3Sup} onChange={(e) => updateField('pref3Sup', e.target.value)} required>
                      <option value="" disabled>Select a Supervisor</option>
                      {getAvailableFaculty('pref3Sup').map(f => <option key={f.id} value={f.name}>{f.name} ({f.designation})</option>)}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <label className="checkbox-container" style={{ margin: '15px 0' }}>
            <input type="checkbox" required />
            I digitally sign and confirm that these preferences align with my intended area of specialization.
          </label>

          <div className="action-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={() => navigate('/dashboard')}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Allocation Request'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}