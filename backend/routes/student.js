const express = require('express');
const { load, save, todayStr } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRole('student'));

// Own profile
router.get('/me', (req, res) => {
  const user = load().users.find((u) => u.id === req.auth.id);
  if (!user) return res.status(404).json({ message: 'Student not found' });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

// Own attendance history (newest first)
router.get('/attendance', (req, res) => {
  const records = load()
    .attendance.filter((a) => a.studentId === req.auth.id)
    .sort((x, y) => (x.date < y.date ? 1 : -1));
  res.json(records);
});

// Mark arrival
router.post('/check-in', (req, res) => {
  const db = load();
  const today = todayStr();
  const existing = db.attendance.find((a) => a.studentId === req.auth.id && a.date === today);
  if (existing) return res.status(400).json({ message: 'You have already checked in today' });

  const record = {
    id: db.nextId++,
    studentId: req.auth.id,
    date: today,
    arrival: new Date().toISOString(),
    departure: null,
  };
  db.attendance.push(record);
  save(db);
  res.status(201).json(record);
});

// Mark departure
router.post('/check-out', (req, res) => {
  const db = load();
  const today = todayStr();
  const record = db.attendance.find((a) => a.studentId === req.auth.id && a.date === today);
  if (!record) return res.status(400).json({ message: 'You have not checked in today' });
  if (record.departure) return res.status(400).json({ message: 'You have already checked out today' });

  record.departure = new Date().toISOString();
  save(db);
  res.json(record);
});

module.exports = router;
