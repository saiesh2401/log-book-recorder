import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            console.log('Attempting registration with:', { email, fullName });
            const response = await register({ email, password, fullName });
            console.log('Registration response:', response);

            // Store token and user info
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(response));
            console.log('Token stored, redirecting to templates');

            setSuccess('Registration successful! Redirecting...');

            // Redirect to templates after a brief delay to show success message
            setTimeout(() => {
                navigate('/templates');
            }, 1000);
        } catch (err: any) {
            console.error('Registration error:', err);
            console.error('Error response:', err.response);
            const errorMessage = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
            console.error('Showing error:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem' }}>
            <h1>Register</h1>

            <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
                {success && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        backgroundColor: '#d4edda',
                        border: '1px solid #c3e6cb',
                        borderRadius: '4px',
                        color: '#155724'
                    }}>
                        {success}
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        color: '#c00'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Full Name:
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                marginTop: '0.25rem',
                                fontSize: '1rem'
                            }}
                        />
                    </label>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Email:
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                marginTop: '0.25rem',
                                fontSize: '1rem'
                            }}
                        />
                    </label>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Password (min 6 characters):
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                marginTop: '0.25rem',
                                fontSize: '1rem'
                            }}
                        />
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Creating account...' : 'Register'}
                </button>
            </form>

            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    );
}
