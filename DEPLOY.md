# Deploy to Railway & push to GitHub

You (or your friend) must complete the browser login steps. This file lists **exact** actions.

## Before you start (company laptop)

- Check your employer’s policy on **personal GitHub**, **friend’s accounts**, and **cloud hosts** (Railway). Use only accounts and repos you are allowed to use.
- **Never** commit `server/.env` — it is in `.gitignore`. Secrets live only in Railway’s dashboard.

---

## Part A — GitHub (friend’s account)

Your friend can either **create the repo** and **add you as collaborator**, or give you a **one-time token** (PAT) with `repo` scope (less ideal; revoke after deploy).

### Option 1: Friend creates the repo (recommended)

1. Friend logs into GitHub → **New repository** → name e.g. `team-task-manager` → **Public** → create **without** README (you already have files locally).
2. Friend → **Settings → Collaborators** → add **your GitHub username** with **Write** access.
3. On **your laptop**, in the project folder:

```bash
cd /Users/jyotsna.singh/Desktop/team-task-manager
git remote add origin https://github.com/FRIEND_USERNAME/team-task-manager.git
git branch -M main
git push -u origin main
```

GitHub will prompt for login: use **your** account if you’re collaborator, or **friend’s** if you’re pushing as them (HTTPS + PAT or SSH).

### Option 2: Friend gives you a Personal Access Token (PAT)

1. Friend: GitHub → **Settings → Developer settings → PAT** → generate classic PAT with **`repo`** scope.
2. You push using the URL (token is used as password; **do not** paste the token into chat or commit it):

```bash
git remote add origin https://FRIEND_USERNAME:TOKEN@github.com/FRIEND_USERNAME/team-task-manager.git
```

Prefer **SSH keys** or **GitHub CLI** (`gh auth login`) instead of embedding tokens in URLs.

---

## Part B — Railway

1. Go to [railway.app](https://railway.app) and sign in (your friend’s Railway account is fine if that’s what you agreed).
2. **New project** → **Deploy from GitHub repo** → authorize Railway to read GitHub → pick **`team-task-manager`**.
3. **Add PostgreSQL**: **New** → **Database** → **PostgreSQL**. Railway injects `DATABASE_URL` into the project.
4. **Variables** on the **web** service (the one running Docker):

   | Variable       | Value |
   |----------------|--------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` or link from Postgres service (Railway UI “Variable reference”). |
   | `JWT_SECRET`   | Long random string (e.g. `openssl rand -base64 48`). |
   | `NODE_ENV`     | `production` |

5. **Build / deploy settings**
   - **Root directory:** repository root (where the `Dockerfile` is).
   - **Dockerfile path:** `Dockerfile` (default if at root).
   - First deploy runs: `prisma migrate deploy` then `node dist/index.js`.

6. **Networking:** Generate a **public URL** (Railway **Settings → Networking → Generate domain**). Open that URL — you should get the SPA; `/api/health` should return `{"ok":true}`.

7. If the app fails on boot, open **Deployments → View logs**. Common fixes:
   - `DATABASE_URL` missing or wrong service reference.
   - Migrations failed → fix schema, redeploy, or run a one-off **Railway shell** with `npx prisma migrate deploy`.

---

## Part C — Assignment submission

- **Live URL:** the Railway public URL.
- **GitHub:** the public repo link.
- **README:** already in repo; add the live URL at the top when you have it.
- **Demo video:** record separately (2–5 minutes).

---

## Quick reference (after repo is initialized locally)

```bash
cd /Users/jyotsna.singh/Desktop/team-task-manager
git status
git remote -v
git push -u origin main
```

Replace `FRIEND_USERNAME` and repo name with the real values.
