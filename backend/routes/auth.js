const express = require('express');
const bcrypt = require('bcryptjs');
const { load } = require('../db');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const db = load();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const user = load().users.find((u) => u.id === req.auth.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(publicUser(user));
});

module.exports = router;
