import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTemplateFileUrl } from '../api/templates';
import { createDraft, getDrafts, getDraft, exportDraft, getDraftExportUrl, type Draft, type DraftDetail } from '../api/drafts';
import { getStoredUser, logout } from '../api/auth';

export default function EditorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef(formData);

  // Update ref when formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const user = getStoredUser();

  // Load existing drafts
  const loadDrafts = useCallback(async () => {
    if (!templateId) return;

    try {
      const draftsList = await getDrafts(templateId);
      setDrafts(draftsList);
    } catch (err) {
      console.error('Failed to load drafts:', err);
    }
  }, [templateId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (Object.keys(formData).length === 0) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveDraft(true); // Auto-save
    }, 30000); // 30 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData]);

  const handleSaveDraft = async (isAutoSave = false) => {
    if (!templateId) return;

    if (Object.keys(formDataRef.current).length === 0) {
      if (!isAutoSave) {
        setError('Please fill in at least one field before saving.');
      }
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await createDraft({
        templateId,
        formData: formDataRef.current,
      });

      setLastSaved(new Date());
      setSuccessMessage(isAutoSave ? 'Auto-saved successfully!' : 'Draft saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reload drafts list
      await loadDrafts();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to save draft. Please try again.';
      setError(errorMsg);

      // For auto-save failures, don't show error permanently
      if (isAutoSave) {
        setTimeout(() => setError(null), 5000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDraft = async (draftId: string) => {
    setLoading(true);
    setError(null);

    try {
      const draft = await getDraft(draftId);
      setFormData(draft.formData);
      setSuccessMessage('Draft loaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!templateId) return;

    // First, save the current draft
    if (Object.keys(formData).length === 0) {
      setError('Please fill in the form before exporting.');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      // Save draft first
      const draft = await createDraft({
        templateId,
        formData,
      });

      // Export the draft
      await exportDraft(draft.id);

      // Download the PDF with authentication
      const token = localStorage.getItem('authToken');
      const downloadUrl = getDraftExportUrl(draft.id);

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filled-form-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('PDF exported and downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleLogout = () => {
    logout();
  };

  if (!templateId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Editor</h1>
        <p>Missing templateId in URL.</p>
        <Link to="/templates">Back to Templates</Link>
      </div>
    );
  }

  const pdfUrl = getTemplateFileUrl(templateId);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Fill PDF Form</h1>
          {user && <p style={{ color: '#666' }}>Logged in as: {user.fullName}</p>}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/templates" style={{ padding: '0.5rem 1rem', textDecoration: 'none', border: '1px solid #ccc', borderRadius: '4px' }}>
            ← Back to Templates
          </Link>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c00'
        }}>
          ❌ {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '4px',
          color: '#060'
        }}>
          ✅ {successMessage}
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left: PDF Preview */}
        <div>
          <h2>PDF Preview</h2>
          <div style={{ border: '2px solid #ccc', borderRadius: '4px', height: '80vh', overflow: 'auto' }}>
            <iframe
              title="Template PDF"
              src={pdfUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>

        {/* Right: Form Fields */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Fill Form</h2>
            {lastSaved && (
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Common Form Fields */}
          <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
            <h3 style={{ marginTop: 0 }}>Patient Information</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Full Name:
                <input
                  type="text"
                  value={formData.fullName || ''}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  placeholder="Enter full name"
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Date of Birth:
                <input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Phone Number:
                <input
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                  placeholder="(123) 456-7890"
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Email:
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="email@example.com"
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Address:
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Street address, City, State, ZIP"
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Current Medications:
                <textarea
                  value={formData.medications || ''}
                  onChange={(e) => handleFieldChange('medications', e.target.value)}
                  placeholder="List current medications"
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Allergies:
                <textarea
                  value={formData.allergies || ''}
                  onChange={(e) => handleFieldChange('allergies', e.target.value)}
                  placeholder="List any allergies"
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Chief Complaint / Reason for Visit:
                <textarea
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => handleFieldChange('chiefComplaint', e.target.value)}
                  placeholder="Describe symptoms or reason for visit"
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={() => handleSaveDraft(false)}
              disabled={saving || loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                opacity: saving || loading ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : '💾 Save Draft'}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={exporting || saving || loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: exporting || saving || loading ? 'not-allowed' : 'pointer',
                opacity: exporting || saving || loading ? 0.6 : 1
              }}
            >
              {exporting ? 'Exporting...' : '📥 Download PDF'}
            </button>
          </div>

          {/* Saved Drafts */}
          {drafts.length > 0 && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ marginTop: 0 }}>Your Saved Drafts</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {drafts.map((draft) => (
                  <li key={draft.id} style={{ marginBottom: '0.5rem', padding: '0.75rem', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>Version {draft.version}</strong>
                        <br />
                        <small style={{ color: '#666' }}>
                          Saved: {new Date(draft.updatedAtUtc).toLocaleString()}
                        </small>
                      </div>
                      <button
                        onClick={() => handleLoadDraft(draft.id)}
                        disabled={loading}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Load
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Help Text */}
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
            <strong>💡 Tips:</strong>
            <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              <li>Your form auto-saves every 30 seconds</li>
              <li>Click "Save Draft" to manually save your progress</li>
              <li>Load previous drafts to continue where you left off</li>
              <li>Click "Download PDF" to export and download the filled form</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
