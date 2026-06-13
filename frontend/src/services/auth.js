// services/auth.js
class AuthService {
    static async register(formData) {
        const response = await fetch('http://localhost:5001/api/auth/register', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return { success: true, user: data.user };
        }
        return { success: false, message: data.error };
    }

    static async login(email, password) {
        const response = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return { success: true, user: data.user };
        }
        return { success: false, message: data.error };
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    static getUser() {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch {
            return null;
        }
    }

    static isLoggedIn() {
        return !!localStorage.getItem('token');
    }
}

export default AuthService;