# Workshop Registration Service

A robust monolithic web application for managing workshop registrations, built entirely with Node.js, Express, PostgreSQL, and a vanilla JavaScript frontend.

**🌐 Live Demo:** [http://161.33.76.85:3000](http://161.33.76.85:3000)

## Quick Start

```bash
# 1. Install dependencies
cd monolith
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Set up the database (creates schema + seeds data)
npm run db:seed

# 4. Start the server
node server.js
```

Open [http://localhost:3000](http://localhost:3000)

## Seeded Credentials

| Role    | Email                     | Password      |
|---------|---------------------------|---------------|
| Admin   | admin@workshop.local      | Admin@1234    |
| Manager | manager@workshop.local    | Manager@1234  |
| Staff   | staff@workshop.local      | Staff@1234    |

## Architecture Design: The Modular Monolith

Unlike a traditional decoupled architecture (where a separate frontend framework like React communicates with a standalone backend API) or a microservices approach, this application utilizes a **Modular Monolith Architecture**. 

One single Node.js process and Express server handles both the RESTful API routes and serves the Single-Page Application (SPA) frontend from the exact same origin.

```
node server.js
     │
     ▼
Load .env → Connect PostgreSQL → Register Express routes → Serve public/ → Listen :3000
```

### Project Structure

```
monolith/
├── server.js              # Entry point
├── src/
│   ├── app.js             # Express configuration
│   ├── config/db.js       # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js        # requireAuth, requireRole
│   │   └── errors.js      # Centralized error handling
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── workshops.routes.js
│   │   ├── registrations.routes.js
│   │   └── dashboard.routes.js
│   ├── repositories/
│   │   ├── users.repository.js
│   │   ├── workshops.repository.js
│   │   └── registrations.repository.js
│   └── utils/
│       └── validation.js  # Zod schemas + middleware
├── public/
│   ├── index.html         # SPA shell
│   └── app.js             # Frontend logic
└── database/
    ├── schema.sql         # Table definitions
    └── seed.js            # Initial data
```

## API Reference

| Method  | Endpoint                              | Access              |
|---------|---------------------------------------|---------------------|
| POST    | /api/auth/login                       | Public              |
| POST    | /api/auth/logout                      | Authenticated       |
| GET     | /api/auth/me                          | Authenticated       |
| GET     | /api/dashboard                        | Manager, Staff      |
| GET     | /api/workshops                        | Manager, Staff      |
| GET     | /api/workshops/:id                    | Manager, Staff      |
| POST    | /api/workshops                        | Manager only        |
| PATCH   | /api/workshops/:id                    | Manager only        |
| GET     | /api/workshops/:id/registrations      | Manager, Staff      |
| POST    | /api/workshops/:id/registrations      | Manager, Staff      |
| POST    | /api/registrations/:id/cancel         | Manager, Staff      |
| GET     | /api/registrations/:id/history        | Manager, Staff      |
| GET     | /api/registrations/history            | Manager, Staff      |
| GET     | /api/users                            | Admin only          |
| POST    | /api/users                            | Admin only          |
| PATCH   | /api/users/:id                        | Admin only          |

### Workshop Filters

```
GET /api/workshops?search=python&status=scheduled&from=2026-10-01&to=2026-11-01&availableOnly=true
```

## Capacity & Concurrency

Registration uses `SELECT ... FOR UPDATE` inside a PostgreSQL transaction to prevent overbooking:

1. Transaction begins
2. Workshop row is locked (`FOR UPDATE`)
3. Active registration count is checked inside the same transaction
4. If `count >= capacity` → rollback, return 409 Conflict
5. Otherwise → insert registration, commit

This serializes concurrent registrations for the same workshop. Registrations for different workshops proceed independently.

## Role Permissions

| Action                        | Staff | Manager | Admin |
|-------------------------------|-------|---------|-------|
| View workshops                | ✅    | ✅      | ❌    |
| Create/edit workshops         | ❌    | ✅      | ❌    |
| Register attendees            | ✅    | ✅      | ❌    |
| Cancel registrations          | ✅    | ✅      | ❌    |
| View history                  | ✅    | ✅      | ❌    |
| Manage users                  | ❌    | ❌      | ✅    |

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workshop_db
DB_USER=workshop
DB_PASSWORD=workshop_secret
SESSION_SECRET=your-long-random-secret
PORT=3000
NODE_ENV=development
```
