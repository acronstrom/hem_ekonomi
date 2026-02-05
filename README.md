# Hem Ekonomi

A home economy application for tracking monthly expenses. Built with React (frontend), Node.js (backend), and PostgreSQL (database).

## Features

- **Secure authentication**: Register and login with email/password. Passwords are hashed with bcrypt; sessions use JWT in httpOnly cookies.
- **Monthly expenses**: Define expenses per month with category, amount, and optional description. Edit and delete entries.
- **Portal**: View and manage expenses by month/year.

## Prerequisites

- Node.js 18+
- PostgreSQL

## Setup

### 1. Database

Create a PostgreSQL database:

```bash
createdb hem_ekonomi
```

### 2. Environment

From the project root:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set:

- `DATABASE_URL` – PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/hem_ekonomi`)
- `JWT_SECRET` – A long random string (at least 32 characters) for signing JWTs

### 3. Install and run

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

Generate Prisma client and push the schema to the database:

```bash
npm run db:generate
npm run db:push
```

Start backend and frontend:

```bash
npm run dev
```

- Backend: http://localhost:3001  
- Frontend: http://localhost:5173  

Or run them separately:

```bash
npm run dev:server   # backend only
npm run dev:client   # frontend only (ensure backend is running)
```

## API

- `POST /api/auth/register` – Register (email, password, optional name)
- `POST /api/auth/login` – Login (email, password)
- `POST /api/auth/logout` – Logout
- `GET /api/auth/me` – Current user (requires auth)
- `GET /api/expenses?month=&year=` – List expenses (requires auth)
- `POST /api/expenses` – Create expense (requires auth)
- `PATCH /api/expenses/:id` – Update expense (requires auth)
- `DELETE /api/expenses/:id` – Delete expense (requires auth)

## Tech stack

- **Frontend**: React 18, React Router, Vite
- **Backend**: Express, Prisma, bcryptjs, jsonwebtoken, express-validator, helmet, cors
- **Database**: PostgreSQL with Prisma ORM
