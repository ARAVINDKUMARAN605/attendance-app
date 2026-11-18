// Simple JSON-file database (no external DB needed).
// Data is stored in backend/data.json and created automatically on first run.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const FILE = path.join(__dirname, 'data.json');

function seed() {
  const now = Date.now();
  return {
    users: [
      {
        id: 1,
        role: 'admin',
        name: 'Admin',
        email: 'admin@school.com',
        passwordHash: bcrypt.hashSync('admin123', 10),
      },
      {
        id: 2,
        role: 'student',
        name: 'Arun Kumar',
        email: 'student@school.com',
        passwordHash: bcrypt.hashSync('student123', 10),
        rollNo: 'S001',
        department: 'Computer Science',
        phone: '9876543210',
      },
    ],
    attendance: [],
    nextId: 3,
    createdAt: now,
  };
}

function load() {
  if (!fs.existsSync(FILE)) {
    const initial = seed();
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(db) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// Local date as YYYY-MM-DD
function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = { load, save, todayStr };
