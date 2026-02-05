# Database setup (PostgreSQL)

## 1. Start PostgreSQL (if needed)

**macOS (Homebrew):**
```bash
brew services start postgresql@14
# or
brew services start postgresql
```

**Or run once in foreground:**
```bash
pg_ctl -D /opt/homebrew/var/postgres start
```

Check that it’s running:
```bash
psql -l
```

## 2. Create the database

Create a database named `hem_ekonomi`:

```bash
createdb hem_ekonomi
```

If you use a specific PostgreSQL user (e.g. `postgres`):

```bash
createdb -U postgres hem_ekonomi
```

Or from the `psql` prompt:

```bash
psql -U postgres
CREATE DATABASE hem_ekonomi;
\q
```

## 3. Configure `server/.env`

Edit `server/.env` and set `DATABASE_URL` to match your setup:

- **Default Mac user (no password):**
  ```env
  DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/hem_ekonomi"
  ```
  Replace `YOUR_MAC_USERNAME` with your macOS username (e.g. `andreascronstrom`).

- **User and password:**
  ```env
  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hem_ekonomi"
  ```

- **Custom user:**
  ```env
  DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/hem_ekonomi"
  ```

Also set a long random string for `JWT_SECRET` (at least 32 characters).

## 4. Create tables (Prisma)

From the **project root**:

```bash
npm run db:push
```

This creates the `User` and `MonthlyExpense` tables in `hem_ekonomi`.

## Troubleshooting

- **“connection refused”** → PostgreSQL is not running. Start it (step 1).
- **“role does not exist”** → Use the correct username in `DATABASE_URL` (often your Mac username or `postgres`).
- **“password authentication failed”** → Set the correct password in `DATABASE_URL` or use a user that has trust auth for local connections.
