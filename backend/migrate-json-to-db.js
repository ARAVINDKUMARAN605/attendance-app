// One-time: copy everything from backend/data.json into the MySQL / TiDB database.
// Usage (PowerShell):  $env:DATABASE_URL="mysql://..."; node migrate-json-to-db.js
// Only runs on an EMPTY database (stops if users already exist).
const fs = require('fs');
const path = require('path');
const { all, run, init } = require('./db');

(async () => {
  const file = path.join(__dirname, 'data.json');
  if (!fs.existsSync(file)) {
    console.log('No data.json found, nothing to migrate.');
    process.exit(0);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  process.env.SKIP_SEED = '1'; // import the real accounts instead of creating defaults
  await init();
  const rows = await all('SELECT COUNT(*) AS n FROM users');
  if (Number(rows[0].n) > 0) {
    console.log('Database already has users. Migration skipped to avoid duplicates.');
    process.exit(0);
  }

  for (const u of data.users) {
    await run(
      `INSERT INTO users (id, role, name, email, password_hash, roll_no, department, phone) VALUES (?,?,?,?,?,?,?,?)`,
      [u.id, u.role, u.name, u.email, u.passwordHash, u.rollNo || null, u.department || '', u.phone || '']
    );
  }
  for (const a of data.attendance) {
    await run(`INSERT INTO attendance (id, student_id, date, arrival, departure) VALUES (?,?,?,?,?)`, [
      a.id,
      a.studentId,
      a.date,
      new Date(a.arrival),
      a.departure ? new Date(a.departure) : null,
    ]);
  }
  // Make auto-numbering continue after the imported ids (best effort)
  const nextUser = Math.max(0, ...data.users.map((u) => u.id)) + 1;
  const nextAtt = Math.max(0, ...data.attendance.map((a) => a.id)) + 1;
  try { await run(`ALTER TABLE users AUTO_INCREMENT = ${nextUser}`); } catch (e) { /* ignore */ }
  try { await run(`ALTER TABLE attendance AUTO_INCREMENT = ${nextAtt}`); } catch (e) { /* ignore */ }

  console.log(`Migrated ${data.users.length} users and ${data.attendance.length} attendance records.`);
  process.exit(0);
})().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
