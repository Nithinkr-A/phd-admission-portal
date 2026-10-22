import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api'; 

export default function DashboardPage() {
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [allocationWindow, setAllocationWindow] = useState({ active: false, end_date: null, settings: null });
  
  const [joiningFile, setJoiningFile] = useState(null);
  const [joiningMessage, setJoiningMessage] = useState('');
  const [isSubmittingJoining, setIsSubmittingJoining] = useState(false);

  const currentUser = useMemo(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }, []);

  const fetchApplicationData = () => {
    api.getMyApplication(currentUser.email || '')
      .then((data) => {
        if (data.submitted) {
          setSubmitted(true);
          setApplication(data.application);
        } else {
          setSubmitted(false);
        }
      })
      .catch(() => setSubmitted(false))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      navigate('/');
      return;
    }

    fetchApplicationData();

    api.checkAllocationWindow()
      .then(data => {
        if (data.success) {
          setAllocationWindow(data);
        }
      })
      .catch(() => console.error("Could not verify allocation window status"));

  }, [currentUser, navigate]);

  // 🌟 NEW LOGIC: Determines which files the student needs to download
  let undertakingPath = '';
  let undertakingLabel = 'Undertaking Form';
  let joiningPath = allocationWindow?.settings?.path_joining_form || '';

  if (allocationWindow?.settings) {
    const category = (application?.admission_category || application?.belongs_category || '').toLowerCase();

    if (category.includes('individual')) {
      undertakingPath = allocationWindow.settings.path_undertaking_individual_fellowship;
      undertakingLabel = 'Individual Fellowship Undertaking';
    } else if (category.includes('institute') || category.includes('regular')) {
      undertakingPath = allocationWindow.settings.path_undertaking_institute_fellowship;
      undertakingLabel = 'Institute Fellowship Undertaking';
    } else if (category.includes('project')) {
      undertakingPath = allocationWindow.settings.path_undertaking_sponsored_project;
      undertakingLabel = 'Sponsored Research Project Fellow Undertaking';
    } else if (category.includes('self-sponsored') || category.includes('self sponsored')) {
      undertakingPath = allocationWindow.settings.path_undertaking_self_sponsored;
      undertakingLabel = 'Self-Sponsored Category Undertaking';
    } else if (category.includes('sponsored')) {
      // Fallback for standard sponsored
      undertakingPath = allocationWindow.settings.path_blank_sponsored || allocationWindow.settings.path_undertaking_sponsored;
      undertakingLabel = 'Sponsored Category Undertaking';
    }
  }

  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    if (!joiningFile) return setJoiningMessage('⚠️ Please select a signed PDF to upload.');

    setIsSubmittingJoining(true);
    setJoiningMessage('');

    try {
      const formData = new FormData();
      formData.append('undertaking_form', joiningFile);
      formData.append('email', currentUser.email);

      const data = await api.submitJoiningForm(formData);
      if (data.success) {
        setJoiningMessage('✅ Joining formalities submitted successfully! Waiting for Admin verification.');
        fetchApplicationData(); 
      } else {
        setJoiningMessage(data.message || '❌ Failed to submit joining form.');
      }
    } catch (err) {
      setJoiningMessage('❌ Server error during upload.');
    } finally {
      setIsSubmittingJoining(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="dashboard-grid">
      <section className="panel-card">
        <h2>Welcome back, {currentUser.name || 'Applicant'}</h2>
        <p>Track the status of your admission workflow in one place.</p>
        
        {loading ? <p>Loading your portal…</p> : null}
        
        {!loading && !submitted ? (
          <div className="empty-state">
            <h3>No application found yet</h3>
            <p>Start a fresh submission to begin your admissions journey.</p>
            <button className="primary-btn" onClick={() => navigate('/application')}>Submit application</button>
          </div>
        ) : null}

        {!loading && submitted ? (
          <>
            {application?.status?.trim().toLowerCase() === 'approved' && application?.enrollment_number && (
              <div style={{ 
                  background: '#dcfce7', border: '1px solid #22c55e', padding: '20px', 
                  borderRadius: '8px', marginBottom: '20px', textAlign: 'center'
              }}>
                  <h2 style={{ color: '#166534', margin: '0 0 10px 0' }}>🎉 Welcome to IIEST Shibpur!</h2>
                  <p style={{ color: '#15803d', margin: 0, fontSize: '1.1rem' }}>
                      Your official Enrollment ID is: <strong>{application.enrollment_number}</strong>
                  </p>
              </div>
            )}

            <div className="status-card">
              <div className="status-header">
                <span className="pill">Status</span>
                <strong>{application?.status || 'Submitted'}</strong>
              </div>
              <div className="stats-grid">
                <div><span>Department</span><strong>{application?.department || 'N/A'}</strong></div>
                <div><span>Application ID</span><strong>{application?.id ? `IIEST-PHD-${application.id}` : 'N/A'}</strong></div>
                <div><span>Email</span><strong>{application?.email || currentUser.email}</strong></div>
                <div><span>Submitted</span><strong>{application?.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}</strong></div>
              </div>

              {/* 🌟 NEW: JOINING FORMALITIES SECTION (Appears only when Accepted) */}
              {application?.status === 'Accepted' && (
                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Step 1: Complete Joining Formalities</h3>
                  <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px' }}>
                    Congratulations on your offer! Please download your official joining report and your specific undertaking form below. Sign both, <strong>merge them into a single PDF</strong>, and upload it back here for admin verification.
                  </p>

                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '1rem' }}>1. Download Required Forms</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      {joiningPath ? (
                        <a href={`/${joiningPath.replace(/^\//, '')}?token=student-access&role=admin`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', width: 'fit-content', border: '1px solid #bfdbfe' }}>
                          ⬇️ Download General Joining Report (Mandatory)
                        </a>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>Joining Report not uploaded by Admin yet.</span>
                      )}

                      {undertakingPath ? (
                        <a href={`/${undertakingPath.replace(/^\//, '')}?token=student-access&role=admin`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', width: 'fit-content', border: '1px solid #bfdbfe' }}>
                          ⬇️ Download {undertakingLabel}
                        </a>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{undertakingLabel} not uploaded by Admin yet.</span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '1rem' }}>2. Upload Signed & Merged Copy</h4>
                    <form onSubmit={handleJoiningSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={(e) => setJoiningFile(e.target.files[0])} 
                        required 
                        style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                      <button type="submit" className="primary-btn" disabled={isSubmittingJoining}>
                        {isSubmittingJoining ? 'Uploading...' : 'Submit Joining Formalities'}
                      </button>
                      {joiningMessage && <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: joiningMessage.includes('✅') ? '#16a34a' : '#dc2626' }}>{joiningMessage}</div>}
                    </form>
                  </div>
                </div>
              )}

              {application?.status === 'Joining Submitted' && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#d97706' }}>⏳ Joining Formalities Under Review</h3>
                  <p style={{ fontSize: '0.95rem', color: '#475569', margin: 0 }}>
                    You have successfully submitted your signed undertaking. The administration is currently reviewing your documents. You will receive your Enrollment ID once verified!
                  </p>
                </div>
              )}

              {(application?.status === 'Accepted' || application?.status === 'Approved' || application?.enrollment_number) && (
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#059669' }}>Supervisor Allocation</h4>
                  
                  {allocationWindow.active ? (
                    <>
                      <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '5px' }}>
                        The supervisor allocation window is now open. Please proceed to select your research guide.
                      </p>
                      
                      <p style={{ fontSize: '0.9rem', color: '#dc2626', fontWeight: 'bold', marginBottom: '15px' }}>
                        ⏳ Deadline: {new Date(allocationWindow.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>

                      <button className="primary-btn" onClick={() => navigate('/supervisor-allocation')}>
                        Complete Supervisor Allocation
                      </button>
                    </>
                  ) : (
                    <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #94a3b8' }}>
                      <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0 }}>
                        ⏳ The supervisor allocation window is currently closed by the administration. You will be notified when it is time to submit your choices.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>

      {submitted && application ? (
        <section className="panel-card">
          <h3>Application details</h3>
          <div className="stats-grid">
            <div><span>Category</span><strong>{application.admission_category || application.belongs_category || 'N/A'}</strong></div>
            <div><span>Class X</span><strong>{application.x_percentage ? `${application.x_percentage}% (${application.x_board || 'N/A'})` : 'N/A'}</strong></div>
            <div><span>Class XII</span><strong>{application.xii_percentage ? `${application.xii_percentage}% (${application.xii_board || 'N/A'})` : 'N/A'}</strong></div>
            <div><span>Bachelor</span><strong>{application.bachelor_percentage ? `${application.bachelor_percentage}% (${application.bachelor_university || 'N/A'})` : 'N/A'}</strong></div>
            <div><span>Master</span><strong>{application.master_percentage ? `${application.master_percentage}% (${application.master_university || 'N/A'})` : 'N/A'}</strong></div>
          </div>
        </section>
      ) : null}
    </div>
  );
}