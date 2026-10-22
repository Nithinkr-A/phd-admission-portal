import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api'; // 🌟 API IMPORT

const steps = [
  { id: 1, title: 'Personal profile' },
  { id: 2, title: 'Academic background' },
  { id: 3, title: 'Category & documents' },
  { id: 4, title: 'Review & submit' },
];

export default function ApplicationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // 🌟 CLEANED STATE: Removed redundant fellowship/sponsored category states
  const [form, setForm] = useState({
    name: '', category: '', mobile: '', alternate_mobile: '', email: '', department: '',
    x_year: '', x_board: '', x_percentage: '', xii_year: '', xii_board: '', xii_percentage: '',
    bachelor_year: '', bachelor_university: '', bachelor_percentage: '', master_year: '', master_university: '', master_percentage: '',
    belongs_category: '', 
    x_marksheet: null, xii_marksheet: null, bachelor_marksheet: null, master_marksheet: null,
    gate_net_certificate: null, noc: null, photograph: null, signature: null, dob_proof: null,
    category_certificate: null,
    acceptedTerms: false,
  });
  
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const currentUser = useMemo(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      navigate('/');
      return;
    }

    setForm((previous) => ({ 
      ...previous, 
      name: currentUser.name || '', 
      email: currentUser.email || '',
      mobile: currentUser.mobile || currentUser.phone || '' 
    }));

    api.getMyApplication(currentUser.email || '')
      .then((data) => {
        if (data.submitted) {
          setSubmitted(true);
          setMessage(`Your application is already submitted and locked under status ${data.application?.status || 'Submitted'}.`);
        }
      })
      .catch(() => {
        setMessage('Unable to verify existing application status.');
      });
  }, [currentUser, navigate]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const validateStep = () => {
    if (step === 1) {
      if (!form.name || !form.mobile || !form.email || !form.department || !form.category) {
        setMessage('Please fill all mandatory identity and admission fields before continuing.');
        return false;
      }
    }
    if (step === 2) {
      if (!form.x_year || !form.x_board || !form.x_percentage || !form.x_marksheet || 
          !form.xii_year || !form.xii_board || !form.xii_percentage || !form.xii_marksheet ||
          !form.bachelor_year || !form.bachelor_university || !form.bachelor_percentage || !form.bachelor_marksheet) {
        setMessage('Please fill all mandatory academic details and upload the required mark sheets before continuing.');
        return false;
      }

      const currentYear = new Date().getFullYear();
      const x = parseInt(form.x_year, 10);
      const xii = parseInt(form.xii_year, 10);
      const bach = parseInt(form.bachelor_year, 10);
      const mast = form.master_year ? parseInt(form.master_year, 10) : 0;

      if (x < 1950 || x > currentYear) return setMessage('Please enter a valid Class X passing year.'), false;
      if (xii <= x) return setMessage('Class XII passing year must come after Class X.'), false;
      if (bach <= xii) return setMessage("Bachelor's passing year must come after Class XII."), false;
      if (bach > currentYear + 1) return setMessage("Bachelor's passing year cannot be that far in the future."), false;
      if (mast && mast <= bach) return setMessage("Master's passing year must come after Bachelor's."), false;
      if (mast && mast > currentYear + 1) return setMessage("Master's passing year cannot be that far in the future."), false;
    }
    
    // 🌟 UPDATED VALIDATION: Checks social category, and dynamic NOC check based on Step 1
    if (step === 3) {
      if (!form.belongs_category) {
        setMessage('Please select your social category before continuing.');
        return false;
      }
      if ((form.category.includes('Sponsored') || form.category.includes('Project')) && !form.noc) {
        setMessage('Sponsored candidates must upload a No Objection Certificate (NOC).');
        return false;
      }
    }
    
    if (step === 4) {
      if (!form.photograph || !form.signature || !form.dob_proof) {
        setMessage('Please upload all mandatory identity documents.');
        return false;
      }
      if (!form.acceptedTerms) {
        setMessage('You must accept the declaration before submitting.');
        return false;
      }
    }
    setMessage('');
    return true;
  };

  const nextStep = () => { if (validateStep() && step < steps.length) setStep((c) => c + 1); };
  const prevStep = () => { if (step > 1) setStep((c) => c - 1); };
  const reviewAndSubmit = () => { if (validateStep()) setReviewOpen(true); };

  const finalSubmit = async () => {
    if (!validateStep()) return;

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key !== 'acceptedTerms' && value !== null && value !== '') {
        data.append(key, value);
      }
    });

    setLoading(true);
    try {
      const result = await api.submitApplication(data);
      if (result.success) {
        setMessage('Application submitted successfully.');
        setReviewOpen(false);
        navigate('/dashboard');
      } else {
        setMessage(result.message || 'Submission failed.');
      }
    } catch (error) {
      setMessage('Unable to submit application.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="panel-card">
      <div className="stepper">
        {steps.map((item) => (
          <div key={item.id} className={`step-pill ${step === item.id ? 'active' : ''}`}>
            <span>{item.id}</span>
            <small>{item.title}</small>
          </div>
        ))}
      </div>

      {message && <div className="info-banner">{message}</div>}

      {submitted ? (
        <div className="info-banner">Your submission is already locked. You can review it from the dashboard.</div>
      ) : (
        <form className="stack-form" onSubmit={(event) => event.preventDefault()}>
          
          {step === 1 && (
            <div className="form-section">
              <h4 className="section-title"><strong>Personal Information</strong></h4>
              <div className="grid-2 form-group-spacing">
                <label><span>Applicant Name <span className="mandatory-star">*</span></span><input value={form.name} disabled className="locked-input" /></label>
                <label><span>Email Address <span className="mandatory-star">*</span></span><input type="email" value={form.email} disabled className="locked-input" /></label>
                <label><span>Primary Mobile <span className="mandatory-star">*</span></span><input value={form.mobile} disabled className="locked-input" /></label>
                <label><span>Alternate Mobile</span><input placeholder="e.g. 9876543210" value={form.alternate_mobile} onChange={(e) => updateField('alternate_mobile', e.target.value.replace(/\D/g, ''))} maxLength="10" /></label>
              </div>

              <h4 className="section-title"><strong>Admission Details</strong></h4>
              <div className="grid-2 form-group-spacing-sm">
                
                {/* 🌟 UNIFIED DROPDOWN: Matches your 5 Undertaking forms perfectly */}
                <label>
                  <span>Admission Category <span className="mandatory-star">*</span></span>
                  <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                    <option value="">Select Category</option>
                    <option value="Institute Fellowship">Regular / Institute Fellowship</option>
                    <option value="Individual Fellowship">Individual Fellowship</option>
                    <option value="Sponsored Research Project Fellow">Sponsored Research Project Fellow</option>
                    <option value="Sponsored Category">Sponsored Category</option>
                    <option value="Self-Sponsored Category">Self-Sponsored Category</option>
                    <option value="External">External Registration</option>
                  </select>
                </label>

                <label>
                  <span>Department <span className="mandatory-star">*</span></span>
                  <select value={form.department} onChange={(e) => updateField('department', e.target.value)}>
                    <option value="">Select Department</option>
                    <option value="Aerospace Engineering">Aerospace Engineering</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Earth Sciences">Earth Sciences</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Electronics & Telecommunication Engineering">Electronics & Telecommunication Engineering</option>
                    <option value="Humanities and Social Sciences">Humanities and Social Sciences</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Metallurgy and Materials Engineering">Metallurgy and Materials Engineering</option>
                    <option value="Mining Engineering">Mining Engineering</option>
                    <option value="Physics">Physics</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="academic-details-container">
              <h4 className="section-title"><strong>Class X (Matriculation) Details</strong></h4>
              <div className="grid-2 form-group-spacing">
                <label><span>Year of Passing <span className="mandatory-star">*</span></span><input type="text" maxLength="4" placeholder="e.g. 2016" value={form.x_year} onChange={(e) => updateField('x_year', e.target.value.replace(/\D/g, ''))} /></label>
                <label><span>Board / Institution <span className="mandatory-star">*</span></span><input placeholder="Enter Board" value={form.x_board} onChange={(e) => updateField('x_board', e.target.value)} /></label>
                <label><span>Percentage / CGPA <span className="mandatory-star">*</span></span><input placeholder="85.5 or 9.2" value={form.x_percentage} onChange={(e) => updateField('x_percentage', e.target.value)} /></label>
                <label>
                  <span>Class X Mark Sheet (PDF Only) <span className="mandatory-star">*</span></span>
                  <input type="file" accept=".pdf" onChange={(e) => updateField('x_marksheet', e.target.files[0])} />
                  {form.x_marksheet && <small className="success-text">Selected: {form.x_marksheet.name}</small>}
                </label>
              </div>

              <h4 className="section-title"><strong>Class XII (Post-Matric / Intermediate) Details</strong></h4>
              <div className="grid-2 form-group-spacing">
                <label><span>Year of Passing <span className="mandatory-star">*</span></span><input type="text" maxLength="4" placeholder="e.g. 2018" value={form.xii_year} onChange={(e) => updateField('xii_year', e.target.value.replace(/\D/g, ''))} /></label>
                <label><span>Board / Institution <span className="mandatory-star">*</span></span><input placeholder="Enter Board" value={form.xii_board} onChange={(e) => updateField('xii_board', e.target.value)} /></label>
                <label><span>Percentage / CGPA <span className="mandatory-star">*</span></span><input placeholder="88.0 or 9.5" value={form.xii_percentage} onChange={(e) => updateField('xii_percentage', e.target.value)} /></label>
                <label>
                  <span>Class XII Mark Sheet (PDF Only) <span className="mandatory-star">*</span></span>
                  <input type="file" accept=".pdf" onChange={(e) => updateField('xii_marksheet', e.target.files[0])} />
                  {form.xii_marksheet && <small className="success-text">Selected: {form.xii_marksheet.name}</small>}
                </label>
              </div>

              <h4 className="section-title"><strong>Bachelor's Degree Details</strong></h4>
              <div className="grid-2 form-group-spacing">
                <label><span>Year of Passing <span className="mandatory-star">*</span></span><input type="text" maxLength="4" placeholder="e.g. 2022" value={form.bachelor_year} onChange={(e) => updateField('bachelor_year', e.target.value.replace(/\D/g, ''))} /></label>
                <label><span>University / Institute Name <span className="mandatory-star">*</span></span><input placeholder="College Name" value={form.bachelor_university} onChange={(e) => updateField('bachelor_university', e.target.value)} /></label>
                <label><span>Percentage / CGPA <span className="mandatory-star">*</span></span><input placeholder="75.0 or 8.0" value={form.bachelor_percentage} onChange={(e) => updateField('bachelor_percentage', e.target.value)} /></label>
                <label>
                  <span>Bachelor's Mark Sheet (PDF Only) <span className="mandatory-star">*</span></span>
                  <input type="file" accept=".pdf" onChange={(e) => updateField('bachelor_marksheet', e.target.files[0])} />
                  {form.bachelor_marksheet && <small className="success-text">Selected: {form.bachelor_marksheet.name}</small>}
                </label>
              </div>

              <h4 className="section-title"><strong>Master's Degree Details (Optional)</strong></h4>
              <div className="grid-2 form-group-spacing-sm">
                <label><span>Year of Passing</span><input type="text" maxLength="4" placeholder="e.g. 2024" value={form.master_year} onChange={(e) => updateField('master_year', e.target.value.replace(/\D/g, ''))} /></label>
                <label><span>University / Institute Name</span><input placeholder="College Name" value={form.master_university} onChange={(e) => updateField('master_university', e.target.value)} /></label>
                <label><span>Percentage / CGPA</span><input placeholder="75.0 or 8.0" value={form.master_percentage} onChange={(e) => updateField('master_percentage', e.target.value)} /></label>
                <label>
                  <span>Master's Mark Sheet (PDF Only)</span>
                  <input type="file" accept=".pdf" onChange={(e) => updateField('master_marksheet', e.target.files[0])} />
                  {form.master_marksheet && <small className="success-text">Selected: {form.master_marksheet.name}</small>}
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-section">
              <h4 className="section-title"><strong>Category & Documents</strong></h4>
              <div className="grid-2 form-group-spacing">
                <label>
                  <span>Social Category <span className="mandatory-star">*</span></span>
                  <select value={form.belongs_category} onChange={(e) => updateField('belongs_category', e.target.value)}>
                    <option value="">Select</option>
                    <option value="General">General</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="OBC-NCL">OBC-NCL</option>
                    <option value="EWS">EWS</option>
                    <option value="PwD">PwD</option>
                  </select>
                </label>
                
                {/* 🌟 DYNAMIC NOC: Only asks if they picked a sponsored category in Step 1 */}
                {(form.category.includes('Sponsored') || form.category.includes('Project')) && (
                  <label>
                    <span>No Objection Certificate (PDF Only) <span className="mandatory-star">*</span></span>
                    <input type="file" accept=".pdf" onChange={(e) => updateField('noc', e.target.files[0])} />
                    {form.noc && <small className="success-text">Selected: {form.noc.name}</small>}
                  </label>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-section">
              <h4 className="section-title"><strong>Identity & Application Documents</strong></h4>
              <div className="grid-2 form-group-spacing">
                <label>
                  <span>Recent Photograph (JPG/PNG) <span className="mandatory-star">*</span></span>
                  <input type="file" accept="image/jpeg, image/png" onChange={(e) => updateField('photograph', e.target.files[0])} />
                  {form.photograph && <small className="success-text">Selected: {form.photograph.name}</small>}
                </label>
                <label>
                  <span>Digital Signature (JPG/PNG) <span className="mandatory-star">*</span></span>
                  <input type="file" accept="image/jpeg, image/png" onChange={(e) => updateField('signature', e.target.files[0])} />
                  {form.signature && <small className="success-text">Selected: {form.signature.name}</small>}
                </label>
                <label>
                  <span>Date of Birth Proof (PDF Only) <span className="mandatory-star">*</span></span>
                  <input type="file" accept=".pdf" onChange={(e) => updateField('dob_proof', e.target.files[0])} />
                  {form.dob_proof && <small className="success-text">Selected: {form.dob_proof.name}</small>}
                </label>
                <label>
                  <span>GATE/NET Certificate (If Applicable, PDF)</span>
                  <input type="file" accept=".pdf" onChange={(e) => updateField('gate_net_certificate', e.target.files[0])} />
                  {form.gate_net_certificate && <small className="success-text">Selected: {form.gate_net_certificate.name}</small>}
                </label>
                <label>
                  <span>Category Certificate (If Applicable, PDF)</span>
                  <input type="file" accept=".pdf" onChange={(e) => updateField('category_certificate', e.target.files[0])} />
                  {form.category_certificate && <small className="success-text">Selected: {form.category_certificate.name}</small>}
                </label>
              </div>
              
              <label className="checkbox-row">
                <input type="checkbox" className="checkbox-auto" checked={form.acceptedTerms} onChange={(e) => updateField('acceptedTerms', e.target.checked)} />
                <span>I verify that all information is accurate and understand the application will be locked after submission. </span>
              </label>
            </div>
          )}

          <div className="action-row" style={{ marginTop: '20px' }}>
            {step > 1 ? <button className="secondary-btn" onClick={prevStep}>Back</button> : <div />}
            {step < steps.length ? (
              <button className="primary-btn" onClick={nextStep}>Continue</button>
            ) : (
              <button className="primary-btn" onClick={reviewAndSubmit}>Review & submit</button>
            )}
          </div>
        </form>
      )}

      {reviewOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card review-modal-large">
            <h3 className="review-modal-title">Review Application Details</h3>
            <p className="review-modal-subtitle">Please review your structured data carefully before locking your submission.</p>
            
            <div className="review-scroll-box">
              <h4 className="review-section-header">Personal & Admission Profile</h4>
              <div className="review-grid-2">
                <div><strong>Name:</strong> {form.name}</div>
                <div><strong>Email:</strong> {form.email}</div>
                <div><strong>Mobile:</strong> {form.mobile}</div>
                <div><strong>Alt Mobile:</strong> {form.alternate_mobile || 'N/A'}</div>
                <div><strong>Department:</strong> {form.department}</div>
                <div><strong>Admission Type:</strong> {form.category}</div>
              </div>

              <h4 className="review-section-header">Academic Background</h4>
              <table className="review-table">
                <thead><tr><th>Level</th><th>Year</th><th>Board / University</th><th>Score</th></tr></thead>
                <tbody>
                  <tr><td>Class X</td><td>{form.x_year}</td><td>{form.x_board}</td><td>{form.x_percentage}</td></tr>
                  <tr><td>Class XII</td><td>{form.xii_year}</td><td>{form.xii_board}</td><td>{form.xii_percentage}</td></tr>
                  <tr><td>Bachelor's</td><td>{form.bachelor_year}</td><td>{form.bachelor_university}</td><td>{form.bachelor_percentage}</td></tr>
                  {form.master_year && <tr><td>Master's</td><td>{form.master_year}</td><td>{form.master_university}</td><td>{form.master_percentage}</td></tr>}
                </tbody>
              </table>

              {/* 🌟 CLEANED REVIEW: Removed duplicates, kept only Social Category */}
              <h4 className="review-section-header">Category & Sponsorship</h4>
              <div className="review-grid-2">
                <div><strong>Social Category:</strong> {form.belongs_category}</div>
                {(form.category.includes('Sponsored') || form.category.includes('Project')) && (
                  <div><strong>NOC Uploaded:</strong> Yes</div>
                )}
              </div>

              <h4 className="review-section-header">Uploaded Documents</h4>
              <div className="review-doc-grid">
                {form.photograph && <div> Photograph: <strong>{form.photograph.name}</strong></div>}
                {form.signature && <div> Signature: <strong>{form.signature.name}</strong></div>}
                {form.dob_proof && <div> DOB Proof: <strong>{form.dob_proof.name}</strong></div>}
                {form.x_marksheet && <div> Class X Mark Sheet: <strong>{form.x_marksheet.name}</strong></div>}
                {form.xii_marksheet && <div> Class XII Mark Sheet: <strong>{form.xii_marksheet.name}</strong></div>}
                {form.bachelor_marksheet && <div> Bachelor's Mark Sheet: <strong>{form.bachelor_marksheet.name}</strong></div>}
                {form.master_marksheet && <div> Master's Mark Sheet: <strong>{form.master_marksheet.name}</strong></div>}
                {form.gate_net_certificate && <div> GATE/NET Certificate: <strong>{form.gate_net_certificate.name}</strong></div>}
                {form.noc && <div> No Objection Certificate: <strong>{form.noc.name}</strong></div>}
                {form.category_certificate && <div> Category Certificate: <strong>{form.category_certificate.name}</strong></div>}
              </div>
            </div>

            <div className="action-row">
              <button className="secondary-btn" onClick={() => setReviewOpen(false)}>Edit Details</button>
              <button className="primary-btn btn-large" onClick={finalSubmit} disabled={loading}>
                {loading ? 'Submitting to Database…' : 'Final Submit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}