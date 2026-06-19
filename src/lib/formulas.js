// ═══════════════════════════════════════════════════════════════════════════
// Formula engine — ported from reference/ProcurementTool.jsx
// ---------------------------------------------------------------------------
// Central question: "Will this material be on site when the job needs it?"
//   Float = Date Needed on Job (p6_start_date) − Projected Delivery Date
//   Float ≤ 0  → red flag.
//
// Differences from the single-file mockup, by design:
//  • Duration defaults live on the PROJECT row (default_*_days). Each item may
//    override any of them (override_*_days). resolveDurations() merges them.
//  • The mockup used a flat per-item `lead_time_days`; here lead time is
//    override_lead_time_days ?? project.default_lead_time_days.
//  • Need date = p6_start_date (a P6 DATE column) which may be null.
//
// Every function here is PURE. Nothing is written to the database.
// ═══════════════════════════════════════════════════════════════════════════
import { parse, addDays, diffDays, today } from "./dates.js";

export const ACTIONS = {
  ON_SITE: "On Site",
  AWAITING_DELIVERY: "Awaiting Delivery",
  ORDER_MATERIAL: "Order Material",
  AWAITING_AE: "Awaiting A/E Return",
  GC_REVIEW: "GC Review / Send to A/E",
  REQUEST_SUBMITTAL: "Request Submittal from TP",
  ISSUE_WO: "Issue Work Order",
};

// Fallback durations if a project row is missing values (mirrors schema
// DEFAULTs so the engine never divides by undefined).
const FALLBACK = {
  woToSubmittal: 14,
  gcReview: 10,
  aeReview: 14,
  floatBuffer: 5,
  leadTime: 21,
};

// Merge project defaults with per-item overrides into effective durations.
export function resolveDurations(item = {}, project = {}) {
  const pick = (override, projDefault, fb) =>
    override ?? projDefault ?? fb;
  return {
    woToSubmittal: pick(
      item.override_wo_to_submittal_days,
      project.default_wo_to_submittal_days,
      FALLBACK.woToSubmittal
    ),
    gcReview: pick(
      item.override_gc_review_days,
      project.default_gc_review_days,
      FALLBACK.gcReview
    ),
    aeReview: pick(
      item.override_ae_review_days,
      project.default_ae_review_days,
      FALLBACK.aeReview
    ),
    floatBuffer: pick(
      item.override_float_buffer_days,
      project.default_float_buffer_days,
      FALLBACK.floatBuffer
    ),
    leadTime: pick(
      item.override_lead_time_days,
      project.default_lead_time_days,
      FALLBACK.leadTime
    ),
  };
}

// ── 7-state Action Required machine (reverse-fill order, from the mockup) ─────
export function actionRequired(it) {
  if (it.date_on_site) return ACTIONS.ON_SITE;
  if (it.date_material_ordered) return ACTIONS.AWAITING_DELIVERY;
  if (it.date_returned_from_ae) return ACTIONS.ORDER_MATERIAL;
  if (it.date_submittal_to_ae) return ACTIONS.AWAITING_AE;
  if (it.date_submittal_received) return ACTIONS.GC_REVIEW;
  if (it.date_wo_sent) return ACTIONS.REQUEST_SUBMITTAL;
  return ACTIONS.ISSUE_WO;
}

// ── Projected delivery date ───────────────────────────────────────────────────
export function projectedDelivery(it, project) {
  const d = resolveDurations(it, project);
  if (it.date_communicated_delivery) return parse(it.date_communicated_delivery);
  if (it.date_material_ordered)
    return addDays(parse(it.date_material_ordered), d.leadTime);
  // Project forward from today through the remaining unfilled steps.
  let remaining = 0;
  if (!it.date_submittal_received) remaining += d.woToSubmittal;
  if (!it.date_submittal_to_ae) remaining += d.gcReview;
  if (!it.date_returned_from_ae) remaining += d.aeReview;
  remaining += d.leadTime;
  return addDays(today(), remaining);
}

// ── Float = need date − projected delivery (calendar days) ────────────────────
// Returns null when there is no need date (a null p6_start_date is valid).
export function floatDays(it, project) {
  const need = parse(it.p6_start_date);
  if (!need) return null;
  return diffDays(need, projectedDelivery(it, project));
}

// ── Backward deadlines from the need date ─────────────────────────────────────
export function deadlines(it, project) {
  const d = resolveDurations(it, project);
  const need = parse(it.p6_start_date);
  if (!need) return { need: null, order: null, ae: null, sendAe: null, submittal: null, start: null };
  const order = addDays(need, -d.leadTime);
  const ae = addDays(order, -d.aeReview);
  const sendAe = addDays(ae, -d.gcReview);
  const submittal = addDays(sendAe, -d.woToSubmittal);
  const start = addDays(submittal, -d.floatBuffer);
  return { need, order, ae, sendAe, submittal, start };
}

export function nextActionDue(it, project) {
  const d = deadlines(it, project);
  switch (actionRequired(it)) {
    case ACTIONS.ISSUE_WO:
      return d.start;
    case ACTIONS.REQUEST_SUBMITTAL:
      return d.submittal;
    case ACTIONS.GC_REVIEW:
      return d.sendAe;
    case ACTIONS.AWAITING_AE:
      return d.ae;
    case ACTIONS.ORDER_MATERIAL:
      return d.order;
    case ACTIONS.AWAITING_DELIVERY:
      return d.order;
    default:
      return null; // On Site
  }
}

// ── Float / status classification ─────────────────────────────────────────────
// "unknown" is new vs the mockup: items with no need date can't be scored.
export function bucket(it, project) {
  if (it.date_on_site) return "complete";
  const f = floatDays(it, project);
  if (f === null) return "unknown";
  if (f < 0) return "critical";
  if (f <= 14) return "watch";
  return "healthy";
}

// Completed P6 activities get de-prioritized visually (CLAUDE.md import rule).
export function isP6Completed(it) {
  return String(it.p6_activity_status || "").toLowerCase() === "completed";
}
