import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { C, MONO } from "../theme.js";
import { Icon } from "../components/icons.jsx";
import { Header, Th, Btn } from "../components/ui.jsx";
import { Modal } from "../components/P6ImportModal.jsx";
import { BUYOUT_STATUS, BUYOUT_ORDER, buyoutAllowsWorkOrder } from "../lib/buyout.js";
import { createBuyout, updateBuyout, deleteBuyout } from "../lib/db.js";

const label = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mut, marginBottom: 5 };
const input = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, fontSize: 13 };

const statusColor = (s) =>
  s === "work_order_executed" ? C.healthy : s === "work_order_issued" ? C.accent : C.watch;

export default function BuyoutLog() {
  const { project, items, buyouts, refreshBuyouts, refreshItems } = useOutletContext();
  const [editing, setEditing] = useState(null); // buyout obj or {} for new

  // How many procurement items each buyout is linked to.
  const itemCounts = useMemo(() => {
    const m = {};
    items.forEach((i) => { if (i.buyout_id) m[i.buyout_id] = (m[i.buyout_id] || 0) + 1; });
    return m;
  }, [items]);

  async function save(form) {
    const payload = {
      project_id: project.id,
      company_name: form.company_name.trim(),
      scope_of_work: form.scope_of_work?.trim() || null,
      tp_manager: form.tp_manager?.trim() || null,
      tp_contact: form.tp_contact?.trim() || null,
      status: form.status || "loi_only",
    };
    if (form.id) await updateBuyout(form.id, payload);
    else await createBuyout(payload);
    setEditing(null);
    await refreshBuyouts();
    await refreshItems(); // status cascade may change item warnings/availability
  }

  async function remove(b) {
    const n = itemCounts[b.id] || 0;
    const msg = n
      ? `Delete "${b.company_name}"? ${n} procurement item(s) are linked and will be left without a trade partner.`
      : `Delete "${b.company_name}"?`;
    if (!confirm(msg)) return;
    await deleteBuyout(b.id);
    await refreshBuyouts();
    await refreshItems();
  }

  async function quickStatus(b, status) {
    await updateBuyout(b.id, { status });
    await refreshBuyouts();
    await refreshItems();
  }

  return (
    <div style={{ minHeight: "100vh", overflowY: "auto" }}>
      <Header title="Buyout Log" sub={`${buyouts.length} trade partners`}
        right={<Btn kind="primary" onClick={() => setEditing({})}><Icon.plus /> Add Trade Partner</Btn>} />

      <div style={{ padding: "20px 28px 48px" }}>
        <div style={{ background: "#fff", border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafbfc", borderBottom: `1px solid ${C.border}` }}>
                <Th left>Company</Th>
                <Th left>Scope of Work</Th>
                <Th>Manager</Th>
                <Th>Contact</Th>
                <Th>Buyout Status</Th>
                <Th>Items</Th>
                <Th right>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {buyouts.map((b) => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{b.company_name}</td>
                  <td style={{ padding: "12px 16px", color: C.mut, maxWidth: 240 }}>{b.scope_of_work || "—"}</td>
                  <td style={{ padding: "12px 16px", color: C.mut }}>{b.tp_manager || "—"}</td>
                  <td style={{ padding: "12px 16px", color: C.mut, fontSize: 12.5 }}>{b.tp_contact || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <select value={b.status} onChange={(e) => quickStatus(b, e.target.value)}
                      style={{ fontSize: 12, fontWeight: 600, padding: "4px 8px", border: `1px solid ${C.border}`, borderLeft: `3px solid ${statusColor(b.status)}`, background: "#fff", cursor: "pointer" }}>
                      {BUYOUT_ORDER.map((s) => <option key={s} value={s}>{BUYOUT_STATUS[s]}</option>)}
                    </select>
                    {!buyoutAllowsWorkOrder(b.status) && (
                      <div style={{ fontSize: 10.5, color: C.watch, marginTop: 3 }}>WO not yet issuable</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: MONO, textAlign: "center" }}>{itemCounts[b.id] || 0}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => setEditing(b)} style={iconBtn} title="Edit">Edit</button>
                    <button onClick={() => remove(b)} style={{ ...iconBtn, color: C.critical }} title="Delete"><Icon.trash /></button>
                  </td>
                </tr>
              ))}
              {buyouts.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.mut }}>
                  No trade partners yet. Add one to link materials to a company and track buyout status.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: C.mut, marginTop: 12, lineHeight: 1.6 }}>
          Buyout status cascades to linked procurement items: a Work Order should only be sent once a
          partner reaches <strong>Work Order Issued</strong>. Items ahead of their buyout status show a warning in the item detail panel.
        </div>
      </div>

      {editing && (
        <BuyoutForm buyout={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function BuyoutForm({ buyout, onClose, onSave }) {
  const [f, setF] = useState({
    id: buyout.id,
    company_name: buyout.company_name || "",
    scope_of_work: buyout.scope_of_work || "",
    tp_manager: buyout.tp_manager || "",
    tp_contact: buyout.tp_contact || "",
    status: buyout.status || "loi_only",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!f.company_name.trim()) { setError("Company name is required."); return; }
    setSaving(true); setError(null);
    try {
      await onSave(f);
    } catch (err) {
      setError(err.message || String(err));
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title={f.id ? "Edit Trade Partner" : "Add Trade Partner"} width={560}>
      <form onSubmit={submit}>
        {error && <div style={{ background: C.criticalTint, borderLeft: `4px solid ${C.critical}`, color: C.criticalText, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={label}>Company Name *</div>
            <input value={f.company_name} onChange={set("company_name")} style={input} autoFocus placeholder="Western Steel Fabricators" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={label}>Scope of Work</div>
            <input value={f.scope_of_work} onChange={set("scope_of_work")} style={input} placeholder="Structural steel fabrication & erection" />
          </div>
          <div>
            <div style={label}>TP Manager</div>
            <input value={f.tp_manager} onChange={set("tp_manager")} style={input} />
          </div>
          <div>
            <div style={label}>TP Contact</div>
            <input value={f.tp_contact} onChange={set("tp_contact")} style={input} placeholder="email / phone" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={label}>Buyout Status</div>
            <select value={f.status} onChange={set("status")} style={input}>
              {BUYOUT_ORDER.map((s) => <option key={s} value={s}>{BUYOUT_STATUS[s]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Btn type="submit" kind="primary" disabled={saving}><Icon.check /> {saving ? "Saving…" : "Save"}</Btn>
          <Btn type="button" kind="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}

const iconBtn = { background: "none", border: `1px solid ${C.border}`, padding: "5px 9px", margin: "0 2px", cursor: "pointer", color: C.mut, fontSize: 12.5, fontWeight: 600, verticalAlign: "middle" };
