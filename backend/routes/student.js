const express = require('express');
const { all, run, toUser, toAttendance, todayStr } = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { wrap } = require('../middleware/wrap');

const router = express.Router();
router.use(authRequired, requireRole('student'));

// Own profile
router.get(
  '/me',
  wrap(async (req, res) => {
    const rows = await all('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Student not found' });
    res.json(toUser(rows[0]));
  })
);

// Own attendance history (newest first)
router.get(
  '/attendance',
  wrap(async (req, res) => {
    const rows = await all('SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC', [req.auth.id]);
    res.json(rows.map(toAttendance));
  })
);

// Mark arrival
router.post(
  '/check-in',
  wrap(async (req, res) => {
    let result;
    try {
      result = await run('INSERT INTO attendance (student_id, date, arrival) VALUES (?, ?, UTC_TIMESTAMP(3))', [
        req.auth.id,
        todayStr(),
      ]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'You have already checked in today' });
      }
      throw err;
    }
    const rows = await all('SELECT * FROM attendance WHERE id = ?', [result.insertId]);
    res.status(201).json(toAttendance(rows[0]));
  })
);

// Mark departure
router.post(
  '/check-out',
  wrap(async (req, res) => {
    const today = todayStr();
    const result = await run(
      'UPDATE attendance SET departure = UTC_TIMESTAMP(3) WHERE student_id = ? AND date = ? AND departure IS NULL',
      [req.auth.id, today]
    );
    const rows = await all('SELECT * FROM attendance WHERE student_id = ? AND date = ?', [req.auth.id, today]);
    if (!rows[0]) return res.status(400).json({ message: 'You have not checked in today' });
    if (!result.affectedRows) return res.status(400).json({ message: 'You have already checked out today' });
    res.json(toAttendance(rows[0]));
  })
);

module.exports = router;
