# Procurement Tool — Project Context

## What this is
A material procurement management tool for Okland Construction, replacing an Excel-based system (Procurementv2_15_10.xlsm). Internal tool for project engineers first; longer-term interest in productizing it independently, with a possible future integration into a separate construction job-cost accounting product.

## The central question
**Will this material be on site when the job needs it?**
Answered by: `Float = Date Needed on Job − Projected Delivery Date`. Float ≤ 0 is a red flag. This is the design and UX center of gravity — float should be impossible to miss in the UI.

## Core framing
This is a MATERIAL tracker, not a submittal tracker. Submittals are one duration factored into the schedule math — not the primary object being managed. Each line item is a material moving through a 7-stage Action Required state machine.

## Who's building this
Colton is the product owner — a construction PM intern, no coding background. Work this way:
- Explain things in plain language before/alongside technical output.
- Confirm before any schema change once real data exists.
- Build in clean, testable, modular steps. Don't try to build everything in one giant pass.
- After each step, summarize in plain language what changed and exactly how to test it in the browser.
- Don't introduce new dependencies/libraries without flagging it first.

## Domain terminology (use these exact terms)
float, lead time, WBS, P6 start date, A/E review, GC review, submittal window, buyout status, communicated delivery date, need date

## Tech stack
- Frontend: React (Vite)
- Backend/DB: Supabase (Postgres)
- Styling: sharp corners (no border-radius), charcoal sidebar, professional/utilitarian — built for construction PEs, not a consumer SaaS look. Match `/reference/ProcurementTool.jsx` exactly unless told otherwise.

## Design & formula reference
`/reference/ProcurementTool.jsx` is a working interactive mockup seeded with real data from the first target project (Heber Valley Temple, Project #2224, client: The Church of Jesus Christ of Latter-day Saints). It contains:
- The 7-state Action Required engine as pure functions
- Float / projected delivery / next-action-due-date calculations
- The three-view UI (Dashboard, Procurement Log, Item Detail)

**Treat this file as the source of truth for formula logic and visual design.** Read it before building the formula engine or any screen, and port/adapt its logic rather than re-deriving it from scratch.

## Action Required states (general flow — confirm exact order/labels against the mockup)
Issue Work Order → Request Submittal from TP → GC Review Submittal → Send to A/E → Awaiting A/E Return → Order Material → Awaiting Delivery → On Site ✓

Buyout status (`loi_only` → `work_order_issued` → `work_order_executed`) cascades into which Action Required states are reachable.

## Database schema (Supabase / Postgres)

```sql
-- TABLE 1: projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number TEXT,
  client TEXT,
  project_type TEXT,
  start_date DATE,
  end_date DATE,
  use_working_days BOOLEAN DEFAULT TRUE,
  p6_update_cadence INTEGER DEFAULT 7,
  current_p6_update DATE,
  prior_p6_update DATE,
  default_wo_to_submittal_days INTEGER DEFAULT 14,
  default_gc_review_days INTEGER DEFAULT 10,
  default_ae_review_days INTEGER DEFAULT 14,
  default_float_buffer_days INTEGER DEFAULT 5,
  default_lead_time_days INTEGER DEFAULT 21,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 2: buyout_log
CREATE TABLE buyout_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  scope_of_work TEXT,
  tp_manager TEXT,
  tp_contact TEXT,
  status TEXT DEFAULT 'loi_only'
    CHECK (status IN ('loi_only', 'work_order_issued', 'work_order_executed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 3: procurement_items
CREATE TABLE procurement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  buyout_id UUID REFERENCES buyout_log(id),
  description TEXT,
  p6_activity_id TEXT,
  wbs_code TEXT,
  location_tag TEXT,
  p6_activity_status TEXT,
  p6_start_date DATE,
  p6_finish_date DATE,
  date_wo_sent DATE,
  date_submittal_received DATE,
  date_submittal_to_ae DATE,
  date_returned_from_ae DATE,
  date_material_ordered DATE,
  date_communicated_delivery DATE,
  date_trade_shop_delivery DATE,
  date_on_site DATE,
  override_wo_to_submittal_days INTEGER,
  override_gc_review_days INTEGER,
  override_ae_review_days INTEGER,
  override_float_buffer_days INTEGER,
  override_lead_time_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 4: audit_log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES procurement_items(id) ON DELETE CASCADE,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);
```

**Important:** All computed fields (Action Required, Projected Delivery Date, Float, Next Action Due Date) are calculated in the FRONTEND, not stored in the database. Do not add generated/computed columns for these in SQL.

## P6 import (confirmed in MVP scope)
Source file: P6 CSV/XLS export.
- Row 0 = machine-readable headers (`task_code`, `status_code`, `wbs_id`, `task_name`, `start_date`, `end_date`) — use these.
- Row 1 = human-readable headers — SKIP this row.
- Dates are stored as Excel serial numbers — must convert to real dates.
- Some `start_date` values are blank — handle gracefully, don't crash. A null `p6_start_date` is valid.

Upsert logic on import:
- Match existing rows on `p6_activity_id` (task_code) within the same `project_id`.
- If a match exists: update P6 fields only (`p6_start_date`, `p6_finish_date`, `p6_activity_status`, `wbs_code`, `description`) — never overwrite manually-entered actual dates.
- If no match: create a new `procurement_items` row with P6 fields populated, actual dates null.
- Rows with `p6_activity_status = "Completed"` still import but get a de-prioritized visual flag in the UI.

## MVP scope

**In (demo-ready target):**
- Project setup (create project, set contract duration defaults)
- Procurement log — view, add, edit line items
- P6 import — upload export, auto-populate/update items
- Formula engine — float, Action Required, projected delivery, next action due date
- Red flag visual when float ≤ 0
- Dashboard — late items, due this week, summary stats
- Buyout log — add/edit trade partners, status cascades to procurement items
- Insert / copy / delete row (with confirmation)
- Audit log — what/who/when/why per change
- Basic filtering — Action Required state, company, WBS code, float status

**Out (post-internship):**
- Real auth / role-based permissions (stub with a simple name field for now)
- P6 export / two-way sync
- Material dependency linking
- Automated email alerts
- Historical lead time analytics
- ACC / Autodesk Construction Cloud integration
- Multi-project portfolio dashboard

## Build order
Work in this order — don't skip ahead, each step depends on the last being solid.

1. Project scaffold + Supabase schema (all 4 tables)
2. React app shell — routing, nav, project creation screen
3. Procurement log table — read view, add new item
4. P6 import — upload, parse, upsert
5. Formula engine — float, projected delivery, Action Required (port from `/reference/ProcurementTool.jsx`)
6. Float flag + Action Required display in the log (this is the demo "aha" moment)
7. Dashboard — late items, due this week, summary stats
8. Buyout log — add/edit companies, status cascade
9. Row management (insert/copy/delete) + audit log
10. Filtering, seed data, polish
