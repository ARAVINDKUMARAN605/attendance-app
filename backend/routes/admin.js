const express = require('express');
const bcrypt = require('bcryptjs');
const { all, run, toUser, toAttendance } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { wrap } = require('../middleware/wrap');

const router = express.Router();
router.use(authRequired, requireRole('admin'));

// Returns an error message if the email / roll number is already used by another user
async function findConflict(email, rollNo, exceptId = 0) {
  const e = await all('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?', [email, exceptId]);
  if (e.length) return 'Email already exists';
  const r = await all(`SELECT id FROM users WHERE role = 'student' AND roll_no = ? AND id <> ?`, [rollNo, exceptId]);
  if (r.length) return 'Roll number already exists';
  return null;
}

// List all students
router.get(
  '/students',
  wrap(async (req, res) => {
    const rows = await all(`SELECT * FROM users WHERE role = 'student' ORDER BY roll_no`);
    res.json(rows.map(toUser));
  })
);

// Add a student
router.post(
  '/students',
  wrap(async (req, res) => {
    const { name, email, password, rollNo, department, phone } = req.body || {};
    if (!name || !email || !password || !rollNo) {
      return res.status(400).json({ message: 'Name, email, password and roll number are required' });
    }
    const conflict = await findConflict(String(email).trim(), String(rollNo).trim());
    if (conflict) return res.status(409).json({ message: conflict });

    const result = await run(
      `INSERT INTO users (role, name, email, password_hash, roll_no, department, phone)
       VALUES ('student', ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        String(email).trim(),
        bcrypt.hashSync(String(password), 10),
        String(rollNo).trim(),
        department || '',
        phone || '',
      ]
    );
    const rows = await all('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(toUser(rows[0]));
  })
);

// Edit a student's details and/or reset their password.
// "password" is optional: leave it out (or empty) to keep the current one.
router.put(
  '/students/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { name, email, password, rollNo, department, phone } = req.body || {};
    const cur = (await all(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [id]))[0];
    if (!cur) return res.status(404).json({ message: 'Student not found' });

    const newName = name !== undefined ? String(name).trim() : cur.name;
    const newEmail = email !== undefined ? String(email).trim() : cur.email;
    const newRoll = rollNo !== undefined ? String(rollNo).trim() : cur.roll_no;
    if (!newName || !newEmail || !newRoll) {
      return res.status(400).json({ message: 'Name, email and roll number are required' });
    }
    if (password && String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const conflict = await findConflict(newEmail, newRoll, id);
    if (conflict) return res.status(409).json({ message: conflict });

    const hash = password ? bcrypt.hashSync(String(password), 10) : cur.password_hash;
    await run(
      `UPDATE users SET name = ?, email = ?, roll_no = ?, department = ?, phone = ?, password_hash = ? WHERE id = ?`,
      [
        newName,
        newEmail,
        newRoll,
        department !== undefined ? department : cur.department,
        phone !== undefined ? phone : cur.phone,
        hash,
        id,
      ]
    );
    const rows = await all('SELECT * FROM users WHERE id = ?', [id]);
    res.json(toUser(rows[0]));
  })
);

// Delete a student (and their attendance)
router.delete(
  '/students/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const result = await run(`DELETE FROM users WHERE id = ? AND role = 'student'`, [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Student not found' });
    await run('DELETE FROM attendance WHERE student_id = ?', [id]);
    res.json({ message: 'Student deleted' });
  })
);

// Attendance records with arrival / departure times
// Optional filters: ?date=YYYY-MM-DD  ?studentId=2
router.get(
  '/attendance',
  wrap(async (req, res) => {
    const { date, studentId } = req.query;
    const where = [];
    const params = [];
    if (date) {
      where.push('a.date = ?');
      params.push(date);
    }
    if (studentId) {
      where.push('a.student_id = ?');
      params.push(Number(studentId));
    }
    const rows = await all(
      `SELECT a.*, u.name AS student_name, u.roll_no, u.department
       FROM attendance a JOIN users u ON u.id = a.student_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY a.date DESC, a.arrival DESC`,
      params
    );
    res.json(
      rows.map((r) => ({
        ...toAttendance(r),
        studentName: r.student_name,
        rollNo: r.roll_no,
        department: r.department,
      }))
    );
  })
);

module.exports = router;
