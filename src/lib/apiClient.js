import { setTokenCookie, clearTokenCookie } from '@/lib/authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';


let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('adminRefreshToken');

    if (!refreshToken) {
        throw new Error('No refresh token available.');
    }

    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
        // Refresh token is also expired — force logout
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        clearTokenCookie();
        window.location.href = '/';
        throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    localStorage.setItem('adminAccessToken', data.access);
    setTokenCookie(data.access);
    return data.access;
}

// ─── Core Request Function ───────────────────────────────────────────
async function makeRequest(endpoint, { method = 'GET', body, headers = {} } = {}, token) {
    const config = {
        method,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...headers,
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    return fetch(`${API_BASE_URL}${endpoint}`, config);
}

// ─── Parse & Throw on Error ──────────────────────────────────────────
function parseResponse(response, data) {
    if (!response.ok) {
        const message = typeof data === 'object'
            ? Object.entries(data).map(([k, v]) => `${k}: ${[].concat(v).join(', ')}`).join('\n')
            : data.detail || 'Something went wrong.';
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
}

// ─── Public API Client ───────────────────────────────────────────────
async function apiClient(endpoint, options = {}) {
    const token = localStorage.getItem('adminAccessToken');
    let response = await makeRequest(endpoint, options, token);

    // Handle 204 No Content (e.g. successful DELETE)
    if (response.status === 204) {
        return null;
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        const trimmed = responseText?.trim();
        const preview = trimmed && trimmed.length > 240 ? `${trimmed.slice(0, 240)}...` : trimmed;
        throw new Error(preview || 'Server returned a non-JSON response. Check the API URL.');
    }

    let data = await response.json();

    // ── Auto-refresh on 401 ──────────────────────────────────────────
    if (response.status === 401) {
        try {
            // Use lock so only one refresh happens at a time
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = refreshAccessToken();
            }
            const newToken = await refreshPromise;
            isRefreshing = false;
            refreshPromise = null;

            // Retry the original request with the fresh token
            response = await makeRequest(endpoint, options, newToken);
            const retryContentType = response.headers.get('content-type');
            if (!retryContentType || !retryContentType.includes('application/json')) {
                throw new Error('Server returned a non-JSON response on retry.');
            }
            data = await response.json();
        } catch (refreshError) {
            isRefreshing = false;
            refreshPromise = null;
            throw refreshError;
        }
    }

    return parseResponse(response, data);
}

export default apiClient;

