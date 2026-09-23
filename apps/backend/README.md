# @equipment-hub/backend

Fastify API for the Equipment Maintenance Hub. Work order, asset, and
technician data is persisted in a local SQL Server database via
[Prisma](https://www.prisma.io/).

## Local SQL Server setup

1. Install and start SQL Server locally (SQL Server Developer Edition or
   SQL Server Express both work). On Windows, make sure the SQL Server
   service (`MSSQLSERVER`, or `MSSQL$<INSTANCE>` for a named instance) is
   running:

   ```powershell
   # From an elevated PowerShell/Services.msc
   net start MSSQLSERVER
   ```

2. Create a database for this project (e.g. `equipment_hub`), or let
   `prisma migrate dev` create it for you on first run, provided the SQL
   login has permission to create databases.

3. Copy `.env.example` to `.env` in `apps/backend/` and fill in your
   connection details:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

   `.env.example` documents both SQL auth and Windows/integrated auth
   connection string formats.

## Database scripts

Run these from `apps/backend/`:

```bash
npm run db:migrate   # create/update tables from prisma/schema.prisma
npm run db:seed      # load data/assets.json, technicians.json, work-orders.json
npm run db:studio    # open Prisma Studio to browse the local SQL Server data
```

Run `db:migrate` once after setup and again any time `prisma/schema.prisma`
changes. Run `db:seed` after migrating to populate demo data (it clears and
re-inserts work orders, technicians, and assets, so it's safe to re-run).

## Verifying persistence

1. Start the API: `npm run dev` (from `apps/backend/` or via the repo root
   `npm run dev`).
2. Create or update a work order through the API or the frontend.
3. Stop the dev server, then start it again.
4. `GET /api/work-orders` should still return the change — confirming it
   was written to SQL Server rather than held only in memory. You can also
   inspect the `work_orders` table directly with `npm run db:studio` or
   `sqlcmd`.
