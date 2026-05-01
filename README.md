# Team Task Manager (Full-Stack)

A web application for **projects (teams)**, **tasks**, and **two layers of RBAC**: (1) **account type** chosen at **sign-up** — **Admin** or **Member**; (2) **team role** on each project — **Team admin** or **Team member**. The same person can belong to **several teams** with different team roles.

## Features

- **Authentication:** Sign up and sign in (JWT). Registration requires choosing **Admin** or **Member** account type.
- **Account type (sign-up):**
  - **Admin:** May **create new projects** (API-enforced). Becomes **team admin** on projects they create.
  - **Member:** **Cannot** create projects; joins teams when a **team admin** adds their email. May still be promoted to **team admin** *inside* a project by an existing team admin.
- **Team roles (per project):** Team admins invite by email, promote **multiple team admins**, change roles, remove members (cannot remove the last team admin). Team members have limited task powers (see below).
- **Tasks:** Assignees must be project members; team admins have full task control; team members assign **new** tasks to **self only** and may edit **status/due** only on **tasks assigned to them**.
- **Dashboard:** Task counts and overdue items across **all projects you belong to**.

## RBAC (for reviewers)

Enforced in the **API** and reflected in the **UI** (nav badge + project screens).

### Layer 1 — Account type (`User.role`, set at registration)

| Account | Can create projects? | Typical use |
|---------|----------------------|-------------|
| **ADMIN** | Yes (`POST /api/projects` returns 403 for `MEMBER`) | Team leads / org admins |
| **MEMBER** | No | Individual contributors |

### Layer 2 — Team role (`ProjectMember.teamRole`, per project)

| Team role | Capabilities on that project |
|-----------|------------------------------|
| **TEAM_ADMIN** | Add/remove members, promote/demote team roles, delete project, full task CRUD. |
| **TEAM_MEMBER** | Create tasks (assign self only); update **status/due** on **assigned** tasks only; read project/tasks. |

**How to verify on the live link**

1. **Register User A as Admin** → **Projects** → **Create project** “Alpha”. A is **team admin** on Alpha.
2. **Register User B as Member** (incognito). As A, add B’s email on Alpha. B sees Alpha but **no** “New project” card on **Projects**.
3. Call `POST /api/projects` as B (e.g. DevTools / curl with B’s token) → expect **403** — proves **Member** cannot bypass the UI.
4. As A, assign tasks to B; as B, edit status on own tasks only. Promote B to **Team admin** in the Team dropdown; B gains delete/manage powers on Alpha.
5. **Register User C as Admin**, create “Beta”, add A only. **A** sees Alpha + Beta; **B** sees only Alpha unless added to Beta.

`GET /api/auth/me` returns `capabilities.canCreateProjects`. `GET /api/projects/:id` returns `viewerTeamRole` for team-level UI.

## Tech Stack

- **Backend:** Node.js, Express, REST API, Prisma ORM, PostgreSQL.
- **Frontend:** React 18, Vite, React Router.
- **Security:** Password hashing (bcrypt), JWT, **account-type** checks for project creation, **team-role** checks for membership and tasks.

## Prerequisites

- Node.js 20+
- PostgreSQL (local or [Railway](https://railway.app) Postgres plugin)

## Local Setup

### 1. Database

Create a PostgreSQL database and copy its connection string.

### 2. Server

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET (long random string)
npm install
npx prisma migrate dev
npm run dev
```

API runs at `http://localhost:4000`.

The server loads `.env` via `dotenv` at startup (`import "dotenv/config"` in `src/index.ts`).

### 3. Client

```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173` (Vite proxies `/api` to the server in dev).

## Production build (single process)

From repository root:

```bash
cd server && npm install && npx prisma generate && npm run build
cd ../client && npm install && npm run build
cd ../server
# Set DATABASE_URL, JWT_SECRET, NODE_ENV=production, CLIENT_DIST=../client/dist
node dist/index.js
```

The server serves the built SPA from `CLIENT_DIST` when `NODE_ENV=production`.

## Deploy on Railway

1. Create a new project on [Railway](https://railway.app).
2. Add a **PostgreSQL** service; set `DATABASE_URL` on the web service (reference the Postgres plugin variable).
3. Set **JWT_SECRET** (strong random string), **NODE_ENV=production**; **PORT** is set by Railway.
4. Deploy with the repo **Dockerfile** (runs `prisma migrate deploy` then `node dist/index.js`).
5. Same-origin SPA: build the client with empty `VITE_API_URL` so the browser calls `/api/...` on the same host.

## API Overview

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/register` | Public (`{ role: "ADMIN" \| "MEMBER" }` required) |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated (includes `capabilities`) |
| GET | `/api/projects` | Authenticated (only projects you belong to) |
| POST | `/api/projects` | **Admin account only** (403 for Member accounts) |
| GET | `/api/projects/:id` | Project member (`viewerTeamRole` in JSON) |
| POST | `/api/projects/:id/members` | Team admin |
| PATCH | `/api/projects/:id/members/:userId` | Team admin (`{ "teamRole": "TEAM_ADMIN" \| "TEAM_MEMBER" }`) |
| DELETE | `/api/projects/:id/members/:userId` | Team admin (cannot remove last team admin) |
| DELETE | `/api/projects/:id` | Team admin |
| GET | `/api/projects/:projectId/tasks` | Project member |
| POST | `/api/projects/:projectId/tasks` | Project member (assign rules above) |
| PATCH | `/api/tasks/:taskId` | Project member (team admin full edit; assignee limited) |
| DELETE | `/api/tasks/:taskId` | Team admin |
| GET | `/api/dashboard` | Authenticated (aggregates tasks from all your projects) |

## Submission Checklist (assignment)

- [ ] Live URL (Railway)
- [ ] Public GitHub repository
- [ ] This README (add your live URL; optional demo accounts)
- [ ] 2–5 minute demo video (Loom, YouTube unlisted, etc.)

## License

MIT
