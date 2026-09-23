# Prompt C — Backend authentication: how it was built, step by step

This document walks through how **Prompt C** was implemented. That prompt adds password
hashing, JWT issuing/verification, and the `POST /api/auth/login` and `GET /api/auth/me`
routes to the Fastify backend in `apps/backend`.

The goal is not only to show *what* changed, but *why* each step was done in that order,
so you can apply the same workflow to your own features.

---

## How to run the app (Windows Terminal)

Open **Windows Terminal** (PowerShell tab) and go to the project root. The path contains
spaces, so keep the quotes:

```powershell
cd "C:\path\to\Project equipment_maintenance_hub_React_Vite_Fastify_TypeScrip\Prompt 33 -"
```

### Quick start (everything already set up)

```powershell
npm run dev
```

This single command starts **both** apps side by side (using `concurrently`):

| App | URL | Log prefix |
| --- | --- | --- |
| Frontend (React + Vite) | http://localhost:5173 | `[frontend]` |
| Backend API (Fastify) | http://127.0.0.1:3001 (the frontend forwards `/api/*` requests to it) | `[backend]` |

Press **Ctrl + C** in the terminal to stop both.

### First-time setup (run once, in this order)

Prerequisites: **Node.js 22+** (built with v24) and a running **SQL Server** instance
(see `apps/backend/README.md` for details).

```powershell
# 1. Install the dependencies of every workspace (root, backend, frontend, contract)
npm install

# 2. Create the backend .env from the template (only if it does not exist yet)
if (-not (Test-Path apps\backend\.env)) { Copy-Item apps\backend\.env.example apps\backend\.env }
#    Then edit apps\backend\.env: set DATABASE_URL for your SQL Server
#    and replace JWT_SECRET with a long random value, for example:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Create the tables and load demo data (includes the demo users)
npm run db:migrate -w @equipment-hub/backend
npm run db:seed -w @equipment-hub/backend

# 4. Start frontend + backend
npm run dev
```

### Other useful commands

```powershell
npm run dev -w @equipment-hub/backend    # backend only
npm run dev -w @equipment-hub/frontend   # frontend only
npm test                                 # run every workspace's tests
```

### Quick check that it works

In a **second** terminal tab, while `npm run dev` is running:

```powershell
# Health check → {"status":"ok"}
Invoke-RestMethod http://127.0.0.1:3001/api/health

# Log in as the seeded admin and keep the token
$login = Invoke-RestMethod -Method Post http://127.0.0.1:3001/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admin@equipment-hub.test","password":"Admin!2345"}'

# Call a protected route with the token
Invoke-RestMethod http://127.0.0.1:3001/api/auth/me -Headers @{ Authorization = "Bearer $($login.token)" }
```

> **Tip:** in PowerShell, `curl` can be an alias for `Invoke-WebRequest`, so its flags work
> differently. Use `Invoke-RestMethod` as shown above, or call `curl.exe` explicitly.

### Troubleshooting

| Message | Fix |
| --- | --- |
| `JWT_SECRET is not set` | Add `JWT_SECRET` to `apps\backend\.env` (step 2). |
| `'concurrently' is not recognized` | Run `npm install` from the project root (step 1). |
| Login returns 500 / Prisma connection errors | SQL Server is not running or `DATABASE_URL` is wrong. |
| Login returns 401 for the demo users | Run `npm run db:seed -w @equipment-hub/backend` (step 3). |
| `EADDRINUSE` on port 3001 or 5173 | Another instance is still running. Close it, or find it with `Get-NetTCPConnection -LocalPort 3001`. |

---

## Step 0 — Read before writing

Before touching any file, the existing code was explored to learn the project's conventions:

| File | What we learned |
| --- | --- |
| `apps/backend/package.json` | `bcryptjs` was **already** a dependency (the seed script uses it), so only `@fastify/jwt` was missing. |
| `apps/backend/src/app.ts` | `createApp(repository)` builds the Fastify instance and receives the repository by injection — that is what makes the routes testable with fake data. |
| `apps/backend/src/server.ts` | Env vars are read from `process.env` (e.g. `PORT`). Nothing loaded `.env` except Prisma itself. |
| `apps/backend/src/data/repository.ts` | A `Repository` interface plus a Prisma-backed `createRepository()`. New data access must follow this pattern. |
| `apps/backend/src/routes/workOrders.ts` | Routes live in a `registerXxxRoutes(app, repository)` function and errors are returned as `ApiError` (`{ message }`). |
| `apps/backend/prisma/schema.prisma` + `seed.ts` | The `User` model (with `passwordHash`, `role`, `technicianId`) and the seeded users/passwords. |
| `packages/contract/src/index.ts` | The shared types `User`, `LoginRequest`, `LoginResponse`, `ApiError`, `Role` and the `ROLES` array. |

> **Lesson:** "Follow the existing pattern" is only possible if you read the existing pattern first.

We also ran the test suite **before** changing anything (`npx vitest run` → 76 passing tests).
A green baseline means that any later failure is caused by our changes.

---

## Step 1 — Install the dependency

The root `node_modules` folder did not exist yet, so the workspace was installed while adding the
new package to the backend workspace only:

```bash
npm install -w @equipment-hub/backend @fastify/jwt
```

`-w` (workspace) makes sure the dependency lands in `apps/backend/package.json`, not in the root.

---

## Step 2 — Configure `JWT_SECRET`

- `apps/backend/.env.example` got a documented placeholder (this file is committed, so it must
  never contain a real secret).
- `apps/backend/.env` got a real random value (this file is in `.gitignore`):

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

