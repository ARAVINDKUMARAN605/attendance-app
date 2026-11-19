const express = require('express');
const bcrypt = require('bcryptjs');
const { all, toUser } = require('../db');
const { signToken, authRequired } = require('../middleware/auth');
const { wrap } = require('../middleware/wrap');

const router = express.Router();

router.post(
  '/login',
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const rows = await all('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [String(email).trim()]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(user), user: toUser(user) });
  })
);

router.get(
  '/me',
  authRequired,
  wrap(async (req, res) => {
    const rows = await all('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(toUser(rows[0]));
  })
);

module.exports = router;
