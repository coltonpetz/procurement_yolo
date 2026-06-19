import React, { useState, useMemo } from "react";

// ───────────────────────────────────────────────────────────────────────────
// Material Procurement Management — single-file mockup
// Central question: "Will this material be on site when the job needs it?"
// All data in memory. Every computed value derives from pure functions below.
// ───────────────────────────────────────────────────────────────────────────

// Project-level contract duration defaults (treated as calendar days here)
const DEFAULTS = {
  woToSubmittal: 14, // work order -> first submittal window
  gcReview: 10, // GC review time
  aeReview: 14, // A/E review time
  floatBuffer: 7, // built-in buffer
};

const TODAY = new Date(2026, 5, 18); // June 18, 2026

const PROJECT = {
  name: "Heber Valley Temple",
  number: "2224",
  client: "The Church of Jesus Christ of Latter-day Saints",
  status: "In Construction",
};

// ── Date helpers (local, no timezone drift) ────────────────────────────────
function parse(d) {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}
function addDays(date, n) {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}
function diffDays(a, b) {
  // calendar days a - b
  return Math.round((a - b) / 86400000);
}
function fmt(date) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function toInput(date) {
  if (!date) return "";
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

// ── Seed data ───────────────────────────────────────────────────────────────
const SEED = [
  { id: 1, company: "Western Steel Fabricators", description: "Structural Steel Package — Main Building", wbs: "2224.3.2", p6_start_date: "2026-03-01", lead_time_days: 60, date_wo_sent: "2025-08-15", date_submittal_received: "2025-09-10", date_submittal_to_ae: "2025-09-22", date_returned_from_ae: "2025-10-08", date_material_ordered: "2025-10-15", date_communicated_delivery: "2026-02-18", date_on_site: "2026-02-22" },
  { id: 2, company: "ThyssenKrupp Elevator", description: "Hydraulic Elevator Equipment — 2 Units", wbs: "2224.5.1", p6_start_date: "2026-09-15", lead_time_days: 180, date_wo_sent: "2025-11-01", date_submittal_received: "2025-12-15", date_submittal_to_ae: "2026-01-05", date_returned_from_ae: "2026-01-28", date_material_ordered: "2026-02-10", date_communicated_delivery: "2026-08-20", date_on_site: null },
  { id: 3, company: "Rocky Mountain Mechanical", description: "HVAC Rooftop Units & Air Handling Equipment", wbs: "2224.4.1", p6_start_date: "2026-08-01", lead_time_days: 90, date_wo_sent: "2026-01-15", date_submittal_received: "2026-02-28", date_submittal_to_ae: "2026-03-20", date_returned_from_ae: null, date_material_ordered: null, date_communicated_delivery: null, date_on_site: null },
  { id: 4, company: "Intermountain Electric", description: "Main Electrical Switchgear & Distribution Panels", wbs: "2224.4.3", p6_start_date: "2026-07-20", lead_time_days: 90, date_wo_sent: "2026-02-10", date_submittal_received: "2026-04-22", date_submittal_to_ae: null, date_returned_from_ae: null, date_material_ordered: null, date_communicated_delivery: null, date_on_site: null },
  { id: 5, company: "Mountain West Millwork", description: "Custom Interior Casework & Millwork Package", wbs: "2224.6.2", p6_start_date: "2026-08-15", lead_time_days: 120, date_wo_sent: "2026-03-01", date_submittal_received: null, date_submittal_to_ae: null, date_returned_from_ae: null, date_material_ordered: null, date_communicated_delivery: null, date_on_site: null },
  { id: 6, company: "TBD — Bidding", description: "Exterior Glazing & Curtainwall System", wbs: "2224.3.5", p6_start_date: "2026-09-01", lead_time_days: 120, date_wo_sent: null, date_submittal_received: null, date_submittal_to_ae: null, date_returned_from_ae: null, date_material_ordered: null, date_communicated_delivery: null, date_on_site: null },
  { id: 7, company: "Apex Plumbing & Mechanical", description: "Plumbing Fixtures, Trim & Specialties", wbs: "2224.4.2", p6_start_date: "2026-11-01", lead_time_days: 45, date_wo_sent: "2026-04-15", date_submittal_received: "2026-05-20", date_submittal_to_ae: "2026-06-01", date_returned_from_ae: "2026-06-10", date_material_ordered: null, date_communicated_delivery: null, date_on_site: null },
  { id: 8, company: "Fire Systems Inc.", description: "Fire Sprinkler Pipe, Heads & Specialties", wbs: "2224.4.4", p6_start_date: "2026-10-15", lead_time_days: 30, date_wo_sent: "2026-03-10", date_submittal_received: "2026-04-30", date_submittal_to_ae: "2026-05-28", date_returned_from_ae: null, date_material_ordered: null, date_communicated_delivery: null, date_on_site: null },
  { id: 9, company: "Teton Stone & Precast", description: "Custom Exterior Precast Stone — Spire & Facades", wbs: "2224.3.4", p6_start_date: "2026-07-28", lead_time_days: 90, date_wo_sent: "2025-12-01", date_submittal_received: "2026-01-20", date_submittal_to_ae: "2026-02-05", date_returned_from_ae: "2026-03-01", date_material_ordered: "2026-03-15", date_communicated_delivery: "2026-07-22", date_on_site: null },
  { id: 10, company: "Schuler Shook / Lightolier", description: "Custom Decorative Chandeliers & Interior Light Fixtures", wbs: "2224.6.3", p6_start_date: "2026-10-01", lead_time_days: 60, date_wo_sent: "2026-05-01", date_submittal_received: null, date_submittal_to_ae: null, date_returned_from_ae: null, date_material_ordered: null, date_communicated_delivery: null, date_on_site: null },
];

// ── Computed fields (pure) ───────────────────────────────────────────────────
const ACTIONS = {
  ON_SITE: "On Site",
  AWAITING_DELIVERY: "Awaiting Delivery",
  ORDER_MATERIAL: "Order Material",
  AWAITING_AE: "Awaiting A/E Return",
  GC_REVIEW: "GC Review / Send to A/E",
  REQUEST_SUBMITTAL: "Request Submittal from TP",
  ISSUE_WO: "Issue Work Order",
};

function actionRequired(it) {
  if (it.date_on_site) return ACTIONS.ON_SITE;
  if (it.date_material_ordered) return ACTIONS.AWAITING_DELIVERY;
  if (it.date_returned_from_ae) return ACTIONS.ORDER_MATERIAL;
  if (it.date_submittal_to_ae) return ACTIONS.AWAITING_AE;
  if (it.date_submittal_received) return ACTIONS.GC_REVIEW;
  if (it.date_wo_sent) return ACTIONS.REQUEST_SUBMITTAL;
  return ACTIONS.ISSUE_WO;
}

function projectedDelivery(it) {
  if (it.date_communicated_delivery) return parse(it.date_communicated_delivery);
  if (it.date_material_ordered) return addDays(parse(it.date_material_ordered), it.lead_time_days);
  // project forward from today through remaining unfilled steps
  let remaining = 0;
  if (!it.date_submittal_received) remaining += DEFAULTS.woToSubmittal;
  if (!it.date_submittal_to_ae) remaining += DEFAULTS.gcReview;
  if (!it.date_returned_from_ae) remaining += DEFAULTS.aeReview;
  remaining += it.lead_time_days;
  return addDays(TODAY, remaining);
}

function floatDays(it) {
  return diffDays(parse(it.p6_start_date), projectedDelivery(it));
}

// Backward deadlines from need date
function deadlines(it) {
  const need = parse(it.p6_start_date);
  const order = addDays(need, -it.lead_time_days);
  const ae = addDays(order, -DEFAULTS.aeReview);
  const sendAe = addDays(ae, -DEFAULTS.gcReview);
  const submittal = addDays(sendAe, -DEFAULTS.woToSubmittal);
  const start = addDays(submittal, -DEFAULTS.floatBuffer);
  return { need, order, ae, sendAe, submittal, start };
}

function nextActionDue(it) {
  const d = deadlines(it);
  switch (actionRequired(it)) {
    case ACTIONS.ISSUE_WO: return d.start;
    case ACTIONS.REQUEST_SUBMITTAL: return d.submittal;
    case ACTIONS.GC_REVIEW: return d.sendAe;
    case ACTIONS.AWAITING_AE: return d.ae;
    case ACTIONS.ORDER_MATERIAL: return d.order;
    case ACTIONS.AWAITING_DELIVERY: return d.order;
    default: return null; // On Site
  }
}

// ── Float / status classification ────────────────────────────────────────────
function bucket(it) {
  if (it.date_on_site) return "complete";
  const f = floatDays(it);
  if (f < 0) return "critical";
  if (f <= 14) return "watch";
  return "healthy";
}

const C = {
  charcoal: "#1e2433",
  bg: "#f4f5f7",
  border: "#e2e4e8",
  accent: "#0696d7",
  critical: "#dc2626",
  criticalText: "#991b1b",
  criticalTint: "#fdecec",
  watch: "#d97706",
  watchTint: "#fdf3e6",
  healthy: "#16a34a",
  healthyTint: "#ecf7ef",
  complete: "#6b7280",
  completeTint: "#f1f2f4",
  ink: "#1e2433",
  mut: "#6b7280",
};

function floatStyle(it) {
  const b = bucket(it);
  if (b === "critical") return { fg: C.criticalText, bg: C.criticalTint, bar: C.critical };
  if (b === "watch") return { fg: C.watch, bg: C.watchTint, bar: C.watch };
  if (b === "healthy") return { fg: C.healthy, bg: C.healthyTint, bar: C.healthy };
  return { fg: C.complete, bg: C.completeTint, bar: C.complete };
}

const MONO = "'SF Mono','Roboto Mono',Menlo,Consolas,'Liberation Mono',monospace";
const SANS = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

// ── Small inline icons ───────────────────────────────────────────────────────
const Icon = {
  box: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>),
  grid: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>),
  list: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>),
  alert: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  check: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><polyline points="20 6 9 17 4 12"/></svg>),
  clock: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>),
  close: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  arrow: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><polyline points="9 18 15 12 9 6"/></svg>),
};

