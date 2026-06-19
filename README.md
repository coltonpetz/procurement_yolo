# Procurement Tool — Okland Construction

Material procurement management tool. Central question: **"Will this material be
on site when the job needs it?"** Answered by `Float = Need Date − Projected
Delivery Date`; float ≤ 0 is a red flag, made impossible to miss in the UI.

Built with React (Vite) + Supabase (Postgres). All computed fields (Action
Required, Projected Delivery, Float, Next Action Due) are calculated in the
frontend — nothing computed is stored in the database.

## Setup

### 1. Database
Open your Supabase project → **SQL Editor** → run, in order:
1. `supabase/schema.sql` — creates the 4 tables, indexes, `updated_at` triggers,
   and permissive RLS policies (MVP has no real auth yet).
2. `supabase/seed.sql` — *(optional)* loads the Heber Valley Temple demo project
   so you immediately see populated dashboards/logs.

### 2. Environment
```bash
cp .env.example .env
# then set:
#   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<your anon / publishable key>
```
(A `.env` with the experiment's demo credentials is already committed.)

### 3. Run
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build
node test/engine.test.mjs   # formula + P6 parser sanity tests
```

## What's here (MVP)

| Area | Status |
|------|--------|
| Project setup (create, duration defaults) | ✅ |
| Procurement log — view / add / edit | ✅ |
| P6 import (CSV/XLS/XLSX, serial dates, upsert) | ✅ |
| Formula engine (float, Action Required, projected delivery, next action due) | ✅ ported from reference |
| Red-flag visual on float ≤ 0 | ✅ |
| Dashboard (late, due ≤ 7 days, float distribution) | ✅ |
| Buyout log (+ status cascade warnings) | ✅ |
| Insert / copy / delete row (with confirm) | ✅ |
| Audit log (what / who / when / why) | ✅ |
| Filtering (status, action, company, WBS) | ✅ |
| Real auth / roles | ⛔ out of scope — stubbed with a name field |

## P6 import format
- Row 0 = machine headers: `task_code, status_code, wbs_id, task_name,
  start_date, end_date`
- Row 1 = human-readable headers (skipped automatically)
- Dates are Excel serial numbers (converted); blank start dates are allowed
- Upsert matches on `(project_id, p6_activity_id)`: existing rows get P6 fields
  refreshed, manually-entered actual dates are never overwritten

Sample file: `sample_data/sample_p6_export.csv`.

## Key files
- `src/lib/formulas.js` — the pure engine (ported from `reference/ProcurementTool.jsx`)
- `src/lib/dates.js` — local date math + Excel serial conversion
- `src/lib/p6import.js` — parse + upsert
- `src/lib/db.js` / `src/lib/audit.js` — Supabase data access + change logging
- `src/pages/` — ProjectList, ProjectCreate, Dashboard, ProcurementLog, BuyoutLog
- `src/components/ItemDetail.jsx` — the slide-out timeline/override/audit editor
