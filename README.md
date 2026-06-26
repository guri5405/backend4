# Real-Time Support Ticket System

A backend for a support-ticket platform: users open tickets, exchange messages inside
them, and agents work tickets through to resolution. Built with **Node.js, TypeScript,
Express, Supabase (Postgres) and Redis**, following a clean, layered architecture.

```
controller -> service -> repository -> (Supabase | Redis)
```

- **Supabase (Postgres)** is the single source of truth for all persistent data
  (users, tickets, messages). Nothing important lives only in memory.
- **Redis** is used for three distinct things, each with its own thin service wrapper:
  1. **Ticket cache** (`ticket:{id}`) — cache-aside read-through for `GET /tickets/:id`.
  2. **Message queue** (`LPUSH`/`BRPOP` on the `ticket_messages` list) — simulates an
     async delivery pipeline, consumed by a separate worker process.
  3. **Pub/Sub** (`ticket_channel`) — bonus real-time fan-out hook for future
     WebSocket/SSE integration.
  4. Also used for a Redis-backed **rate limiter** (fixed window, `INCR`+`EXPIRE`).

---

## Project Structure

```
src/
├── app.ts                  # Express app wiring (middleware, routes)
├── server.ts                # HTTP server bootstrap + graceful shutdown
├── config/env.ts            # Centralized, validated environment config
├── db/
│   ├── supabase.ts          # Supabase client (service role key)
│   └── redis.ts             # Redis connection(s) + key/channel naming
├── types/index.ts           # Shared domain types + Express.Request augmentation
├── validators/              # Zod request schemas (body/query/params)
├── middleware/
│   ├── auth.middleware.ts        # JWT verification -> req.user
│   ├── role.middleware.ts        # Role-based authorization
│   ├── validate.middleware.ts    # Zod validation middleware factory
│   ├── rateLimiter.middleware.ts # Redis-backed rate limiting
│   └── error.middleware.ts       # Centralized error + 404 handling
├── repositories/             # Supabase queries only — no business logic
│   ├── user.repository.ts
│   ├── ticket.repository.ts
│   └── message.repository.ts
├── services/                 # Business logic, authorization rules, orchestration
│   ├── auth.service.ts
│   ├── ticket.service.ts        # status state machine, cache-aside, auto-assign
│   ├── message.service.ts       # access checks + queue/pubsub hand-off
│   ├── ticketCache.service.ts   # Redis ticket cache wrapper
│   └── messageQueue.service.ts  # Redis LPUSH + PUBLISH wrapper
├── controllers/               # Thin HTTP layer — req/res only
├── routes/                    # Route wiring + middleware composition
├── workers/
│   └── message.worker.ts      # Standalone process: BRPOP consumer + Pub/Sub subscriber
└── utils/                     # ApiError, ApiResponse, jwt, password, pagination, logger
sql/
└── schema.sql                 # Full Postgres schema for Supabase
```

This mirrors a standard clean-architecture Node/TS layout: **routes → middleware →
controllers → services → repositories → db clients**, with cross-cutting concerns
(auth, validation, rate limiting, error handling) isolated in `middleware/`.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Fill in:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project's
  **Settings → API**. The service role key is required (not the anon key) because
  the backend, not Supabase RLS, enforces all authorization.
- `REDIS_URL` — defaults to `redis://localhost:6379`.

### 3. Create the database schema
Open the Supabase SQL editor and run `sql/schema.sql`. It creates the `users`,
`tickets`, `messages` tables, enum types, indexes, and an `updated_at` trigger.
```

### 5. Run the app
```bash
npm run dev          # API server, hot-reload (tsx watch)
npm run dev:worker   # in a second terminal: the message-queue worker
```

Production:
```bash
npm run build
npm start            # node dist/server.js
npm run start:worker # node dist/workers/message.worker.js  (separate process)
```

## Authentication & Roles

JWT bearer tokens, issued on register/login, carry `{ id, role, email }`.
Send as `Authorization: Bearer <token>` on every protected route.

| Role  | Can do |
|-------|--------|
| `user`  | Create tickets, view/message own tickets |
| `agent` | View tickets assigned to them, message and update status on those tickets |
| `admin` | View all tickets, assign tickets to agents, plus everything an agent/user can view |

> Registration accepts an optional `role` field for assessment/testing convenience.
> In a real production system, `agent`/`admin` accounts would be created through an
> invite-only/admin-managed flow rather than self-service registration.

---

## API Reference

All responses use a consistent envelope:
```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "message": "...", "details": [ ... ] }
```

### Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | – | `{ name, email, password, role? }` |
| POST | `/api/auth/login` | – | `{ email, password }` |

Both return `{ user, token }`.

### Tickets
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/tickets` | `user` | Body: `{ subject }`. Created with `status: open`. |
| GET | `/api/tickets` | any | Query: `status`, `page`, `limit`. Auto-scoped: users see own tickets, agents see assigned tickets, admins see all. |
| GET | `/api/tickets/:id` | owner / assigned agent / admin | Read-through Redis cache. |
| PUT | `/api/tickets/:id/assign` | `admin` | Body: `{ agentId }`. |
| PUT | `/api/tickets/:id/status` | assigned `agent` / `admin` | Body: `{ status }`. Enforces `open → in_progress → resolved` (forward-only, no skipping). |

### Messages
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/tickets/:id/messages` | owner / assigned agent / admin | Body: `{ message }`. Saved in Supabase, then `LPUSH`ed to the Redis queue and `PUBLISH`ed to `ticket_channel`. |
| GET | `/api/tickets/:id/messages` | owner / assigned agent / admin | Query: `page`, `limit`. |

### Misc
| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Server uptime + current Redis queue depth. |

---

## Design notes

- **Ticket status lifecycle** is enforced as a strict state machine in
  `ticket.service.ts` (`open → in_progress → resolved`, forward-only, no reopening,
  no skipping straight to `resolved`).
- **Authorization** is enforced in two layers: route-level role gates
  (`authorize('admin')`, etc.) for *who can call this endpoint at all*, and
  ownership checks inside the service layer (e.g. "is this user the ticket's owner,
  assigned agent, or an admin?") for *which specific rows they can touch*.
- **Cache-aside, not cache-only**: `getTicketById` checks Redis first, falls back to
  Supabase on a miss, and repopulates the cache. Writes (assign/status update)
  update Supabase first, then overwrite the cache — Supabase is always the
  authority.
- **Queue is fire-and-forget from the API's perspective**: the message is already
  durably saved in Postgres before it's pushed to Redis, so a Redis hiccup never
  loses data — it just delays the "delivery simulation" step.
- **Worker uses `BRPOP`**, not polling, so it isn't busy-looping Redis, and it opens
  dedicated connections for blocking/pub-sub operations since those monopolize a
  connection in `ioredis`.
- **Rate limiting fails open**: if Redis is briefly unreachable, requests are still
  let through rather than taking the whole API down with it.
- **Bonus auto-assign** (`AUTO_ASSIGN_ENABLED=true`): new tickets are assigned to
  the agent currently holding the fewest open/in-progress tickets.

## Tech stack
Node.js · TypeScript · Express · Supabase (`@supabase/supabase-js`) · Redis (`ioredis`)
· JWT (`jsonwebtoken`) · `bcryptjs` · `zod` for request validation.
