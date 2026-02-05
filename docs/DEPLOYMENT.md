# Deploying Hem Ekonomi

## Frontend on Vercel

The React app is set up to deploy on [Vercel](https://vercel.com).

### 1. Connect the repo

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. **Add New** → **Project** and import `acronstrom/hem_ekonomi` (or your fork).
3. Leave **Root Directory** as the repo root (`.`). The repo’s `vercel.json` defines build/output from `client/`.

### 2. Environment variable

Add a variable for the backend URL (needed when the API is not on the same host):

- **Name:** `VITE_API_ORIGIN`
- **Value:** Your API base URL, e.g. `https://your-api.railway.app` or `https://your-api.onrender.com`  
  No trailing slash.

If you leave this unset, the app will call `/api` on the same origin (works only if you proxy API elsewhere to the same domain).

### 3. Deploy

Click **Deploy**. Vercel will run `cd client && npm install` and `npm run build`, then serve `client/dist` with SPA rewrites.

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
