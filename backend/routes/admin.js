const express = require('express');
const bcrypt = require('bcryptjs');
const { load, save } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRole('admin'));

// List all students
router.get('/students', (req, res) => {
  const students = load()
    .users.filter((u) => u.role === 'student')
    .map(({ passwordHash, ...s }) => s);
  res.json(students);
});

// Add a student
router.post('/students', (req, res) => {
  const { name, email, password, rollNo, department, phone } = req.body || {};
  if (!name || !email || !password || !rollNo) {
    return res.status(400).json({ message: 'Name, email, password and roll number are required' });
  }
  const db = load();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: 'Email already exists' });
  }
  if (db.users.some((u) => u.role === 'student' && u.rollNo === rollNo)) {
    return res.status(409).json({ message: 'Roll number already exists' });
  }
  const student = {
    id: db.nextId++,
    role: 'student',
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    rollNo,
    department: department || '',
    phone: phone || '',
  };
  db.users.push(student);
  save(db);
  const { passwordHash, ...safe } = student;
  res.status(201).json(safe);
});

// Edit a student's details and/or reset their password.
// "password" is optional: leave it out (or empty) to keep the current one.
router.put('/students/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, email, password, rollNo, department, phone } = req.body || {};
  const db = load();
  const student = db.users.find((u) => u.id === id && u.role === 'student');
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const newName = name !== undefined ? String(name).trim() : student.name;
  const newEmail = email !== undefined ? String(email).trim() : student.email;
  const newRoll = rollNo !== undefined ? String(rollNo).trim() : student.rollNo;
  if (!newName || !newEmail || !newRoll) {
    return res.status(400).json({ message: 'Name, email and roll number are required' });
  }
  if (db.users.some((u) => u.id !== id && u.email.toLowerCase() === newEmail.toLowerCase())) {
    return res.status(409).json({ message: 'Email already exists' });
  }
  if (db.users.some((u) => u.id !== id && u.role === 'student' && u.rollNo === newRoll)) {
    return res.status(409).json({ message: 'Roll number already exists' });
  }
  if (password && String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  student.name = newName;
  student.email = newEmail;
  student.rollNo = newRoll;
  if (department !== undefined) student.department = department;
  if (phone !== undefined) student.phone = phone;
  if (password) student.passwordHash = bcrypt.hashSync(String(password), 10);

  save(db);
  const { passwordHash, ...safe } = student;
  res.json(safe);
});

// Delete a student (and their attendance)
router.delete('/students/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = load();
  const idx = db.users.findIndex((u) => u.id === id && u.role === 'student');
  if (idx === -1) return res.status(404).json({ message: 'Student not found' });
  db.users.splice(idx, 1);
  db.attendance = db.attendance.filter((a) => a.studentId !== id);
  save(db);
  res.json({ message: 'Student deleted' });
});

// Attendance records with arrival / departure times
// Optional filters: ?date=YYYY-MM-DD  ?studentId=2
router.get('/attendance', (req, res) => {
  const { date, studentId } = req.query;
  const db = load();
  const students = new Map(db.users.filter((u) => u.role === 'student').map((s) => [s.id, s]));

  let records = db.attendance;
  if (date) records = records.filter((a) => a.date === date);
  if (studentId) records = records.filter((a) => a.studentId === Number(studentId));

  const result = records
    .map((a) => {
      const s = students.get(a.studentId);
      return {
        ...a,
        studentName: s ? s.name : 'Unknown',
        rollNo: s ? s.rollNo : '-',
        department: s ? s.department : '-',
      };
    })
    .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : x.arrival < y.arrival ? 1 : -1));

  res.json(result);
});

module.exports = router;
