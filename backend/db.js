// MySQL database (works with TiDB Cloud, PlanetScale-style MySQL, local MySQL...).
// Option A: set DATABASE_URL = mysql://USER:PASSWORD@HOST:4000/DBNAME
// Option B: set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME separately
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const url = process.env.DATABASE_URL;
if (!url && !process.env.DB_HOST) {
  console.error('Database is not configured. Set DATABASE_URL (see README).');
  process.exit(1);
}

const host = url ? new URL(url).hostname : process.env.DB_HOST;
const isLocal = /^(localhost|127\.0\.0\.1)$/.test(host);

const common = {
  waitForConnections: true,
  connectionLimit: 5,
  timezone: 'Z', // keep every timestamp in UTC
  ssl: isLocal ? undefined : { minVersion: 'TLSv1.2' }, // TiDB Cloud requires TLS
};
const pool = url
  ? mysql.createPool({ uri: url, ...common })
  : mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 4000),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'test',
      ...common,
    });

// SELECT -> array of rows
async function all(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
// INSERT / UPDATE / DELETE -> { insertId, affectedRows }
async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result;
}

async function init() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      role          VARCHAR(10)  NOT NULL,
      name          VARCHAR(200) NOT NULL,
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(100) NOT NULL,
      roll_no       VARCHAR(50)  NULL,
      department    VARCHAR(200) NOT NULL DEFAULT '',
      phone         VARCHAR(50)  NOT NULL DEFAULT '',
      UNIQUE KEY users_email_uq (email),
      UNIQUE KEY users_roll_uq (roll_no)
    )`);
  await run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      date       VARCHAR(10) NOT NULL,
      arrival    DATETIME(3) NOT NULL,
      departure  DATETIME(3) NULL,
      UNIQUE KEY att_student_date_uq (student_id, date)
    )`);

  const rows = await all('SELECT COUNT(*) AS n FROM users');
  if (Number(rows[0].n) === 0 && !process.env.SKIP_SEED) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    await run(`INSERT INTO users (role, name, email, password_hash) VALUES ('admin', 'Admin', ?, ?)`, [
      adminEmail,
      bcrypt.hashSync(adminPass, 10),
    ]);
    if (process.env.SEED_DEMO_STUDENT !== 'false') {
      await run(
        `INSERT INTO users (role, name, email, password_hash, roll_no, department, phone)
         VALUES ('student', 'Arun Kumar', 'student@school.com', ?, 'S001', 'Computer Science', '9876543210')`,
        [bcrypt.hashSync(process.env.STUDENT_PASSWORD || 'student123', 10)]
      );
    }
    console.log(`Created default admin: ${adminEmail}`);
  }
}

// Row -> the JSON shape the frontend uses (never includes the password hash)
function toUser(r) {
  return {
    id: r.id,
    role: r.role,
    name: r.name,
    email: r.email,
    rollNo: r.roll_no,
    department: r.department,
    phone: r.phone,
  };
}

function toAttendance(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    date: r.date,
    arrival: r.arrival ? new Date(r.arrival).toISOString() : null,
    departure: r.departure ? new Date(r.departure).toISOString() : null,
  };
}

// Today's date (YYYY-MM-DD) in the school's timezone (servers run in UTC).
const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
function todayStr(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

module.exports = { all, run, init, toUser, toAttendance, todayStr };