- `src/server.ts` now loads `.env` with Node's built-in `process.loadEnvFile()` (no extra
  library needed) and **refuses to start** if `JWT_SECRET` is missing. Failing fast at startup
  is much better than failing on the first login request.

---

## Step 3 — Pure domain helpers: `src/domain/auth.ts`

Logic that does not need HTTP or a database goes in `domain/`, where it is easy to unit test:

- `verifyPassword(plain, hash)` — wraps `bcrypt.compare`.
- `isRole(value)` — checks a value against the contract's `ROLES`.
- `isLoginRequest(body)` — validates that the body has non-empty string `email` and `password`.
- `toPublicUser(record)` — converts a database row into the public `User` shape,
  **dropping `passwordHash`**.
- `tokenClaimsFor(user)` — builds the JWT payload `{ sub, role, technicianId }`.

Signing and verifying tokens is **not** implemented by hand: `@fastify/jwt` does that for us.

---

## Step 4 — Data access: `src/data/repository.ts`

Two methods were added to the `Repository` interface and to the Prisma implementation,
following the same style as `getWorkOrder` / `assetExists`:

```ts
findUserByEmail(email: string): UserRecord | undefined | Promise<...>;
findUserById(id: string): UserRecord | undefined | Promise<...>;
```

`UserRecord` is an **internal** type that includes `passwordHash`. It is deliberately different
from the contract `User` type, so the compiler helps us never to send the hash by accident.

---

## Step 5 — Register the JWT plugin: `src/app.ts`

```ts
app.register(fastifyJwt, { secret: jwtSecret, sign: { expiresIn: "8h" } });

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    await reply.status(401).send({ message: "Missing or invalid bearer token" });
  }
});
```

- `app.authenticate` is a reusable guard that any route can use via `preValidation`.
- TypeScript *module augmentation* (`declare module "@fastify/jwt"` / `declare module "fastify"`)
  tells the compiler what `request.user` contains and that `app.authenticate` exists.
- `createApp` gained an optional second argument `{ jwtSecret }` so tests can pass a known secret.

---

## Step 6 — The routes: `src/routes/auth.ts`

**`POST /api/auth/login`**

1. Validate the body with `isLoginRequest` → `400` if invalid.
2. Look up the user by email.
3. Verify the password with bcrypt.
4. If the user does not exist **or** the password is wrong → `401 { message: "Invalid email or password" }`.
   The *same* message is used on purpose, so an attacker cannot discover which emails exist.
5. Sign a JWT with `{ sub, role, technicianId }` and return `{ token, user }` (without `passwordHash`).

**`GET /api/auth/me`**

- Protected with `{ preValidation: [app.authenticate] }`.
- Reads `request.user.sub` from the verified token, loads the user, and returns the public shape.
- If the user was deleted after the token was issued → `401`.

Finally, `registerAuthRoutes(app, repository)` is called in `app.ts`, right next to
`registerWorkOrderRoutes` — the same registration style as before.

---

## Step 7 — Tests

Because the `Repository` interface grew, the existing fake repositories in `app.test.ts` and
`routes/workOrders.test.ts` needed the two new methods (they simply return `undefined`).

New test files:

- **`src/routes/auth.test.ts`** — uses `app.inject()` (no real network, no real database) with
  an in-memory user list whose passwords are hashed with a low bcrypt cost (`4`) to keep tests fast:
  - successful login (checks the returned user, that `passwordHash` never appears, and the token claims)
  - wrong password → 401
  - unknown email → 401 with the same message
  - missing fields → 400
  - `/me` with a valid token → 200
  - `/me` without a token, with a malformed token, and with a token signed by another secret → 401
  - `/me` for a user that no longer exists → 401
- **`src/domain/auth.test.ts`** — unit tests for the pure helpers.

---

## Step 8 — Verify

```bash
cd apps/backend
npx vitest run        # 92 tests passing (76 old + 16 new)
npx tsc -p . --noEmit # no type errors
```

A manual smoke test was also run against the real server and the seeded database:

```bash
npm run dev   # inside apps/backend

curl http://127.0.0.1:3001/api/auth/me
# → 401 {"message":"Missing or invalid bearer token"}

curl -X POST http://127.0.0.1:3001/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"admin@equipment-hub.test","password":"Admin!2345"}'
# → 200 {"token":"eyJ...","user":{...}}
```

Try it yourself: copy the `token` and call `/me` with the header
`Authorization: Bearer <token>`.

---

## Files touched

| File | Change |
| --- | --- |
| `apps/backend/package.json` | + `@fastify/jwt` |
| `apps/backend/.env.example`, `.env` | + `JWT_SECRET` |
| `apps/backend/src/server.ts` | loads `.env`, requires `JWT_SECRET` |
| `apps/backend/src/app.ts` | registers `@fastify/jwt`, `app.authenticate`, auth routes |
| `apps/backend/src/data/repository.ts` | `UserRecord`, `findUserByEmail`, `findUserById` |
| `apps/backend/src/domain/auth.ts` (new) | password + pure auth helpers |
| `apps/backend/src/routes/auth.ts` (new) | login and me routes |
| `apps/backend/src/routes/auth.test.ts` (new) | route tests |
| `apps/backend/src/domain/auth.test.ts` (new) | unit tests |
| `apps/backend/src/app.test.ts`, `src/routes/workOrders.test.ts` | fake repos extended |

Work-order routes were **not** modified: protecting them with roles is the next prompt.

---

## Known issue (not part of this prompt)

`npx eslint` currently fails because `eslint.config.js` imports `@eslint/js`, which is not listed
in the root `devDependencies`. This existed before Prompt C.