// ── Status badge: solid left-border accent, no rounding ──────────────────────
function actionColor(action) {
  switch (action) {
    case ACTIONS.ON_SITE: return C.healthy;
    case ACTIONS.AWAITING_DELIVERY: return C.accent;
    case ACTIONS.ORDER_MATERIAL: return C.watch;
    case ACTIONS.AWAITING_AE: return "#7c3aed";
    case ACTIONS.GC_REVIEW: return "#0891b2";
    case ACTIONS.REQUEST_SUBMITTAL: return "#db2777";
    case ACTIONS.ISSUE_WO: return C.mut;
    default: return C.mut;
  }
}
function ActionBadge({ action, small }) {
  const col = actionColor(action);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "2px 8px 2px 7px" : "4px 10px 4px 8px", background: "#fff", border: `1px solid ${C.border}`, borderLeft: `3px solid ${col}`, fontSize: small ? 11 : 12, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", letterSpacing: 0.1 }}>
      {action === ACTIONS.ON_SITE && <span style={{ color: col, display: "flex" }}><Icon.check width={12} height={12} /></span>}
      {action}
    </span>
  );
}

// ── Float chip — the hero element of every row ───────────────────────────────
function FloatChip({ it, size = "md" }) {
  const f = floatDays(it);
  const st = floatStyle(it);
  const done = !!it.date_on_site;
  const sizes = {
    sm: { fs: 16, pad: "4px 10px", lh: 1 },
    md: { fs: 22, pad: "6px 12px", lh: 1 },
    lg: { fs: 44, pad: "14px 20px", lh: 1 },
  }[size];
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", background: st.bg, padding: sizes.pad, borderLeft: `4px solid ${st.bar}`, minWidth: size === "lg" ? 150 : 64 }}>
      <span style={{ fontFamily: MONO, fontSize: sizes.fs, fontWeight: 700, color: st.fg, lineHeight: sizes.lh, fontVariantNumeric: "tabular-nums" }}>
        {done ? "✓" : (f > 0 ? `+${f}` : f)}
      </span>
      {size === "lg" && (
        <span style={{ fontSize: 11, fontWeight: 600, color: st.fg, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {done ? "On site" : f < 0 ? `${Math.abs(f)} days late` : f === 0 ? "On the line" : "days of float"}
        </span>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("dashboard");
  const [items, setItems] = useState(SEED);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const selected = items.find((i) => i.id === selectedId) || null;

  function updateDate(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value || null } : it)));
  }

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: 720, fontFamily: SANS, color: C.ink, background: C.bg, fontSize: 14 }}>
      <Sidebar view={view} setView={setView} items={items} />
      <main style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
        {view === "dashboard" ? (
          <Dashboard items={items} onOpen={(id) => setSelectedId(id)} goLog={() => setView("log")} />
        ) : (
          <ProcurementLog items={items} filter={filter} setFilter={setFilter} onOpen={(id) => setSelectedId(id)} />
        )}
        {selected && (
          <ItemDetail it={selected} onClose={() => setSelectedId(null)} updateDate={updateDate} />
        )}
      </main>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, items }) {
  const critical = items.filter((i) => bucket(i) === "critical").length;
  const navItem = (key, label, icon) => {
    const active = view === key;
    return (
      <button onClick={() => setView(key)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 18px", background: active ? "#2b3447" : "transparent", border: "none", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent", color: active ? "#fff" : "#9aa3b5", fontSize: 13.5, fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: SANS }}>
        {icon}{label}
        {key === "dashboard" && critical > 0 && (
          <span style={{ marginLeft: "auto", background: C.critical, color: "#fff", fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{critical}</span>
        )}
      </button>
    );
  };
  return (
    <aside style={{ width: 236, background: C.charcoal, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "20px 18px 18px", borderBottom: "1px solid #2b3447" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.accent, marginBottom: 14 }}>
          <Icon.box />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#7e8aa0" }}>Procurement</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{PROJECT.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "#7e8aa0", marginTop: 3 }}>#{PROJECT.number}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11, fontWeight: 600, color: "#bcd9c6", background: "#1d3326", padding: "3px 8px", borderLeft: `3px solid ${C.healthy}` }}>
          <span style={{ width: 6, height: 6, background: C.healthy, display: "inline-block" }} />{PROJECT.status}
        </div>
      </div>
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {navItem("dashboard", "Dashboard", <Icon.grid />)}
        {navItem("log", "Procurement Log", <Icon.list />)}
      </nav>
      <div style={{ padding: "16px 18px", borderTop: "1px solid #2b3447", fontSize: 11, color: "#7e8aa0", lineHeight: 1.6 }}>
        <div style={{ fontFamily: MONO }}>Today · {fmt(TODAY)}</div>
        <div style={{ marginTop: 2 }}>{PROJECT.client}</div>
      </div>
    </aside>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ items, onOpen, goLog }) {
  const total = items.length;
  const critItems = items.filter((i) => bucket(i) === "critical");
  const worstLate = critItems.length ? Math.min(...critItems.map(floatDays)) : 0;
  const onSite = items.filter((i) => i.date_on_site).length;
  const thisWeek = items.filter((i) => {
    if (i.date_on_site) return false;
    const due = nextActionDue(i);
    return due && diffDays(due, TODAY) <= 7;
  });

  const counts = {
    critical: items.filter((i) => bucket(i) === "critical").length,
    watch: items.filter((i) => bucket(i) === "watch").length,
    healthy: items.filter((i) => bucket(i) === "healthy").length,
    complete: items.filter((i) => bucket(i) === "complete").length,
  };

  const priority = [...items].sort((a, b) => floatDays(a) - floatDays(b)).slice(0, 6);

  return (
    <div style={{ height: 720, overflowY: "auto" }}>
      <Header title="Dashboard" sub="Schedule health across all tracked materials" />
      <div style={{ padding: "22px 28px 40px" }}>
        {/* stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
          <Stat label="Total Items Tracked" value={total} icon={<Icon.box />} accent={C.accent} />
          <Stat label="Critical / At Risk" value={critItems.length} icon={<Icon.alert />} accent={C.critical}
            note={critItems.length ? `Worst is ${Math.abs(worstLate)} days late` : "All clear"} noteColor={C.criticalText} />
          <Stat label="On Site" value={onSite} icon={<Icon.check />} accent={C.healthy} note="Fully delivered" noteColor={C.healthy} />
          <Stat label="Action Due ≤ 7 Days" value={thisWeek.length} icon={<Icon.clock />} accent={C.watch} note="Includes overdue" noteColor={C.watch} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18 }}>
          {/* priority panel */}
          <Card pad={0}>
            <CardHead title="Priority Items" sub="Sorted by float — most urgent first" action={<button onClick={goLog} style={linkBtn}>Open log <Icon.arrow /></button>} />
            <div>
              {priority.map((it, idx) => {
                const due = nextActionDue(it);
                return (
                  <button key={it.id} onClick={() => onOpen(it.id)} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center", width: "100%", padding: "13px 18px", background: "#fff", border: "none", borderTop: idx ? `1px solid ${C.border}` : "none", cursor: "pointer", textAlign: "left", fontFamily: SANS }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.description}</div>
                      <div style={{ fontSize: 12, color: C.mut, marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                        <span>{it.company}</span><span style={{ color: C.border }}>·</span>
                        <ActionBadge action={actionRequired(it)} small />
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: C.mut, marginTop: 4 }}>
                        Due {fmt(due)} {due && diffDays(due, TODAY) < 0 ? `· ${Math.abs(diffDays(due, TODAY))}d overdue` : ""}
                      </div>
                    </div>
                    <FloatChip it={it} size="sm" />
                    <span style={{ color: C.mut, display: "flex" }}><Icon.arrow /></span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* float distribution */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Float Distribution</div>
            <div style={{ fontSize: 12, color: C.mut, marginBottom: 16 }}>Where every material sits today</div>
            <DistBar counts={counts} total={total} />
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <Legend color={C.critical} label="Critical" desc="Negative float" n={counts.critical} />
              <Legend color={C.watch} label="Watch" desc="0–14 days" n={counts.watch} />
              <Legend color={C.healthy} label="Healthy" desc="> 14 days" n={counts.healthy} />
              <Legend color={C.complete} label="Complete" desc="On site" n={counts.complete} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DistBar({ counts, total }) {
  const segs = [
    { c: C.critical, n: counts.critical },
    { c: C.watch, n: counts.watch },
    { c: C.healthy, n: counts.healthy },
    { c: C.complete, n: counts.complete },
  ].filter((s) => s.n > 0);
  return (
    <div style={{ display: "flex", height: 40, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {segs.map((s, i) => (
        <div key={i} style={{ flex: s.n, background: s.c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: MONO, fontWeight: 700, fontSize: 14, minWidth: 0 }}>
          {s.n}
        </div>
      ))}
    </div>
  );
}
function Legend({ color, label, desc, n }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 12, height: 12, background: color, flexShrink: 0 }} />
      <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.mut }}>{desc}</span>
      <span style={{ marginLeft: "auto", fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{n}</span>
    </div>
  );
}

function Stat({ label, value, icon, accent, note, noteColor }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderTop: `3px solid ${accent}`, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: C.mut, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.3, maxWidth: 130 }}>{label}</span>
        <span style={{ color: accent, opacity: 0.85 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 38, fontWeight: 700, marginTop: 8, lineHeight: 1, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {note && <div style={{ fontSize: 11.5, fontWeight: 600, color: noteColor, marginTop: 7 }}>{note}</div>}
    </div>
  );
}

// ── Procurement Log ──────────────────────────────────────────────────────────
function ProcurementLog({ items, filter, setFilter, onOpen }) {
  const filtered = useMemo(() => {
    let r = items;
    if (filter === "critical") r = r.filter((i) => bucket(i) === "critical");
    else if (filter === "watch") r = r.filter((i) => bucket(i) === "watch");
    else if (filter === "onsite") r = r.filter((i) => !!i.date_on_site);
    else if (filter.startsWith("act:")) {
      const a = filter.slice(4);
      r = r.filter((i) => actionRequired(i) === a);
    }
    return [...r].sort((a, b) => floatDays(a) - floatDays(b));
  }, [items, filter]);

  const filters = [
    { k: "all", label: "All" },
    { k: "critical", label: "Critical" },
    { k: "watch", label: "Watch" },
    { k: "onsite", label: "On Site" },
  ];
  const actionFilters = Object.values(ACTIONS).filter((a) => a !== ACTIONS.ON_SITE);

  return (
    <div style={{ height: 720, overflowY: "auto" }}>
      <Header title="Procurement Log" sub={`${items.length} materials · sorted by float`} />
      <div style={{ padding: "16px 28px 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {filters.map((f) => (
            <FilterBtn key={f.k} active={filter === f.k} onClick={() => setFilter(f.k)}>{f.label}</FilterBtn>
          ))}
          <span style={{ width: 1, height: 22, background: C.border, margin: "0 4px" }} />
          {actionFilters.map((a) => (
            <FilterBtn key={a} active={filter === `act:${a}`} onClick={() => setFilter(`act:${a}`)} small>{a}</FilterBtn>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 28px 40px" }}>
        <div style={{ background: "#fff", border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafbfc", borderBottom: `1px solid ${C.border}` }}>
                <Th left>Material / Trade Partner</Th>
                <Th>WBS</Th>
                <Th>Action Required</Th>
                <Th>Needed On Job</Th>
                <Th>Projected Delivery</Th>
                <Th right hero>Float</Th>
                <Th>Next Action Due</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const st = floatStyle(it);
                const due = nextActionDue(it);
                const overdue = due && diffDays(due, TODAY) < 0;
                return (
                  <tr key={it.id} onClick={() => onOpen(it.id)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: bucket(it) === "critical" ? C.criticalTint : "#fff" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = bucket(it) === "critical" ? "#fbe0e0" : "#f7f8fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = bucket(it) === "critical" ? C.criticalTint : "#fff")}>
                    <td style={{ padding: "12px 16px", maxWidth: 280 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.description}</div>
                      <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{it.company}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, color: C.mut, whiteSpace: "nowrap" }}>{it.wbs}</td>
                    <td style={{ padding: "12px 16px" }}><ActionBadge action={actionRequired(it)} small /></td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, whiteSpace: "nowrap" }}>{fmt(parse(it.p6_start_date))}</td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, color: C.mut, whiteSpace: "nowrap" }}>{fmt(projectedDelivery(it))}</td>
                    <td style={{ padding: "8px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", justifyContent: "flex-end" }}><FloatChip it={it} size="md" /></div>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, whiteSpace: "nowrap", color: overdue ? C.criticalText : C.ink, fontWeight: overdue ? 700 : 400 }}>
                      {fmt(due)}{overdue ? ` · ${Math.abs(diffDays(due, TODAY))}d late` : ""}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: C.mut }}>No materials match this filter. Clear it to see the full log.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Item Detail (slide-out) ──────────────────────────────────────────────────
const STEPS = [
  { field: "date_wo_sent", label: "Work Order Sent", who: "GC", dl: "start" },
  { field: "date_submittal_received", label: "Submittal Received from TP", who: "Trade Partner", dl: "submittal" },
  { field: "date_submittal_to_ae", label: "Submittal Sent to A/E", who: "GC", dl: "sendAe" },
  { field: "date_returned_from_ae", label: "Returned from A/E — Approved", who: "A/E", dl: "ae" },
  { field: "date_material_ordered", label: "Material Ordered", who: "Trade Partner", dl: "order" },
  { field: "date_communicated_delivery", label: "Delivery Date Committed", who: "Trade Partner", dl: "need" },
  { field: "date_on_site", label: "On Site", who: "Trade Partner", dl: "need" },
];

function ItemDetail({ it, onClose, updateDate }) {
  const f = floatDays(it);
  const st = floatStyle(it);
  const action = actionRequired(it);
  const due = nextActionDue(it);
  const dl = deadlines(it);
  const daysToDue = due ? diffDays(due, TODAY) : null;

  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(30,36,51,0.35)", zIndex: 10 }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 480, background: "#fff", borderLeft: `1px solid ${C.border}`, zIndex: 11, boxShadow: "-8px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.mut, letterSpacing: 0.5 }}>{it.wbs}</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3, lineHeight: 1.25 }}>{it.description}</div>
              <div style={{ fontSize: 13, color: C.mut, marginTop: 4 }}>{it.company}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, padding: 6, cursor: "pointer", color: C.mut, display: "flex" }}><Icon.close /></button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* hero metrics */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
              <FloatChip it={it} size="lg" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                <Metric label="Action Required" value={<ActionBadge action={action} />} />
                <Metric label="Projected Delivery" value={<span style={{ fontFamily: MONO, fontWeight: 600 }}>{fmt(projectedDelivery(it))}</span>} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <KV label="Date Needed on Job" value={fmt(parse(it.p6_start_date))} mono />
              <KV label="Next Action Due" value={due ? fmt(due) : "Complete"} mono
                color={daysToDue !== null && daysToDue < 0 ? C.criticalText : C.ink} />
              <KV label="Days Until Action Due" value={due ? (daysToDue < 0 ? `${Math.abs(daysToDue)} overdue` : `${daysToDue} days`) : "—"} mono
                color={daysToDue !== null && daysToDue < 0 ? C.criticalText : C.ink} />
              <KV label="Lead Time" value={`${it.lead_time_days} days`} mono />
            </div>
          </div>

          {/* timeline */}
          <div style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: C.mut, marginBottom: 16 }}>Procurement Timeline</div>
            <div style={{ position: "relative" }}>
              {STEPS.map((s, idx) => {
                const filled = !!it[s.field];
                const expected = dl[s.dl];
                const isCurrent = !filled && idx === STEPS.findIndex((x) => !it[x.field]);
                return (
                  <div key={s.field} style={{ display: "flex", gap: 14, paddingBottom: idx === STEPS.length - 1 ? 0 : 18, position: "relative" }}>
                    {/* connector */}
                    {idx !== STEPS.length - 1 && (
                      <div style={{ position: "absolute", left: 7, top: 18, bottom: 0, width: 2, background: filled ? C.healthy : C.border }} />
                    )}
                    {/* node */}
                    <div style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, background: filled ? C.healthy : "#fff", border: `2px solid ${filled ? C.healthy : isCurrent ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                      {filled && <Icon.check width={9} height={9} style={{ color: "#fff" }} />}
                    </div>
                    {/* content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: filled ? C.ink : isCurrent ? C.accent : C.mut }}>{s.label}</span>
                        {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5, border: `1px solid ${C.accent}`, padding: "1px 5px" }}>Now</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                        <input type="date" value={toInput(parse(it[s.field]))} onChange={(e) => updateDate(it.id, s.field, e.target.value)}
                          style={{ fontFamily: MONO, fontSize: 12.5, padding: "5px 8px", border: `1px solid ${C.border}`, color: C.ink, background: filled ? "#fff" : "#fafbfc", width: 160 }} />
                        {!filled && (
                          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.mut }}>expected {fmt(expected)}</span>
                        )}
                        <span style={{ fontSize: 11, color: C.mut, marginLeft: "auto" }}>{s.who}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* defaults reference */}
          <div style={{ padding: "16px 24px 28px", borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: C.mut, marginBottom: 10 }}>Project Defaults Applied</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Ref label="Lead time" value={`${it.lead_time_days}d`} />
              <Ref label="GC review" value={`${DEFAULTS.gcReview}d`} />
              <Ref label="A/E review" value={`${DEFAULTS.aeReview}d`} />
              <Ref label="WO → submittal" value={`${DEFAULTS.woToSubmittal}d`} />
              <Ref label="Float buffer" value={`${DEFAULTS.floatBuffer}d`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────
function Header({ title, sub }) {
  return (
    <div style={{ padding: "22px 28px 18px", borderBottom: `1px solid ${C.border}`, background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: -0.2 }}>{title}</h1>
        <div style={{ fontSize: 13, color: C.mut, marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ textAlign: "right", fontSize: 12, color: C.mut }}>
        <div style={{ fontWeight: 600, color: C.ink }}>Will it be on site in time?</div>
        <div style={{ fontFamily: MONO, marginTop: 2 }}>Float = need date − projected delivery</div>
      </div>
    </div>
  );
}
function Card({ children, pad = 18 }) {
  return <div style={{ background: "#fff", border: `1px solid ${C.border}`, padding: pad }}>{children}</div>;
}
function CardHead({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{sub}</div>
      </div>
      {action}
    </div>
  );
}
function Th({ children, left, right, hero }) {
  return (
    <th style={{ textAlign: left ? "left" : right ? "right" : "left", padding: "10px 16px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: hero ? C.ink : C.mut }}>{children}</th>
  );
}
function FilterBtn({ children, active, onClick, small }) {
  return (
    <button onClick={onClick} style={{ padding: small ? "5px 9px" : "6px 12px", fontSize: small ? 11.5 : 12.5, fontWeight: 600, background: active ? C.charcoal : "#fff", color: active ? "#fff" : C.ink, border: `1px solid ${active ? C.charcoal : C.border}`, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}>{children}</button>
  );
}
function Metric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mut, marginBottom: 4 }}>{label}</div>
      {value}
    </div>
  );
}
function KV({ label, value, mono, color }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, fontFamily: mono ? MONO : SANS, color: color || C.ink }}>{value}</div>
    </div>
  );
}
function Ref({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: C.mut }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}
const linkBtn = { display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: SANS };
