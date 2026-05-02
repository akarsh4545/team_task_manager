# Team Task Manager

A full-stack web app for managing tasks across teams. Users can join multiple projects, assign tasks, and track progress, with clear access control at both account and team level.

---

## Overview

This application is designed to reflect how real teams operate:

* Users can be part of multiple projects.
* Each project contains tasks with status, due dates, and optional assignees.
* Permissions are handled at two levels:

  * Account level (global permissions)
  * Project level (team-specific permissions)

All critical checks are enforced on the backend, while the frontend mirrors the same rules.

---

## Core Features

### Projects

* A project represents a team.
* Users can belong to multiple projects.
* A user can have different roles in different projects.

### Tasks

* Tasks belong to a project.
* Each task has:

  * Status: TODO → IN_PROGRESS → DONE
  * Optional description and due date
  * Optional assignee (must be a project member)

### Dashboard

* Displays:

  * Task counts by status
  * Overdue tasks
  * Overall workload across projects

---

## Access Control (RBAC)

This project uses two levels of access control.

### 1. Account Role (Global)

Defined at registration:

* ADMIN → Can create projects
* MEMBER → Cannot create projects

### 2. Project Role (Per Project)

Defined per team:

* TEAM_ADMIN:

  * Manage members
  * Change roles
  * Delete project
  * Full control over tasks
* TEAM_MEMBER:

  * View project and tasks
  * Create tasks (assign only to self or leave unassigned)
  * Update only their own tasks (status and due date)

---

## Example Flow

* An admin user creates a project and becomes its team admin.
* A member user cannot create projects but can be added to existing ones.
* Once added, the member can view tasks and update their own assigned tasks.
* Permissions inside a project depend on the assigned team role.

---

## Tech Stack

### Backend

* Node.js + Express
* TypeScript
* PostgreSQL
* Prisma ORM
* Zod (validation)
* JWT authentication

### Frontend

* React (Vite)
* React Router
* Context API for auth
* Fetch API for requests

---

## Project Structure

team-task-manager/
├── client/        # React frontend
├── server/        # Express backend
│   ├── prisma/    # Database schema
│   ├── routes/    # API endpoints
│   ├── middleware/# Auth & access control
│   └── lib/       # Utilities (JWT, DB)

---

## API Overview

Base path: /api

### Auth

* POST /auth/register
* POST /auth/login
* GET /auth/me

### Projects

* GET /projects
* POST /projects (Admin only)
* GET /projects/:id
* Manage members (team admin only)

### Tasks

* GET /projects/:id/tasks
* POST /projects/:id/tasks
* PATCH /tasks/:taskId
* DELETE /tasks/:taskId (team admin only)

### Dashboard

* GET /dashboard

---

## Local Setup

### Server

cd server
cp .env.example .env

# add DATABASE_URL and JWT_SECRET

npm install
npx prisma migrate dev
npm run dev

### Client

cd client
npm install
npm run dev
