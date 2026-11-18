import { useCallback, useEffect, useState } from 'react';
import { api, fmtDuration, fmtTime, todayStr } from '../api';
import { useAuth } from '../AuthContext.jsx';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('attendance');

  return (
    <div className="page">
      <header className="topbar">
        <h2>Admin Dashboard</h2>
        <div className="topbar-right">
          <span>{user.name}</span>
          <button className="secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'attendance' ? 'active' : ''} onClick={() => setTab('attendance')}>
          Attendance
        </button>
        <button className={tab === 'students' ? 'active' : ''} onClick={() => setTab('students')}>
          Students
        </button>
      </nav>

      {tab === 'attendance' ? <AttendanceTab /> : <StudentsTab />}
    </div>
  );
}

function AttendanceTab() {
  const [date, setDate] = useState(todayStr());
  const [studentId, setStudentId] = useState('');
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/students').then(setStudents).catch((e) => setError(e.message));
  }, []);

  const loadRecords = useCallback(() => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (studentId) params.set('studentId', studentId);
    api(`/admin/attendance?${params}`).then(setRecords).catch((e) => setError(e.message));
  }, [date, studentId]);

  useEffect(loadRecords, [loadRecords]);

  return (
    <div className="card">
      <div className="filters">
        <div>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label>Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.rollNo})
              </option>
            ))}
          </select>
        </div>
        <button className="secondary" onClick={() => setDate('')}>All dates</button>
        <button className="secondary" onClick={loadRecords}>Refresh</button>
      </div>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>Department</th>
            <th>Arrival</th>
            <th>Departure</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr>
              <td colSpan="8" className="muted center">No attendance records found</td>
            </tr>
          )}
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.date}</td>
              <td>{r.rollNo}</td>
              <td>{r.studentName}</td>
              <td>{r.department}</td>
              <td>{fmtTime(r.arrival)}</td>
              <td>{fmtTime(r.departure)}</td>
              <td>{fmtDuration(r.arrival, r.departure)}</td>
              <td>
                <span className={`badge ${r.departure ? 'done' : 'in'}`}>
                  {r.departure ? 'Left' : 'Present'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentsTab() {
  const empty = { name: '', email: '', password: '', rollNo: '', department: '', phone: '' };
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => api('/admin/students').then(setStudents).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/admin/students', { method: 'POST', body: form });
      setForm(empty);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(s) {
    setError('');
    setEditId(s.id);
    setEditForm({
      name: s.name,
      email: s.email,
      rollNo: s.rollNo,
      department: s.department || '',
      phone: s.phone || '',
      password: '',
    });
  }

  const setEdit = (k) => (e) => setEditForm({ ...editForm, [k]: e.target.value });

  async function saveEdit(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { ...editForm };
      if (!body.password) delete body.password; // blank = keep current password
      await api(`/admin/students/${editId}`, { method: 'PUT', body });
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete ${s.name} and all their attendance?`)) return;
    try {
      await api(`/admin/students/${s.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <form className="card grid-form" onSubmit={add}>
        <h3>Add student</h3>
        <input placeholder="Full name" value={form.name} onChange={set('name')} required />
        <input placeholder="Roll number" value={form.rollNo} onChange={set('rollNo')} required />
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
        <input placeholder="Department" value={form.department} onChange={set('department')} />
        <input placeholder="Phone" value={form.phone} onChange={set('phone')} />
        <button type="submit">Add student</button>
        {error && <p className="error">{error}</p>}
      </form>

      {editId !== null && (
        <form className="card grid-form" onSubmit={saveEdit}>
          <h3>Edit student</h3>
          <input placeholder="Full name" value={editForm.name} onChange={setEdit('name')} required />
          <input placeholder="Roll number" value={editForm.rollNo} onChange={setEdit('rollNo')} required />
          <input type="email" placeholder="Email" value={editForm.email} onChange={setEdit('email')} required />
          <input
            type="text"
            placeholder="New password (leave blank to keep current)"
            value={editForm.password}
            onChange={setEdit('password')}
            autoComplete="new-password"
            minLength={6}
          />
          <input placeholder="Department" value={editForm.department} onChange={setEdit('department')} />
          <input placeholder="Phone" value={editForm.phone} onChange={setEdit('phone')} />
          <button type="submit">Save changes</button>
          <button type="button" className="secondary" onClick={() => setEditId(null)}>Cancel</button>
          {error && <p className="error">{error}</p>}
        </form>
      )}

      <div className="card">
        <h3>All students ({students.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.rollNo}</td>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.department}</td>
                <td>{s.phone}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="secondary" onClick={() => startEdit(s)}>Edit</button>{' '}
                  <button className="danger" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
