-- ============================================================================
-- Demo seed — Heber Valley Temple (Project #2224), ported from the reference
-- mockup (reference/ProcurementTool.jsx). Run AFTER schema.sql.
-- Safe to run once; re-running creates a second copy of the project.
-- ============================================================================
DO $$
DECLARE
  p_id UUID;
  b_steel UUID; b_elev UUID; b_mech UUID; b_elec UUID; b_mill UUID;
  b_glaz UUID; b_plumb UUID; b_fire UUID; b_precast UUID; b_light UUID;
BEGIN
  INSERT INTO projects (name, number, client, project_type, start_date, end_date,
                        default_wo_to_submittal_days, default_gc_review_days,
                        default_ae_review_days, default_float_buffer_days, default_lead_time_days)
  VALUES ('Heber Valley Temple', '2224', 'The Church of Jesus Christ of Latter-day Saints',
          'Religious / Institutional', '2025-06-01', '2027-06-30', 14, 10, 14, 7, 21)
  RETURNING id INTO p_id;

  -- Trade partners (buyout log). Statuses chosen to exercise the cascade.
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Western Steel Fabricators', 'Structural steel fabrication & erection', 'work_order_executed') RETURNING id INTO b_steel;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'ThyssenKrupp Elevator', 'Hydraulic elevator equipment & install', 'work_order_executed') RETURNING id INTO b_elev;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Rocky Mountain Mechanical', 'HVAC equipment & air handling', 'work_order_issued') RETURNING id INTO b_mech;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Intermountain Electric', 'Electrical switchgear & distribution', 'work_order_issued') RETURNING id INTO b_elec;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Mountain West Millwork', 'Custom interior casework & millwork', 'work_order_issued') RETURNING id INTO b_mill;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'TBD — Bidding', 'Exterior glazing & curtainwall', 'loi_only') RETURNING id INTO b_glaz;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Apex Plumbing & Mechanical', 'Plumbing fixtures, trim & specialties', 'work_order_executed') RETURNING id INTO b_plumb;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Fire Systems Inc.', 'Fire sprinkler pipe, heads & specialties', 'work_order_issued') RETURNING id INTO b_fire;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Teton Stone & Precast', 'Custom exterior precast stone', 'work_order_executed') RETURNING id INTO b_precast;
  INSERT INTO buyout_log (project_id, company_name, scope_of_work, status) VALUES
    (p_id, 'Schuler Shook / Lightolier', 'Decorative chandeliers & light fixtures', 'work_order_issued') RETURNING id INTO b_light;

  -- Procurement items. override_lead_time_days carries each item's lead time;
  -- p6_start_date is the need date. Actual dates ported verbatim from the seed.
  INSERT INTO procurement_items
    (project_id, buyout_id, description, wbs_code, p6_activity_id, p6_start_date, override_lead_time_days,
     date_wo_sent, date_submittal_received, date_submittal_to_ae, date_returned_from_ae,
     date_material_ordered, date_communicated_delivery, date_on_site) VALUES
    (p_id, b_steel,  'Structural Steel Package — Main Building', '2224.3.2', '2224-3001', '2026-03-01', 60,
      '2025-08-15','2025-09-10','2025-09-22','2025-10-08','2025-10-15','2026-02-18','2026-02-22'),
    (p_id, b_elev,   'Hydraulic Elevator Equipment — 2 Units', '2224.5.1', '2224-5001', '2026-09-15', 180,
      '2025-11-01','2025-12-15','2026-01-05','2026-01-28','2026-02-10','2026-08-20',NULL),
    (p_id, b_mech,   'HVAC Rooftop Units & Air Handling Equipment', '2224.4.1', '2224-4001', '2026-08-01', 90,
      '2026-01-15','2026-02-28','2026-03-20',NULL,NULL,NULL,NULL),
    (p_id, b_elec,   'Main Electrical Switchgear & Distribution Panels', '2224.4.3', '2224-4003', '2026-07-20', 90,
      '2026-02-10','2026-04-22',NULL,NULL,NULL,NULL,NULL),
    (p_id, b_mill,   'Custom Interior Casework & Millwork Package', '2224.6.2', '2224-6002', '2026-08-15', 120,
      '2026-03-01',NULL,NULL,NULL,NULL,NULL,NULL),
    (p_id, b_glaz,   'Exterior Glazing & Curtainwall System', '2224.3.5', '2224-3005', '2026-09-01', 120,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL),
    (p_id, b_plumb,  'Plumbing Fixtures, Trim & Specialties', '2224.4.2', '2224-4002', '2026-11-01', 45,
      '2026-04-15','2026-05-20','2026-06-01','2026-06-10',NULL,NULL,NULL),
    (p_id, b_fire,   'Fire Sprinkler Pipe, Heads & Specialties', '2224.4.4', '2224-4004', '2026-10-15', 30,
      '2026-03-10','2026-04-30','2026-05-28',NULL,NULL,NULL,NULL),
    (p_id, b_precast,'Custom Exterior Precast Stone — Spire & Facades', '2224.3.4', '2224-3004', '2026-07-28', 90,
      '2025-12-01','2026-01-20','2026-02-05','2026-03-01','2026-03-15','2026-07-22',NULL),
    (p_id, b_light,  'Custom Decorative Chandeliers & Interior Light Fixtures', '2224.6.3', '2224-6003', '2026-10-01', 60,
      '2026-05-01',NULL,NULL,NULL,NULL,NULL,NULL);

  RAISE NOTICE 'Seeded Heber Valley Temple with id %', p_id;
END $$;
