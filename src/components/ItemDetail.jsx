import React, { useEffect, useState } from "react";
import { C, MONO, SANS } from "../theme.js";
import { Icon } from "./icons.jsx";
import { FloatChip, ActionBadge, Metric, KV, Btn } from "./ui.jsx";
import { fmt, parse, toInput, diffDays, today } from "../lib/dates.js";
import {
  actionRequired, projectedDelivery, nextActionDue, deadlines, resolveDurations,
} from "../lib/formulas.js";
import { buyoutMismatch, BUYOUT_STATUS } from "../lib/buyout.js";
import { updateItem, deleteItem, copyItem } from "../lib/db.js";
import { fetchAudit } from "../lib/audit.js";

// The 7 workflow date fields, in order, with who owns each and its backward
// deadline key (ported from the reference's STEPS).
const STEPS = [
  { field: "date_wo_sent", label: "Work Order Sent", who: "GC", dl: "start" },
  { field: "date_submittal_received", label: "Submittal Received from TP", who: "Trade Partner", dl: "submittal" },
  { field: "date_submittal_to_ae", label: "Submittal Sent to A/E", who: "GC", dl: "sendAe" },
  { field: "date_returned_from_ae", label: "Returned from A/E — Approved", who: "A/E", dl: "ae" },
  { field: "date_material_ordered", label: "Material Ordered", who: "Trade Partner", dl: "order" },
  { field: "date_communicated_delivery", label: "Delivery Date Committed", who: "Trade Partner", dl: "need" },
  { field: "date_on_site", label: "On Site", who: "Trade Partner", dl: "need" },
];

const OVERRIDES = [
  { field: "override_lead_time_days", label: "Lead time", base: "leadTime" },
  { field: "override_gc_review_days", label: "GC review", base: "gcReview" },
  { field: "override_ae_review_days", label: "A/E review", base: "aeReview" },
  { field: "override_wo_to_submittal_days", label: "WO → submittal", base: "woToSubmittal" },
  { field: "override_float_buffer_days", label: "Float buffer", base: "floatBuffer" },
];

