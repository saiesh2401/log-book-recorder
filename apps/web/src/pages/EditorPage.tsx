import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTemplates, getTemplateFileUrl, type Template } from '../api/templates';
import { createDraft, getDrafts, getDraft, exportDraft, getDraftExportUrl, type Draft, type Annotation } from '../api/drafts';
import { getStoredUser, logout } from '../api/auth';
import PdfAnnotationCanvas from '../components/PdfAnnotationCanvas';

export default function EditorPage() {
  const { templateId } = useParams<{ templateId: string }>();

  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Annotation styling state
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [color, setColor] = useState('#000000');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  // Auto-save functionality
  const autoSaveTimerRef = useRef<number | null>(null);
  const formDataRef = useRef(formData);
  const annotationsRef = useRef(annotations);

  // Update refs when data changes
  useEffect(() => {
    formDataRef.current = formData;
    annotationsRef.current = annotations;
  }, [formData, annotations]);

  const user = getStoredUser();

  // Load template info
  useEffect(() => {
    if (!templateId) return;

    const loadTemplate = async () => {
      try {
        const templates = await getTemplates();
        const found = templates.find((t) => t.id === templateId);
        if (found) {
          setTemplate(found);
        }
      } catch (err) {
        console.error('Failed to load template:', err);
      }
    };

    loadTemplate();
  }, [templateId]);

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
    const hasFormData = Object.keys(formData).length > 0;
    const hasAnnotations = annotations.length > 0;

    if (!hasFormData && !hasAnnotations) return;

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
  }, [formData, annotations]);

  const handleSaveDraft = async (isAutoSave = false) => {
    if (!templateId) return;

    const hasFormData = Object.keys(formDataRef.current).length > 0;
    const hasAnnotations = annotationsRef.current.length > 0;

    if (!hasFormData && !hasAnnotations) {
      if (!isAutoSave) {
        setError('Please fill in at least one field or add annotations before saving.');
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
        annotations: annotationsRef.current.length > 0 ? annotationsRef.current : undefined,
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
      setAnnotations(draft.annotations || []);
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

    const hasFormData = Object.keys(formData).length > 0;
    const hasAnnotations = annotations.length > 0;

    if (!hasFormData && !hasAnnotations) {
      setError('Please fill in the form or add annotations before exporting.');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      // Save draft first
      const draft = await createDraft({
        templateId,
        formData,
        annotations: annotations.length > 0 ? annotations : undefined,
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
  const isUnfillableForm = template?.hasFormFields === false;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Fill PDF Form</h1>
          {user && <p style={{ color: '#666' }}>Logged in as: {user.fullName}</p>}
          {template && (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              {isUnfillableForm ? '📝 Unfillable Form (Manual Annotation Mode)' : '📋 Fillable Form (Field Mode)'}
            </p>
          )}
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
        {/* Left: PDF Preview or Annotation Canvas */}
        <div>
          <h2>PDF {isUnfillableForm ? 'Annotation' : 'Preview'}</h2>
          {isUnfillableForm ? (
            <PdfAnnotationCanvas
              pdfUrl={pdfUrl}
              annotations={annotations}
              onAnnotationsChange={setAnnotations}
              fontSize={fontSize}
              fontFamily={fontFamily}
              color={color}
              bold={bold}
              italic={italic}
            />
          ) : (
            <div style={{ border: '2px solid #ccc', borderRadius: '4px', height: '80vh', overflow: 'auto' }}>
              <iframe
                title="Template PDF"
                src={pdfUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Right: Form Fields or Annotation Toolbar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>{isUnfillableForm ? 'Annotation Toolbar' : 'Fill Form'}</h2>
            {lastSaved && (
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          {isUnfillableForm ? (
            /* Annotation Toolbar for Unfillable PDFs */
            <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ marginTop: 0 }}>Text Styling</h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Font Size:
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                  >
                    <option value={8}>8pt</option>
                    <option value={10}>10pt</option>
                    <option value={12}>12pt</option>
                    <option value={14}>14pt</option>
                    <option value={16}>16pt</option>
                    <option value={18}>18pt</option>
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Font Family:
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times">Times</option>
                    <option value="Courier">Courier</option>
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Color:
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: '100%', padding: '0.25rem', marginTop: '0.25rem', height: '40px' }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={bold}
                    onChange={(e) => setBold(e.target.checked)}
                  />
                  <strong>Bold</strong>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={italic}
                    onChange={(e) => setItalic(e.target.checked)}
                  />
                  <em>Italic</em>
                </label>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
                <strong>💡 How to use:</strong>
                <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                  <li>Click anywhere on the PDF to place a text box</li>
                  <li>Click a text box to select and edit it</li>
                  <li>Use the toolbar above to change text styling</li>
                  <li>Delete unwanted annotations using the Delete button</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Form Fields for Fillable PDFs */
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
            </div>
          )}

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
              <li>Your {isUnfillableForm ? 'annotations' : 'form'} auto-save every 30 seconds</li>
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
