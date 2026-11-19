const express = require('express');
const cors = require('cors');

const { init } = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');

const app = express();
// Set CORS_ORIGIN to your frontend URL(s), comma separated
// e.g. https://my-app.vercel.app,https://my-app.netlify.app  (unset = allow all)
const origins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : undefined));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Any error inside a route -> clean JSON instead of a crash
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email or roll number already exists' });
  res.status(500).json({ message: 'Server error, please try again' });
});

const PORT = process.env.PORT || 5000;
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not connect to the database:', err.message);
    process.exit(1);
  });
