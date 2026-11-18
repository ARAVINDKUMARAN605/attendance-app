# Attendance System (React + Node.js)

Two roles:

- **Admin** – sees every student's attendance with arrival and departure times (filter by date / student), and can add or delete students.
- **Student** – sees only their own details and attendance history, and can mark arrival / departure for today.

## Structure

```
attendance-app/
├── backend/    Node.js + Express API (JWT login, JSON-file storage)
└── frontend/   React (Vite) app
```

## Run in VS Code

You need Node.js 18+ installed. Open the `attendance-app` folder in VS Code, then open **two terminals** (Terminal > New Terminal).

**Terminal 1 – backend**

```bash
cd backend
npm install
npm start
```

Runs on http://localhost:5000

**Terminal 2 – frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo logins

| Role    | Email               | Password   |
|---------|---------------------|------------|
| Admin   | admin@school.com    | admin123   |
| Student | student@school.com  | student123 |

Log in as the student, click **Mark arrival** / **Mark departure**, then log in as admin to see the times.

## API summary

| Method | Route                    | Who     |
|--------|--------------------------|---------|
| POST   | /api/auth/login          | all     |
| GET    | /api/auth/me             | logged in |
| GET    | /api/admin/students      | admin   |
| POST   | /api/admin/students      | admin   |
| PUT    | /api/admin/students/:id  | admin (edit details / reset password) |
| DELETE | /api/admin/students/:id  | admin   |
| GET    | /api/admin/attendance    | admin (?date=YYYY-MM-DD&studentId=) |
| GET    | /api/student/me          | student |
| GET    | /api/student/attendance  | student |
| POST   | /api/student/check-in    | student |
| POST   | /api/student/check-out   | student |

## Notes

- Data is saved in `backend/data.json` (created on first run). Delete it to reset.
- Set a real secret before deploying: `JWT_SECRET=your-secret npm start`.
- To use MongoDB or MySQL later, only `backend/db.js` and the route files need changing.
