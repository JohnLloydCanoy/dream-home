import { jwtDecode } from "jwt-decode";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Set the access token cookie so Next.js middleware can read it.
 * - path=/ ensures it's sent on every route navigation.
 * - SameSite=Lax is the safe default for same-site navigations.
 * - Secure is set only in production (HTTPS).
 */
export function setTokenCookie(token) {
    if (typeof document === 'undefined') return;
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `adminAccessToken=${token}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

/**
 * Remove the access token cookie.
 */
export function clearTokenCookie() {
    if (typeof document === 'undefined') return;
    document.cookie = 'adminAccessToken=; path=/; Max-Age=0; SameSite=Lax';
}

export const loginAdmin = async (staffId, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: staffId,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Authentication failed. Please check your credentials.");
        }

        localStorage.setItem('adminAccessToken', data.access);
        localStorage.setItem('adminRefreshToken', data.refresh);

        // Set cookie for middleware RBAC enforcement
        setTokenCookie(data.access);

        const decoded = jwtDecode(data.access);
        return {
            access: data.access,
            refresh: data.refresh,
            role: decoded.role || 'ADMIN',
        };
    } catch (error) {
        throw new Error(error.message || "Failed to connect to the server.");
    }
};

export const logoutAdmin = () => {
    if (typeof window !== "undefined") {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        clearTokenCookie();
    }
};
