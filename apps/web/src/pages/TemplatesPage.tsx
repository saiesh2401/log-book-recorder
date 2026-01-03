import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates, deleteTemplate, Template } from '../api/templates';
import { getStoredUser, logout } from '../api/auth';
import TemplateUploadForm from '../components/TemplateUploadForm';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = getStoredUser();

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleDelete = async (templateId: string, templateTitle: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation

    if (!window.confirm(`Are you sure you want to delete "${templateTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      await fetchTemplates(); // Refresh the list
    } catch (err) {
      alert('Failed to delete template. Please try again.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>PDF Templates</h1>
          {user && <p style={{ color: '#666' }}>Welcome, {user.fullName}!</p>}
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <TemplateUploadForm onUploaded={fetchTemplates} />

      {loading && <p>Loading templates...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && templates.length === 0 && <p>No templates found. Upload one to get started.</p>}

      {!loading && templates.length > 0 && (
        <div>
          <h2>Available Templates</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => navigate(`/editor/${tpl.id}`)}
              >
                <h3 style={{ marginTop: 0, color: '#007bff' }}>{tpl.title}</h3>
                {tpl.collegeName && <p style={{ color: '#666' }}>📋 {tpl.collegeName}</p>}
                <p style={{ fontSize: '0.9em', color: '#999' }}>
                  Created: {new Date(tpl.createdAtUtc).toLocaleDateString()}
                </p>
                <button
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    marginTop: '0.5rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Fill Form →
                </button>
                <button
                  onClick={(e) => handleDelete(tpl.id, tpl.title, e)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    marginTop: '0.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
