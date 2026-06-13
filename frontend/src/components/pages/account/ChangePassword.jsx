import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChangePassword.css';

const API = 'http://localhost:5001';

export default function ChangePassword() {
    useEffect(() => {
          document.title = "Profile";
      }, []);
    const navigate = useNavigate();
    const [isOAuth, setIsOAuth] = useState(null); // null = loading
    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // ✅ check if oauth user on mount
    useEffect(() => {
        const checkUserType = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                const res = await fetch(`${API}/api/auth/usertype`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) setIsOAuth(data.isOAuth);
            } catch (err) {
                console.error(err);
            }
        };
        checkUserType();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const validate = () => {
        // ✅ oauth users skip current password check
        if (!isOAuth && !form.currentPassword) return 'Current password is required';
        if (!form.newPassword) return 'New password is required';
        if (form.newPassword.length < 6) return 'New password must be at least 6 characters';
        if (!isOAuth && form.newPassword === form.currentPassword) return 'New password must be different from current';
        if (form.newPassword !== form.confirmPassword) return 'Passwords do not match';
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        try {
            const res = await fetch(`${API}/api/auth/account/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: form.currentPassword,
                    newPassword: form.newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess('Password changed successfully!');
                setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => navigate('/profile'), 2000);
            } else {
                setError(data.error || 'Failed to change password');
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const getStrength = (pwd) => {
        if (!pwd) return { label: '', color: '', width: '0%' };
        if (pwd.length < 6)  return { label: 'Too short', color: '#e63946', width: '25%' };
        if (pwd.length < 8)  return { label: 'Weak',      color: '#f4a261', width: '50%' };
        if (pwd.length < 12) return { label: 'Good',      color: '#2ec4b6', width: '75%' };
        return                      { label: 'Strong',    color: '#2ecc71', width: '100%' };
    };

    const strength = getStrength(form.newPassword);
    const hasChanges = isOAuth
        ? form.newPassword || form.confirmPassword          // ✅ oauth — only new fields
        : form.currentPassword || form.newPassword || form.confirmPassword;

    // ✅ show loading while checking user type
    if (isOAuth === null) return (
        <div className="cp-page">
            <div className="cp-card">
                <p style={{ textAlign: 'center', color: '#606060' }}>Loading...</p>
            </div>
        </div>
    );

    return (
        <div className="cp-page">
            <div className="cp-card">
                <button className="cp-back" onClick={() => navigate('/profile')}>
                    ← Back
                </button>

                <div className="cp-header">
                    <h1>{isOAuth ? 'Set Password' : 'Change Password'}</h1>
                    <p>
                        {isOAuth
                            ? 'You signed in with Google/Twitter. Set a password to also enable email login.'
                            : 'Make sure it\'s at least 6 characters'
                        }
                    </p>
                </div>

                {/* ✅ oauth notice */}
                {isOAuth && (
                    <div className="cp-oauth-notice">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        You are currently signed in via Google or Twitter. Current password is not required.
                    </div>
                )}

                {error   && <div className="cp-error">{error}</div>}
                {success && <div className="cp-success">{success}</div>}

                <div className="cp-form">
                    {/* ✅ only show current password for non-oauth users */}
                    {!isOAuth && (
                        <PasswordField
                            label="Current Password"
                            name="currentPassword"
                            value={form.currentPassword}
                            onChange={handleChange}
                            showPasswords={showPasswords}
                            setShowPasswords={setShowPasswords}
                            showKey="current"
                        />
                    )}

                    <PasswordField
                        label="New Password"
                        name="newPassword"
                        value={form.newPassword}
                        onChange={handleChange}
                        showPasswords={showPasswords}
                        setShowPasswords={setShowPasswords}
                        showKey="new"
                    />

                    {form.newPassword && (
                        <div className="cp-strength">
                            <div className="cp-strength-bar">
                                <div
                                    className="cp-strength-fill"
                                    style={{ width: strength.width, background: strength.color }}
                                />
                            </div>
                            <span style={{ color: strength.color }}>{strength.label}</span>
                        </div>
                    )}

                    <PasswordField
                        label="Confirm New Password"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        showPasswords={showPasswords}
                        setShowPasswords={setShowPasswords}
                        showKey="confirm"
                    />

                    {form.confirmPassword && (
                        <p className="cp-match" style={{
                            color: form.newPassword === form.confirmPassword ? '#2ecc71' : '#e63946'
                        }}>
                            {form.newPassword === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </p>
                    )}

                    <button
                        className="cp-btn-save"
                        onClick={handleSubmit}
                        disabled={loading || !hasChanges}
                    >
                        {loading ? 'Updating...' : isOAuth ? 'Set Password' : 'Update Password'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const PasswordField = ({ label, name, value, onChange, showPasswords, setShowPasswords, showKey }) => (
    <div className="cp-field">
        <label>{label}</label>
        <div className="cp-input-wrapper">
            <input
                type={showPasswords[showKey] ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                placeholder="••••••••"
                autoComplete="off"
            />
            <button
                type="button"
                className="cp-toggle-eye"
                onClick={() => setShowPasswords(p => ({ ...p, [showKey]: !p[showKey] }))}
            >
                {showPasswords[showKey] ? '🙈' : '👁️'}
            </button>
        </div>
    </div>
);