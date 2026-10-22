import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api'; 

// 🌟 ADDED: 'undertaking_form' is now at the bottom so it shows up in the Admin's "Docs" Modal!
const documentFields = [
  ['path_x_marksheet', 'Class X Marksheet'],
  ['path_xii_marksheet', 'Class XII Marksheet'],
  ['path_bachelor_marksheet', 'Bachelor Marksheet'],
  ['path_master_marksheet', 'Master Marksheet'],
  ['path_fellowship_cert', 'GATE / NET Certificate'],
  ['path_noc', 'No Objection Certificate'],
  ['path_photograph', 'Photograph'],
  ['path_signature', 'Signature'],
  ['path_dob_proof', 'DOB Proof'],
  ['path_scanned_app_form', 'Scanned Application Form'],
  ['path_category_certificate', 'Category Certificate'],
  ['undertaking_form', 'Signed Joining Document (Merged)'], 
];

const DEPARTMENTS = [
  "Aerospace Engineering", "Architecture, Town and Regional Planning", "Chemistry", "Civil Engineering",
  "Computer Science & Engineering", "Earth Sciences", "Electrical Engineering", "Electronics & Telecommunication Engineering",
  "Humanities and Social Sciences", "Information Technology", "Mathematics", "Mechanical Engineering",
  "Metallurgy and Materials Engineering", "Mining Engineering", "Physics"
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('applications'); 
  const [message, setMessage] = useState('');
  
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [schedule, setSchedule] = useState({ date: '', time: '', venue: '', interviewerEmail: '' });
  const [docsOpen, setDocsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [facultyList, setFacultyList] = useState([]);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', department: '', designation: '', specialization: '' });

  const [assignGuideModalOpen, setAssignGuideModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  
  // 🌟 EXPANDED: State now holds all 6 form paths
  const [allocationSettings, setAllocationSettings] = useState({ 
    start: '', end: '', active: false,
    path_joining_form: '',
    path_undertaking_individual_fellowship: '',
    path_undertaking_institute_fellowship: '',
    path_undertaking_sponsored_project: '',
    path_undertaking_sponsored: '',
    path_undertaking_self_sponsored: ''
  });

  // 🌟 EXPANDED: State now holds the 6 file objects for uploading
  const [blankFiles, setBlankFiles] = useState({
    joining_form: null, individual_fellowship: null, institute_fellowship: null, 
    sponsored_project: null, sponsored: null, self_sponsored: null
  });

  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const currentUser = useMemo(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications(currentUser.email || '');
      if (data.success) {
        setApplications(data.applications || []);
        setSelectedIds([]);
      }
    } catch (error) {
      setMessage('Unable to load applications.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const data = await api.getFaculty();
      if (data.success) setFacultyList(data.faculty || []);
    } catch (error) {
      setMessage('Unable to load faculty list.');
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await api.getAllocationSettings();
      if (data.success && data.settings) {
        const s = data.settings;
        setAllocationSettings({
          start: s.allocation_start ? s.allocation_start.split('T')[0] : '',
          end: s.allocation_end ? s.allocation_end.split('T')[0] : '',
          active: s.is_allocation_active || false,
          path_joining_form: s.path_joining_form || '',
          path_undertaking_individual_fellowship: s.path_undertaking_individual_fellowship || '',
          path_undertaking_institute_fellowship: s.path_undertaking_institute_fellowship || '',
          path_undertaking_sponsored_project: s.path_undertaking_sponsored_project || '',
          path_undertaking_sponsored: s.path_blank_sponsored || s.path_undertaking_sponsored || '',
          path_undertaking_self_sponsored: s.path_undertaking_self_sponsored || ''
        });
      }
    } catch (error) {
      console.error('Failed to load settings');
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await api.getEmailTemplates();
      if (data.success) setEmailTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load email templates');
    }
  };

  useEffect(() => {
    if (!currentUser || !['admin', 'super_admin', 'department_admin'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
    fetchApplications();
    fetchFaculty();
    fetchSettings();
    fetchTemplates();
  }, [currentUser, navigate]);

  const updateStatus = async (applicationId, status) => {
    try {
      const data = await api.updateAppStatus(applicationId, status);
      if (data.success) {
        setMessage('Status updated successfully.');
        fetchApplications();
      }
    } catch (error) {
      setMessage('Could not update the status.');
    }
  };

  const handleStatusChange = (e, app) => {
    const newStatus = e.target.value;
    const confirm = window.confirm(`Are you sure you want to change ${app.name}'s status to "${newStatus}"?`);
    if (confirm) updateStatus(app.id, newStatus);
  };

  const handleApproveStudent = async (app) => {
    const confirm = window.confirm(`Are you sure you want to officially approve ${app.name}? This will generate their ID and send an automated email.`);
    if (!confirm) return;

    try {
      const data = await api.approveStudent({
        userId: app.id,
        departmentCode: app.departmentCode || 'IT', 
        userEmail: app.email,
        userName: app.name
      });
      if (data.success) {
        alert(`Success! ${app.name} is officially approved. Enrollment ID: ${data.enrollment_number}`);
        fetchApplications(); 
      } else {
        alert(data.message || 'Approval failed.');
      }
    } catch (error) {
      alert('Server error while approving.');
    }
  };

  const scheduleInterview = async () => {
    if (!selectedApp) return;
    const confirm = window.confirm(`Are you sure you want to schedule this interview for ${selectedApp.name}?`);
    if (!confirm) return;

    try {
      const data = await api.scheduleInterview({ 
        applicationId: selectedApp.id, 
        interviewDate: schedule.date, 
        interviewTime: schedule.time, 
        venue: schedule.venue,
        interviewerEmail: schedule.interviewerEmail 
      });
      if (data.success) {
        setMessage('Interview scheduled.');
        setSelectedApp(null);
        setSchedule({ date: '', time: '', venue: '', interviewerEmail: '' });
        fetchApplications();
      } else {
        setMessage(data.message || 'Scheduling failed.');
      }
    } catch (error) {
      setMessage('Could not schedule interview.');
    }
  };

  const handleAssignSupervisor = async (e) => {
    e.preventDefault();
    if (!selectedFaculty) return alert("Please select a faculty member.");

    try {
      const data = await api.assignSupervisor({
        applicationId: selectedApp.id,
        facultyName: selectedFaculty,
        studentEmail: selectedApp.email,
        studentName: selectedApp.name
      });

      if (data.success) {
        setMessage(`Successfully assigned Prof. ${selectedFaculty} to ${selectedApp.name}.`);
        setAssignGuideModalOpen(false);
        setSelectedApp(null);
        setSelectedFaculty('');
        fetchApplications();
      } else {
        setMessage('Failed to assign supervisor.');
      }
    } catch (err) {
      setMessage('Server error assigning supervisor.');
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('template_key', editingTemplate.template_key);
      formData.append('subject', editingTemplate.subject);
      formData.append('body', editingTemplate.body);

      const data = await api.updateEmailTemplate(formData);
      if (data.success) {
        setMessage(`✅ ${editingTemplate.template_key} template updated successfully.`);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        setMessage('❌ Failed to update template.');
      }
    } catch (err) {
      setMessage('Server error updating template.');
    }
  };

  const toggleSelection = (appId) => {
    const id = String(appId);
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const selectMatchingStatus = (status) => {
    const ids = applications.filter((app) => (app.status || 'Submitted') === status).map((app) => String(app.id));
    setSelectedIds(ids);
  };

  const clearSelections = () => setSelectedIds([]);

  const sendBulkEmails = () => {
    const targetApps = applications.filter((app) => selectedIds.includes(String(app.id)));
    if (targetApps.length === 0) return setMessage('Please select at least one applicant to email.');

    const confirm = window.confirm(`Are you sure you want to open your email frontend to send messages to ${targetApps.length} applicants?`);
    if (!confirm) return;

    const allAccepted = targetApps.every(app => app.status === 'Accepted' || app.status === 'Approved');
    const allRejected = targetApps.every(app => app.status === 'Rejected');

    let targetTemplateKey = '';
    if (allAccepted) targetTemplateKey = 'APPLICATION ACCEPTED';
    else if (allRejected) targetTemplateKey = 'APPLICATION REJECTED';

    const template = emailTemplates.find(t => 
      t.template_key.replace(/_/g, ' ').toUpperCase() === targetTemplateKey.toUpperCase()
    );

    let emailSubject = template ? template.subject : 'PhD Admissions Update';
    let emailBody = template ? template.body : 'Dear Applicant,\n\nPlease check your portal for admission updates.\n\nBest regards,\nAdmissions Office';

    const bccEmails = targetApps.map(app => app.email).filter(Boolean).join(',');
    const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    try {
      window.open(mailtoLink, '_blank');
      navigator.clipboard.writeText(bccEmails);
      setMessage(`Mail composer opened! Copied ${targetApps.length} emails to clipboard.`);
    } catch (err) {
      setMessage('Browser blocked popup. Emails copied to clipboard.');
      navigator.clipboard.writeText(bccEmails);
    }
  };

  const exportTable = (table) => window.location.href = `/admin/export?table=${encodeURIComponent(table)}`;

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    const confirm = window.confirm(`Are you sure you want to add ${facultyForm.name} as a new faculty member?`);
    if (!confirm) return;

    try {
      const data = await api.addFaculty(facultyForm);
      if (data.success) {
        setMessage('Faculty member added successfully.');
        setFacultyModalOpen(false);
        setFacultyForm({ name: '', email: '', department: '', designation: '', specialization: '' });
        fetchFaculty();
      } else {
        setMessage(data.message || 'Failed to add faculty.');
      }
    } catch (err) {
      setMessage('Server error adding faculty.');
    }
  };

  const handleDeleteFaculty = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this faculty member?')) return;
    try {
      const data = await api.deleteFaculty(id);
      if (data.success) {
        setMessage('Faculty member removed.');
        fetchFaculty();
      } else {
        setMessage(data.message || 'Failed to delete faculty.');
      }
    } catch (err) {
      setMessage('Server error deleting faculty.');
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('allocation_start', allocationSettings.start);
      formData.append('allocation_end', allocationSettings.end);
      formData.append('is_allocation_active', allocationSettings.active);

      // 🌟 APPEND ALL 6 FILES TO FORMDATA
      if (blankFiles.joining_form) formData.append('joining_form', blankFiles.joining_form);
      if (blankFiles.individual_fellowship) formData.append('undertaking_ind_fellowship', blankFiles.individual_fellowship);
      if (blankFiles.institute_fellowship) formData.append('undertaking_inst_fellowship', blankFiles.institute_fellowship);
      if (blankFiles.sponsored_project) formData.append('undertaking_sponsored_project', blankFiles.sponsored_project);
      if (blankFiles.sponsored) formData.append('undertaking_sponsored', blankFiles.sponsored);
      if (blankFiles.self_sponsored) formData.append('undertaking_self_sponsored', blankFiles.self_sponsored);

      const data = await api.updateAllocationSettings(formData);
      
      if (data.success) {
        setMessage('✅ Portal settings and blank forms updated successfully.');
        setBlankFiles({ joining_form: null, individual_fellowship: null, institute_fellowship: null, sponsored_project: null, sponsored: null, self_sponsored: null }); 
        fetchSettings(); 
      } else {
        setMessage('❌ Failed to update portal settings.');
      }
    } catch (err) {
      setMessage('Server error saving settings.');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="panel-card">
      <div className="action-row" style={{ marginBottom: 20, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Admissions Administration</h2>
        
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ 
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', 
              background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px 14px', borderRadius: '8px', cursor: 'pointer' 
            }}
            title="Menu Settings"
          >
            <div style={{ width: '22px', height: '3px', background: '#475569', borderRadius: '2px' }}></div>
            <div style={{ width: '22px', height: '3px', background: '#475569', borderRadius: '2px' }}></div>
            <div style={{ width: '22px', height: '3px', background: '#475569', borderRadius: '2px' }}></div>
          </button>

          {menuOpen && (
            <div style={{ 
              position: 'absolute', top: '100%', right: 0, marginTop: '10px', background: '#ffffff', 
              border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
              zIndex: 100, display: 'flex', flexDirection: 'column', padding: '8px', minWidth: '220px' 
            }}>
              <button 
                style={{ textAlign: 'left', padding: '12px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'applications' ? '#4f46e5' : 'transparent', color: activeTab === 'applications' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer', marginBottom: '4px' }}
                onClick={() => { setActiveTab('applications'); setMessage(''); setMenuOpen(false); }}
              >Review Applications</button>
              
              <button 
                style={{ textAlign: 'left', padding: '12px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'faculty' ? '#4f46e5' : 'transparent', color: activeTab === 'faculty' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer', marginBottom: '4px' }}
                onClick={() => { setActiveTab('faculty'); setMessage(''); setMenuOpen(false); }}
              >Faculty Management</button>
              
              <button 
                style={{ textAlign: 'left', padding: '12px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'settings' ? '#4f46e5' : 'transparent', color: activeTab === 'settings' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer', marginBottom: '4px' }}
                onClick={() => { setActiveTab('settings'); setMessage(''); setMenuOpen(false); }}
              >Portal Settings</button>
              
              <button 
                style={{ textAlign: 'left', padding: '12px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'templates' ? '#4f46e5' : 'transparent', color: activeTab === 'templates' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => { setActiveTab('templates'); setMessage(''); setMenuOpen(false); }}
              >Email Templates</button>
            </div>
          )}
        </div>
      </div>

      {message && <div className="info-banner">{message}</div>}

      {/* --- EMAIL TEMPLATES TAB --- */}
      {activeTab === 'templates' && (
        <div className="panel-card" style={{ background: '#f8fafc', padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Automated Email Templates</h3>
          <p className="muted" style={{ marginBottom: '24px' }}>
            Edit the content of the automated emails sent by the system. Use placeholders like <code>[StudentName]</code> to inject live data.
          </p>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {emailTemplates.map(template => (
                <div 
                  key={template.template_key} 
                  onClick={() => { 
                    setEditingTemplate(template); 
                  }}
                  style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', background: editingTemplate?.template_key === template.template_key ? '#e0e7ff' : '#fff' }}
                >
                  <strong style={{ color: '#0f172a' }}>{template.template_key.replace('_', ' ').toUpperCase()}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {template.subject}
                  </div>
                </div>
              ))}
            </div>

            {editingTemplate && (
              <div style={{ flex: '2', minWidth: '350px', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <form className="stack-form" onSubmit={handleSaveTemplate}>
                  <label>
                    <strong>Email Subject Line</strong>
                    <input type="text" value={editingTemplate.subject} onChange={(e) => setEditingTemplate({...editingTemplate, subject: e.target.value})} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </label>
                  <label style={{ marginTop: '15px' }}>
                    <strong>Email Body</strong>
                    <textarea rows="10" value={editingTemplate.body} onChange={(e) => setEditingTemplate({...editingTemplate, body: e.target.value})} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
                  </label>

                  <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', marginTop: '15px' }}>
                    <strong>Available Variables:</strong> <br/>
                    <code>[StudentName]</code>, <code>[EnrollmentNumber]</code>, <code>[FacultyName]</code>
                  </div>
                  <div className="action-row" style={{ marginTop: '20px' }}>
                    <button type="button" className="secondary-btn" onClick={() => { setEditingTemplate(null); }}>Cancel</button>
                    <button type="submit" className="primary-btn">Save Template</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SETTINGS TAB WITH 6 FILE UPLOADS --- */}
      {activeTab === 'settings' && (
        <div className="panel-card" style={{ background: '#f8fafc', padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Supervisor Allocation Settings & Forms</h3>
          <p className="muted" style={{ marginBottom: '24px' }}>
            Set the dates for the allocation window and upload the official joining forms for students.
          </p>

          <form className="stack-form" onSubmit={saveSettings} style={{ maxWidth: '600px' }}>
            <label>
              <strong>Window Start Date</strong>
              <input type="date" value={allocationSettings.start} onChange={(e) => setAllocationSettings({...allocationSettings, start: e.target.value})} required />
            </label>
            <label>
              <strong>Window End Date</strong>
              <input type="date" value={allocationSettings.end} onChange={(e) => setAllocationSettings({...allocationSettings, end: e.target.value})} required />
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', background: '#fff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={allocationSettings.active} onChange={(e) => setAllocationSettings({...allocationSettings, active: e.target.checked})} />
              <span style={{ fontWeight: 'bold', color: allocationSettings.active ? '#16a34a' : '#64748b' }}>
                {allocationSettings.active ? "🟢 Master Switch: ACTIVE (Launched)" : "🔴 Master Switch: INACTIVE (Closed)"}
              </span>
            </label>

            {/* 🌟 EXPANDED UI: 6 Uploads for Joining Report and Undertakings */}
            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📄 Joining & Undertaking Forms</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>Upload the blank PDF templates that accepted students will download and sign.</p>

              <label style={{ display: 'block', marginBottom: '15px' }}>
                <strong>1. General Joining Form (For ALL Students)</strong>
                <input type="file" accept="application/pdf" onChange={(e) => setBlankFiles({...blankFiles, joining_form: e.target.files[0]})} style={{ width: '100%', marginTop: '5px', background: '#fff' }} />
                {allocationSettings.path_joining_form && !blankFiles.joining_form && (
                  <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '6px', fontWeight: 'bold' }}>✓ Uploaded: {allocationSettings.path_joining_form.split('/').pop()}</div>
                )}
              </label>

              <label style={{ display: 'block', marginBottom: '15px' }}>
                <strong>2. Individual Fellowship Undertaking</strong>
                <input type="file" accept="application/pdf" onChange={(e) => setBlankFiles({...blankFiles, individual_fellowship: e.target.files[0]})} style={{ width: '100%', marginTop: '5px', background: '#fff' }} />
                {allocationSettings.path_undertaking_individual_fellowship && !blankFiles.individual_fellowship && (
                  <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '6px', fontWeight: 'bold' }}>✓ Uploaded: {allocationSettings.path_undertaking_individual_fellowship.split('/').pop()}</div>
                )}
              </label>

              <label style={{ display: 'block', marginBottom: '15px' }}>
                <strong>3. Institute Fellowship Undertaking</strong>
                <input type="file" accept="application/pdf" onChange={(e) => setBlankFiles({...blankFiles, institute_fellowship: e.target.files[0]})} style={{ width: '100%', marginTop: '5px', background: '#fff' }} />
                {allocationSettings.path_undertaking_institute_fellowship && !blankFiles.institute_fellowship && (
                  <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '6px', fontWeight: 'bold' }}>✓ Uploaded: {allocationSettings.path_undertaking_institute_fellowship.split('/').pop()}</div>
                )}
              </label>

              <label style={{ display: 'block', marginBottom: '15px' }}>
                <strong>4. Sponsored Research Project Fellow Undertaking</strong>
                <input type="file" accept="application/pdf" onChange={(e) => setBlankFiles({...blankFiles, sponsored_project: e.target.files[0]})} style={{ width: '100%', marginTop: '5px', background: '#fff' }} />
                {allocationSettings.path_undertaking_sponsored_project && !blankFiles.sponsored_project && (
                  <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '6px', fontWeight: 'bold' }}>✓ Uploaded: {allocationSettings.path_undertaking_sponsored_project.split('/').pop()}</div>
                )}
              </label>

              <label style={{ display: 'block', marginBottom: '15px' }}>
                <strong>5. Sponsored Category Undertaking</strong>
                <input type="file" accept="application/pdf" onChange={(e) => setBlankFiles({...blankFiles, sponsored: e.target.files[0]})} style={{ width: '100%', marginTop: '5px', background: '#fff' }} />
                {allocationSettings.path_undertaking_sponsored && !blankFiles.sponsored && (
                  <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '6px', fontWeight: 'bold' }}>✓ Uploaded: {allocationSettings.path_undertaking_sponsored.split('/').pop()}</div>
                )}
              </label>

              <label style={{ display: 'block', marginBottom: '15px' }}>
                <strong>6. Self-Sponsored Category Undertaking</strong>
                <input type="file" accept="application/pdf" onChange={(e) => setBlankFiles({...blankFiles, self_sponsored: e.target.files[0]})} style={{ width: '100%', marginTop: '5px', background: '#fff' }} />
                {allocationSettings.path_undertaking_self_sponsored && !blankFiles.self_sponsored && (
                  <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '6px', fontWeight: 'bold' }}>✓ Uploaded: {allocationSettings.path_undertaking_self_sponsored.split('/').pop()}</div>
                )}
              </label>
            </div>

            <button type="submit" className="primary-btn" style={{ marginTop: '20px' }}>Save & Apply Settings</button>
          </form>
        </div>
      )}

      {/* --- APPLICATIONS TAB --- */}
      {activeTab === 'applications' && (
        <>
          <div className="panel-card" style={{ marginBottom: 16, padding: 16, background: '#f8fafc' }}>
            <div className="action-row" style={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <strong>Bulk Mail Actions:</strong>
                <button className="secondary-btn" onClick={() => selectMatchingStatus('Accepted')}>Select Accepted</button>
                <button className="secondary-btn" onClick={() => selectMatchingStatus('Rejected')}>Select Rejected</button>
                <button className="ghost-btn" onClick={clearSelections}>Clear</button>
                <button className="primary-btn" onClick={sendBulkEmails}>Email Selected via Gmail</button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="ghost-btn" onClick={() => exportTable('phd_applications')}>⬇ Export Applications</button>
                <button className="ghost-btn" onClick={() => exportTable('users')}>⬇ Export Users</button>
              </div>
            </div>
          </div>

          {loading ? <p>Loading applications…</p> : (
            <div className="table-card">
              <table>
                <thead>
                  <tr><th>Select</th><th>Applicant</th><th>Department</th><th>Status / ID</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td><input type="checkbox" checked={selectedIds.includes(String(app.id))} onChange={() => toggleSelection(app.id)} /></td>
                      <td>
                        <strong>{app.name}</strong><div className="muted">{app.email}</div>
                        {app.assigned_supervisor && (
                           <div style={{ fontSize: '0.85em', color: '#4f46e5', marginTop: '4px', fontWeight: 'bold' }}>
                             Guide: Prof. {app.assigned_supervisor}
                           </div>
                        )}
                      </td>
                      <td>{app.department || 'N/A'}</td>
                      
                      <td>
                        <span style={{ fontWeight: 'bold' }}>{app.status || 'Submitted'}</span>
                        {app.enrollment_number && (
                          <div style={{ fontSize: '0.85em', color: '#16a34a', marginTop: '4px' }}>
                            ID: {app.enrollment_number}
                          </div>
                        )}
                      </td>

                      <td className="action-stack">
                        {app.enrollment_number ? (
                          <span style={{ padding: '6px 12px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '0.9em', fontWeight: 'bold', display: 'inline-block', textAlign: 'center' }}>
                            Officially Enrolled
                          </span>
                        ) : (
                          <>
                            <select value={app.status || 'Submitted'} onChange={(e) => handleStatusChange(e, app)}>
                              <option value="Submitted">Submitted</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Waitlisted">Waitlisted</option>
                            </select>
                            
                            {app.status === 'Approved' && (
                              <button className="primary-btn" style={{ background: '#16a34a', border: 'none', marginTop: '5px' }} onClick={() => handleApproveStudent(app)}>
                                Generate ID & Email
                              </button>
                            )}
                          </>
                        )}
                        
                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
                          <button className="secondary-btn" onClick={() => { setSelectedApp(app); setDocsOpen(true); }}>Docs</button>
                          {app.status === 'Shortlisted' && <button className="secondary-btn" onClick={() => setSelectedApp(app)}>Schedule</button>}
                          
                          {(app.status === 'Accepted' || app.status === 'Approved' || app.enrollment_number) && (
                            <button className="secondary-btn" style={{ borderColor: '#4f46e5', color: '#4f46e5' }} onClick={() => { setSelectedApp(app); setAssignGuideModalOpen(true); }}>
                              Assign Guide
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* --- FACULTY TAB --- */}
      {activeTab === 'faculty' && (
        <>
          <div className="panel-card" style={{ marginBottom: 16, padding: 16, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0' }}>Registered Faculty</h3>
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>Add or remove supervisors available for scholar allocation.</p>
            </div>
            <button className="primary-btn" onClick={() => setFacultyModalOpen(true)}>+ Add New Faculty</button>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr><th>Name</th><th>Department</th><th>Designation</th><th>Specialization</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {facultyList.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No faculty members found.</td></tr>
                ) : (
                  facultyList.map((faculty) => (
                    <tr key={faculty.id}>
                      <td><strong>{faculty.name}</strong><div className="muted">{faculty.email}</div></td>
                      <td>{faculty.department}</td>
                      <td>{faculty.designation}</td>
                      <td>{faculty.specialization || 'N/A'}</td>
                      <td><button className="ghost-btn" style={{ color: '#dc2626' }} onClick={() => handleDeleteFaculty(faculty.id)}>Remove</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODALS */}
      {facultyModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Add Faculty Member</h3>
            <form className="stack-form" onSubmit={handleAddFaculty}>
              <label>Name <input value={facultyForm.name} onChange={(e) => setFacultyForm({...facultyForm, name: e.target.value})} required /></label>
              <label>Email <input type="email" value={facultyForm.email} onChange={(e) => setFacultyForm({...facultyForm, email: e.target.value})} required /></label>
              <label>
                Department
                <select value={facultyForm.department} onChange={(e) => setFacultyForm({...facultyForm, department: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="" disabled>Select Department</option>
                  <option value="Aerospace Engineering">Aerospace Engineering</option>
                  <option value="Architecture, Town and Regional Planning">Architecture, Town and Regional Planning</option>
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
              <label>
                Designation
                <select value={facultyForm.designation} onChange={(e) => setFacultyForm({...facultyForm, designation: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="" disabled>Select Designation</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                </select>
              </label>
              <label>Specialization <input value={facultyForm.specialization} onChange={(e) => setFacultyForm({...facultyForm, specialization: e.target.value})} placeholder="e.g. Artificial Intelligence" /></label>
              <div className="action-row" style={{ marginTop: '15px' }}>
                <button type="button" className="secondary-btn" onClick={() => setFacultyModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedApp && selectedApp.status === 'Shortlisted' && !assignGuideModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Schedule interview</h3>
            <p>For {selectedApp.name}</p>
            <div className="stack-form">
              <label>Date <input type="date" value={schedule.date} onChange={(e) => setSchedule({ ...schedule, date: e.target.value })} /></label>
              <label>Time <input type="time" value={schedule.time} onChange={(e) => setSchedule({ ...schedule, time: e.target.value })} /></label>
              <label>Venue <input value={schedule.venue} onChange={(e) => setSchedule({ ...schedule, venue: e.target.value })} /></label>
              <label>Interviewer Email <input type="email" value={schedule.interviewerEmail} onChange={(e) => setSchedule({ ...schedule, interviewerEmail: e.target.value })} /></label>
            </div>
            <div className="action-row">
              <button className="secondary-btn" onClick={() => setSelectedApp(null)}>Cancel</button>
              <button className="primary-btn" onClick={scheduleInterview}>Save</button>
            </div>
          </div>
        </div>
      )}

      {docsOpen && selectedApp && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Documents for {selectedApp.name}</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {documentFields.map(([field, label]) => {
                const value = selectedApp[field];
                if (!value) return null;
                
                const adminToken = localStorage.getItem('token') || currentUser?.token || '';
                const url = `${value.startsWith('http') ? '' : '/'}${value.replace(/^\//, '')}?token=${encodeURIComponent(adminToken)}`;
                
                return (
                  <a key={field} href={url} target="_blank" rel="noreferrer" className="secondary-btn" style={field === 'undertaking_form' ? { backgroundColor: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' } : {}}>
                    {label}
                  </a>
                );
              })}
            </div>
            <div className="action-row" style={{ marginTop: 16 }}>
              <button className="secondary-btn" onClick={() => { setDocsOpen(false); setSelectedApp(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {assignGuideModalOpen && selectedApp && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '550px' }}>
            <h3>Assign Research Supervisor</h3>
            <p>Select an official guide for <strong>{selectedApp.name}</strong> ({selectedApp.department || 'No Dept'}).</p>
            
            <form onSubmit={handleAssignSupervisor} className="stack-form" style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>Student's Submitted Preferences</h4>
                
                {selectedApp.supervisor_pref_1 || selectedApp.supervisor_pref_2 || selectedApp.supervisor_pref_3 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedApp.supervisor_pref_1 && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="radio" name="guide_pref" value={selectedApp.supervisor_pref_1} onChange={(e) => setSelectedFaculty(e.target.value)} checked={selectedFaculty === selectedApp.supervisor_pref_1} style={{ width: '18px', height: '18px' }} />
                        <div><span style={{ fontWeight: 'bold', color: '#0f172a' }}>1st Choice:</span> {selectedApp.supervisor_pref_1}</div>
                      </label>
                    )}
                    {selectedApp.supervisor_pref_2 && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="radio" name="guide_pref" value={selectedApp.supervisor_pref_2} onChange={(e) => setSelectedFaculty(e.target.value)} checked={selectedFaculty === selectedApp.supervisor_pref_2} style={{ width: '18px', height: '18px' }} />
                        <div><span style={{ fontWeight: 'bold', color: '#0f172a' }}>2nd Choice:</span> {selectedApp.supervisor_pref_2}</div>
                      </label>
                    )}
                    {selectedApp.supervisor_pref_3 && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="radio" name="guide_pref" value={selectedApp.supervisor_pref_3} onChange={(e) => setSelectedFaculty(e.target.value)} checked={selectedFaculty === selectedApp.supervisor_pref_3} style={{ width: '18px', height: '18px' }} />
                        <div><span style={{ fontWeight: 'bold', color: '#0f172a' }}>3rd Choice:</span> {selectedApp.supervisor_pref_3}</div>
                      </label>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9em', fontStyle: 'italic' }}>
                    The student has not submitted their preferences yet, or the allocation window is still open.
                  </p>
                )}
              </div>

              <label>
                <strong>Manual Override (All Faculty)</strong>
                <select value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="" disabled>-- Or manually select a Professor --</option>
                  {facultyList.filter(faculty => faculty.department === selectedApp.department || !selectedApp.department).map(faculty => (
                      <option key={faculty.id} value={faculty.name}>{faculty.name} ({faculty.designation})</option>
                  ))}
                  <option disabled>──────</option>
                  {facultyList.map(faculty => (
                      <option key={`all-${faculty.id}`} value={faculty.name}>{faculty.name} - {faculty.department}</option>
                  ))}
                </select>
              </label>

              <div className="action-row" style={{ marginTop: '20px' }}>
                <button type="button" className="secondary-btn" onClick={() => { setAssignGuideModalOpen(false); setSelectedApp(null); setSelectedFaculty(''); }}>Cancel</button>
                <button type="submit" className="primary-btn">Confirm Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}