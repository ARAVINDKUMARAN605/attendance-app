// Small fetch wrapper that attaches the JWT token automatically.
// In production set VITE_API_URL to your backend URL (e.g. https://my-api.onrender.com).
// Locally it is empty, so requests go through the Vite proxy to localhost:5000.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDuration = (a, d) => {
  if (!a || !d) return '—';
  const mins = Math.round((new Date(d) - new Date(a)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
