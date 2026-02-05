# Deploying Hem Ekonomi

## Full stack on Vercel (frontend + API)

The repo is set up so both the React app and the Express API run on the same Vercel project.

### 1. Connect the repo

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. **Add New** → **Project** and import your repo.
3. Leave **Root Directory** as the repo root (`.`). The repo’s `vercel.json` defines the build.

### 2. Required environment variables

In the project **Settings → Environment Variables** add:

| Variable        | Required | Description |
|----------------|----------|-------------|
| `DATABASE_URL` | Yes      | Postgres connection string. Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres): Storage → Create Database → Postgres, then connect the DB to the project so this is set automatically. |
| `JWT_SECRET`   | Yes      | A long random string (e.g. 32+ characters) for signing auth tokens. If missing, registration/login will return “Server misconfiguration (JWT_SECRET)”. |
| `CLIENT_ORIGIN`| No       | Comma-separated list of allowed origins, e.g. `https://hemekonomi.vercel.app`. If unset in production, the same-origin request is allowed so your Vercel frontend works. Set it if you use a custom domain or another frontend. |
| `VITE_API_ORIGIN` | No    | Leave unset when frontend and API are on the same Vercel domain; the app will call `/api` on the same origin. |

### 3. Database and schema

After adding Vercel Postgres and setting `DATABASE_URL`, run the schema once from your machine:

```bash
cd server
DATABASE_URL="<paste your Postgres URL from Vercel>" npx prisma db push
```

### 4. Deploy

Click **Deploy**. The build installs client and server deps, runs Prisma generate, and builds the client. The API is served under `/api/*` as a serverless function.

---

## Backend (API + database)

The API is a Node/Express app with PostgreSQL and Prisma. Vercel is aimed at frontend/serverless, so the backend is usually run on a separate host.

### Option A: Railway

1. Create a project at [railway.app](https://railway.app).
2. Add **PostgreSQL** and note the `DATABASE_URL`.
3. Add a **Service** from your repo; set **Root Directory** to `server` (or deploy only the `server/` folder).
4. Set environment variables:
   - `DATABASE_URL` (from the PostgreSQL service)
   - `JWT_SECRET` (long random string)
   - `CLIENT_ORIGIN` = your Vercel URL, e.g. `https://hem-ekonomi.vercel.app`
5. Deploy. Railway gives you a URL like `https://your-app.railway.app`.
6. Use that URL as `VITE_API_ORIGIN` in the Vercel project (step 2 above).

### Option B: Render

1. At [render.com](https://render.com), create a **Web Service** from your repo.
2. Set **Root Directory** to `server`.
3. Build: `npm install && npx prisma generate`
4. Start: `node src/index.js` or `npm start` (if you add a start script).
5. Add a **PostgreSQL** database and set `DATABASE_URL`.
6. Set `JWT_SECRET` and `CLIENT_ORIGIN` (your Vercel URL).
7. Use the Render service URL as `VITE_API_ORIGIN` in Vercel.

### After first backend deploy

Run migrations (or push schema) against the production DB:

```bash
cd server
DATABASE_URL="your-production-url" npx prisma db push
```

---

## Summary

| Part        | Where   | Notes                                      |
|------------|---------|--------------------------------------------|
| Frontend   | Vercel  | Connect repo, set `VITE_API_ORIGIN`        |
| API + Node | Railway / Render / etc. | Needs PostgreSQL, `JWT_SECRET`, `CLIENT_ORIGIN` |
| Database   | Same as API (e.g. Railway Postgres, Render Postgres) | Run `prisma db push` once |

Then set the backend URL in Vercel as `VITE_API_ORIGIN` so the frontend can call your API.