export default function ItemDetail({ item, project, buyouts, onClose, onChanged }) {
  const [it, setIt] = useState(item);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState("timeline");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setIt(item); }, [item]);
  useEffect(() => {
    if (item?.id) fetchAudit(item.id).then(setAudit);
  }, [item?.id]);

  // Escape closes the drawer.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!it) return null;

  const linkedBuyout = buyouts.find((b) => b.id === it.buyout_id) || null;
  const action = actionRequired(it);
  const due = nextActionDue(it, project);
  const dl = deadlines(it, project);
  const dur = resolveDurations(it, project);
  const daysToDue = due ? diffDays(due, today()) : null;
  const mismatch = buyoutMismatch(it, linkedBuyout);

  // Persist a single field, audit it, refresh local + parent.
  async function saveField(field, rawValue, isNumber = false) {
    const value = rawValue === "" ? null : isNumber ? Number(rawValue) : rawValue;
    if (String(it[field] ?? "") === String(value ?? "")) return;
    setBusy(true);
    try {
      const updated = await updateItem(it.id, { [field]: value }, it, { note: note || undefined });
      setIt(updated);
      setNote("");
      if (it.id) fetchAudit(it.id).then(setAudit);
      onChanged?.();
    } catch (e) {
      alert(`Couldn't save: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${it.description || "this item"}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteItem(it.id);
      onChanged?.();
      onClose();
    } catch (e) {
      alert(`Couldn't delete: ${e.message || e}`);
      setBusy(false);
    }
  }

  async function onCopy() {
    setBusy(true);
    try {
      await copyItem(it);
      onChanged?.();
      onClose();
    } catch (e) {
      alert(`Couldn't copy: ${e.message || e}`);
      setBusy(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,36,51,0.35)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, maxWidth: "100vw", background: "#fff", borderLeft: `1px solid ${C.border}`, zIndex: 41, boxShadow: "-8px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", fontFamily: SANS }}>
        {/* header */}
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.mut, letterSpacing: 0.5 }}>
                {it.wbs_code || "no WBS"}{it.p6_activity_id ? ` · ${it.p6_activity_id}` : ""}
              </div>
              <input
                defaultValue={it.description || ""}
                onBlur={(e) => saveField("description", e.target.value)}
                placeholder="(no description)"
                style={{ fontSize: 17, fontWeight: 700, marginTop: 3, lineHeight: 1.25, border: "1px solid transparent", padding: "2px 4px", marginLeft: -4, width: "100%", fontFamily: SANS }}
              />
              <div style={{ fontSize: 13, color: C.mut, marginTop: 4 }}>
                {linkedBuyout ? linkedBuyout.company_name : "No trade partner linked"}
                {linkedBuyout && <span> · {BUYOUT_STATUS[linkedBuyout.status]}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, padding: 6, cursor: "pointer", color: C.mut, display: "flex" }}><Icon.close /></button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn kind="ghost" onClick={onCopy} disabled={busy}><Icon.copy /> Copy</Btn>
            <Btn kind="danger" onClick={onDelete} disabled={busy}><Icon.trash /> Delete</Btn>
          </div>
        </div>

        {mismatch && (
          <div style={{ background: C.watchTint, borderBottom: `1px solid ${C.border}`, borderLeft: `4px solid ${C.watch}`, color: C.watch, padding: "10px 24px", fontSize: 12.5, lineHeight: 1.5 }}>
            <strong>Buyout check:</strong> {mismatch}
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* hero metrics */}
          <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
              <FloatChip it={it} project={project} size="lg" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                <Metric label="Action Required" value={<ActionBadge action={action} />} />
                <Metric label="Projected Delivery" value={<span style={{ fontFamily: MONO, fontWeight: 600 }}>{fmt(projectedDelivery(it, project))}</span>} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <KV label="Date Needed on Job" value={fmt(parse(it.p6_start_date))} mono />
              <KV label="Next Action Due" value={due ? fmt(due) : "—"} mono color={daysToDue !== null && daysToDue < 0 ? C.criticalText : C.ink} />
              <KV label="Days Until Action Due" value={due ? (daysToDue < 0 ? `${Math.abs(daysToDue)} overdue` : `${daysToDue} days`) : "—"} mono color={daysToDue !== null && daysToDue < 0 ? C.criticalText : C.ink} />
              <KV label="Lead Time" value={`${dur.leadTime} days`} mono />
            </div>
          </div>

          {/* P6 need-date editor */}
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DateField label="P6 Need Date (start)" value={it.p6_start_date} onSave={(v) => saveField("p6_start_date", v)} />
            <DateField label="P6 Finish Date" value={it.p6_finish_date} onSave={(v) => saveField("p6_finish_date", v)} />
          </div>

          {/* tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
            {[["timeline", "Timeline"], ["overrides", "Overrides"], ["audit", `Audit (${audit.length})`]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding: "12px 14px", background: "none", border: "none", borderBottom: tab === k ? `2px solid ${C.accent}` : "2px solid transparent", color: tab === k ? C.ink : C.mut, fontWeight: 700, fontSize: 12.5, cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.4, fontFamily: SANS }}>{label}</button>
            ))}
          </div>

          {tab === "timeline" && (
            <div style={{ padding: "18px 24px" }}>
              {/* optional note applied to the next change you save */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mut, marginBottom: 5 }}>Change note (optional — attached to your next edit)</div>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this changing?" style={{ width: "100%", padding: "6px 8px", border: `1px solid ${C.border}`, fontSize: 12.5 }} />
              </div>
              <div style={{ position: "relative" }}>
                {STEPS.map((s, idx) => {
                  const filled = !!it[s.field];
                  const expected = dl[s.dl];
                  const isCurrent = !filled && idx === STEPS.findIndex((x) => !it[x.field]);
                  return (
                    <div key={s.field} style={{ display: "flex", gap: 14, paddingBottom: idx === STEPS.length - 1 ? 0 : 18, position: "relative" }}>
                      {idx !== STEPS.length - 1 && (
                        <div style={{ position: "absolute", left: 7, top: 18, bottom: 0, width: 2, background: filled ? C.healthy : C.border }} />
                      )}
                      <div style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, background: filled ? C.healthy : "#fff", border: `2px solid ${filled ? C.healthy : isCurrent ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        {filled && <Icon.check width={9} height={9} style={{ color: "#fff" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: filled ? C.ink : isCurrent ? C.accent : C.mut }}>{s.label}</span>
                          {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5, border: `1px solid ${C.accent}`, padding: "1px 5px" }}>Now</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                          <input type="date" value={toInput(parse(it[s.field]))} onChange={(e) => saveField(s.field, e.target.value)}
                            style={{ fontFamily: MONO, fontSize: 12.5, padding: "5px 8px", border: `1px solid ${C.border}`, color: C.ink, background: filled ? "#fff" : "#fafbfc", width: 160 }} />
                          {!filled && expected && (
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
          )}

          {tab === "overrides" && (
            <div style={{ padding: "18px 24px" }}>
              <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14, lineHeight: 1.5 }}>
                Leave blank to use the project default. A value here overrides the default for this item only.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {OVERRIDES.map((o) => (
                  <div key={o.field}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut, marginBottom: 5 }}>{o.label}</div>
                    <input type="number" defaultValue={it[o.field] ?? ""} placeholder={`default ${dur[o.base]}`}
                      onBlur={(e) => saveField(o.field, e.target.value, true)}
                      style={{ width: "100%", fontFamily: MONO, fontSize: 12.5, padding: "6px 8px", border: `1px solid ${C.border}` }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div style={{ padding: "18px 24px" }}>
              {audit.length === 0 ? (
                <div style={{ color: C.mut, fontSize: 13 }}>No changes recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {audit.map((a, i) => (
                    <div key={a.id} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{prettyField(a.field_changed)}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: C.mut }}>{new Date(a.changed_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: C.ink, marginTop: 3 }}>
                        <span style={{ color: C.mut }}>{a.old_value ?? "∅"}</span> → <span>{a.new_value ?? "∅"}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.mut, marginTop: 3 }}>
                        by {a.changed_by || "unknown"}{a.note ? ` — ${a.note}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DateField({ label, value, onSave }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut, marginBottom: 5 }}>{label}</div>
      <input type="date" value={toInput(parse(value))} onChange={(e) => onSave(e.target.value)}
        style={{ width: "100%", fontFamily: MONO, fontSize: 12.5, padding: "6px 8px", border: `1px solid ${C.border}` }} />
    </div>
  );
}

function prettyField(f) {
  return String(f || "")
    .replace(/^date_/, "")
    .replace(/^override_/, "override: ")
    .replace(/_/g, " ")
    .replace(/\bae\b/i, "A/E")
    .replace(/\bwo\b/i, "WO");
}
