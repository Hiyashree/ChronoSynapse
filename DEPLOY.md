# Deploy ChronoSynapse to GitHub + Render

This guide gets ChronoSynapse online with a **cloud database** (no localhost required for users).

## Recommended setup

| Piece | Service | Why |
|-------|---------|-----|
| Code | **GitHub** | Version control + auto-deploy to Render |
| App (frontend + API) | **Render Web Service** | One URL serves the website and `/api` |
| Database | **Render PostgreSQL** | Persistent cloud SQL (free tier available) |

> **Do not use SQLite on Render** — the free web service disk is temporary and data is lost on redeploy.

---

## Part 1 — Push code to GitHub

### 1. Check what will be committed

```bash
cd ChronoSynapse
git status
```

Make sure these are **NOT** in the commit:
- `backend/.env` (secrets)
- `backend/data/*.db` (local database)

These **should** be committed:
- `backend/.env.example`
- `render.yaml`
- `package.json` (root)
- All source files

### 2. Stage and commit

```bash
git add .
git commit -m "Prepare ChronoSynapse for Render deployment with cloud PostgreSQL"
```

### 3. Push to GitHub

```bash
git push origin main
```

If the repo is new:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ChronoSynapse.git
git branch -M main
git push -u origin main
```

---

## Part 2 — Deploy on Render (app + PostgreSQL)

### Option A — One-click Blueprint (easiest)

1. Go to [render.com](https://render.com) and sign up (GitHub login works).
2. Click **New → Blueprint**.
3. Connect your **ChronoSynapse** GitHub repo.
4. Render reads `render.yaml` and creates:
   - Web service `chronosynapse`
   - PostgreSQL database `chronosynapse-db`
5. Click **Apply**.
6. Wait for the deploy to finish (5–10 minutes first time).

Your live URL will look like:

```
https://chronosynapse.onrender.com
```

Test it:

```
https://chronosynapse.onrender.com/api/test
```

You should see `"status":"ok"` and `"database":"connected"`.

---

### Option B — Manual setup

#### Step 1: Create PostgreSQL database

1. Render Dashboard → **New → PostgreSQL**
2. Name: `chronosynapse-db`
3. Plan: **Free**
4. Create database
5. Copy the **Internal Database URL** (starts with `postgresql://`)

#### Step 2: Create Web Service

1. **New → Web Service**
2. Connect your GitHub repo
3. Settings:

| Field | Value |
|-------|-------|
| Name | `chronosynapse` |
| Root Directory | *(leave empty)* |
| Runtime | Node |
| Build Command | `npm install && npm install --prefix backend` |
| Start Command | `npm start --prefix backend` |
| Plan | Free |

4. **Environment variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(Generate or paste a long random string)* |
| `DB_TYPE` | `postgres` |
| `DATABASE_URL` | *(paste Internal Database URL from Step 1)* |

5. Click **Create Web Service**

Tables are created automatically from `backend/schema.postgres.sql` on first startup.

---

## Part 3 — Using cloud SQL (not on your computer)

### Render PostgreSQL (recommended)

Set in Render environment:

```env
DB_TYPE=postgres
DATABASE_URL=postgresql://user:pass@host:5432/chronosynapse
```

No manual SQL import needed — the app runs the schema on startup.

### View / manage data in the cloud

1. Render Dashboard → your PostgreSQL instance → **Connect**
2. Use **Render Shell**, **psql**, or a GUI like [Beekeeper Studio](https://www.beekeeperstudio.io/) / [DBeaver](https://dbeaver.io/)
3. Connect with the **External Database URL** (for tools on your PC)

Example with psql:

```bash
psql "postgresql://USER:PASSWORD@HOST:5432/chronosynapse"
```

Then:

```sql
\dt          -- list tables
SELECT * FROM schools;
```

### Alternative: Cloud MySQL

If you prefer MySQL (PlanetScale, Aiven, Railway):

```env
DB_TYPE=mysql
DB_HOST=your-host.com
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=chronosynapse
DB_SSL=true
```

Import schema once:

```bash
mysql -h HOST -u USER -p DATABASE < backend/schema.sql
```

---

## Part 4 — Local development vs production

| | Local | Render |
|---|-------|--------|
| Database | SQLite (`DB_TYPE=sqlite`) | PostgreSQL (`DB_TYPE=postgres`) |
| URL | `http://localhost:3000` | `https://your-app.onrender.com` |
| Env file | `backend/.env` | Render Dashboard → Environment |

Copy the example env for local work:

```bash
cd backend
copy .env.example .env    # Windows
# cp .env.example .env    # Mac/Linux
```

---

## Part 5 — GitHub Pages → redirect to Render (recommended)

GitHub Pages **cannot** run your Node backend or database. Instead, this repo includes a **redirect** so your GitHub link opens the same live app on Render.

| GitHub URL | Redirects to |
|------------|----------------|
| `https://hiyashree.github.io/ChronoSynapse/` | `https://chronosynapse.onrender.com/` |
| `https://hiyashree.github.io/ChronoSynapse/public/dashboard.html` | `https://chronosynapse.onrender.com/dashboard` |
| Any other path under the repo | Same path on Render (via `404.html`) |

### Enable GitHub Pages (one-time)

1. Push the latest code to GitHub (includes `index.html`, `404.html`, `redirect-to-render.js`).
2. Open your repo on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Click **Save**.
5. Wait 1–2 minutes, then open:  
   `https://hiyashree.github.io/ChronoSynapse/`  
   It should redirect to `https://chronosynapse.onrender.com`.

### Change the Render URL later

Edit the meta tag in `index.html` and `404.html`:

```html
<meta name="chronosynapse-render-url" content="https://your-new-app.onrender.com">
```

Or edit `DEFAULT_RENDER_URL` in `redirect-to-render.js`.

### Pin the Render link on GitHub

Repo → **About** (gear icon) → **Website** → paste `https://chronosynapse.onrender.com`

---

## Troubleshooting

### App loads but API fails

- Check Render logs: Web Service → **Logs**
- Verify `DATABASE_URL` is set and `DB_TYPE=postgres`
- Hit `/api/test` directly in the browser

### Database connection error

- Use the **Internal** Database URL on Render (not External) for the web service
- Ensure PostgreSQL instance is in the same region as the web service

### Free tier sleeps after inactivity

Render free web services spin down after ~15 minutes idle. First visit may take 30–60 seconds to wake up.

### CORS errors (split frontend/backend domains)

If frontend and backend are on different URLs, set:

```env
FRONTEND_URL=https://your-frontend-url.com
```

---

## Quick checklist

- [ ] Code pushed to GitHub (no `.env` or `.db` files)
- [ ] Render Web Service created
- [ ] Render PostgreSQL created
- [ ] `DATABASE_URL`, `DB_TYPE=postgres`, `JWT_SECRET` set on Render
- [ ] `/api/test` returns OK
- [ ] Open live URL → create a school → generate timetable

---

## Your live app flow

1. Open `https://YOUR-APP.onrender.com`
2. Sign up or use guest mode
3. Create a school
4. Add teachers, subjects, classes
5. Generate timetable

All data is stored in **Render PostgreSQL**, not on your computer.
