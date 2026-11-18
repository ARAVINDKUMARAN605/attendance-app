import { useCallback, useEffect, useState } from 'react';
import { api, fmtDuration, fmtTime, todayStr } from '../api';
import { useAuth } from '../AuthContext.jsx';

export default function StudentDashboard() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([api('/student/me'), api('/student/attendance')]);
      setProfile(p);
      setRecords(a);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = records.find((r) => r.date === todayStr());

  async function mark(kind) {
    setError('');
    setMessage('');
    try {
      await api(`/student/${kind}`, { method: 'POST' });
      setMessage(kind === 'check-in' ? 'Arrival recorded' : 'Departure recorded');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!profile) return <p className="center">{error || 'Loading...'}</p>;

  return (
    <div className="page">
      <header className="topbar">
        <h2>Student Dashboard</h2>
        <div className="topbar-right">
          <span>{profile.name}</span>
          <button className="secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="card">
        <h3>My details</h3>
        <div className="details">
          <div><span className="muted">Name</span><strong>{profile.name}</strong></div>
          <div><span className="muted">Roll No</span><strong>{profile.rollNo}</strong></div>
          <div><span className="muted">Email</span><strong>{profile.email}</strong></div>
          <div><span className="muted">Department</span><strong>{profile.department || '—'}</strong></div>
          <div><span className="muted">Phone</span><strong>{profile.phone || '—'}</strong></div>
        </div>
      </div>

      <div className="card">
        <h3>Today ({todayStr()})</h3>
        <div className="today">
          <div><span className="muted">Arrival</span><strong>{fmtTime(today?.arrival)}</strong></div>
          <div><span className="muted">Departure</span><strong>{fmtTime(today?.departure)}</strong></div>
          <button onClick={() => mark('check-in')} disabled={!!today}>Mark arrival</button>
          <button className="secondary" onClick={() => mark('check-out')} disabled={!today || !!today?.departure}>
            Mark departure
          </button>
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>My attendance history</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Arrival</th>
              <th>Departure</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan="4" className="muted center">No attendance yet</td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{fmtTime(r.arrival)}</td>
                <td>{fmtTime(r.departure)}</td>
                <td>{fmtDuration(r.arrival, r.departure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
