-- ============================================================================
-- Procurement Tool — Supabase / Postgres schema (MVP)
-- ----------------------------------------------------------------------------
-- HOW TO RUN: Open your Supabase project → SQL Editor → New query →
-- paste this whole file → Run. Safe to re-run (uses IF NOT EXISTS / CREATE OR
-- REPLACE where possible). Computed fields (Action Required, Projected
-- Delivery, Float, Next Action Due) are NOT stored here — they are calculated
-- in the frontend per CLAUDE.md.
-- ============================================================================

-- ── TABLE 1: projects ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
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

-- ── TABLE 2: buyout_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyout_log (
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

-- ── TABLE 3: procurement_items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procurement_items (
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

CREATE INDEX IF NOT EXISTS idx_items_project ON procurement_items(project_id);
CREATE INDEX IF NOT EXISTS idx_items_activity ON procurement_items(project_id, p6_activity_id);
CREATE INDEX IF NOT EXISTS idx_buyout_project ON buyout_log(project_id);

-- ── TABLE 4: audit_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES procurement_items(id) ON DELETE CASCADE,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_item ON audit_log(item_id, changed_at DESC);

-- ── updated_at maintenance trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_buyout_updated ON buyout_log;
CREATE TRIGGER trg_buyout_updated BEFORE UPDATE ON buyout_log
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_items_updated ON procurement_items;
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON procurement_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
-- MVP has NO real auth (stubbed with a name field). These permissive policies
-- let the anon/publishable key read+write everything so the demo works.
-- Replace with real, role-scoped policies before any production use.
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyout_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','buyout_log','procurement_items','audit_log']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_anon_all ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_anon_all ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      t, t);
  END LOOP;
END $$;
