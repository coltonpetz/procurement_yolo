import React, { useState } from "react";
import { C, MONO } from "../theme.js";
import { Icon } from "./icons.jsx";
import { Btn } from "./ui.jsx";
import { Modal } from "./P6ImportModal.jsx";
import { createItem } from "../lib/db.js";

const label = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mut, marginBottom: 5 };
const input = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, fontSize: 13 };

export default function AddItemModal({ projectId, buyouts, onClose, onAdded }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [f, setF] = useState({
    description: "",
    wbs_code: "",
    p6_activity_id: "",
    location_tag: "",
    p6_start_date: "",
    p6_finish_date: "",
    buyout_id: "",
    override_lead_time_days: "",
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createItem({
        project_id: projectId,
        description: f.description.trim() || null,
        wbs_code: f.wbs_code.trim() || null,
        p6_activity_id: f.p6_activity_id.trim() || null,
        location_tag: f.location_tag.trim() || null,
        p6_start_date: f.p6_start_date || null,
        p6_finish_date: f.p6_finish_date || null,
        buyout_id: f.buyout_id || null,
        override_lead_time_days: f.override_lead_time_days ? Number(f.override_lead_time_days) : null,
      });
      onAdded?.();
      onClose();
    } catch (err) {
      setError(err.message || String(err));
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Add Procurement Item" width={600}>
      <form onSubmit={submit}>
        {error && <div style={{ background: C.criticalTint, borderLeft: `4px solid ${C.critical}`, color: C.criticalText, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={label}>Material / Description</div>
            <input value={f.description} onChange={set("description")} style={input} placeholder="Structural Steel Package — Main Building" autoFocus />
          </div>
          <div>
            <div style={label}>WBS Code</div>
            <input value={f.wbs_code} onChange={set("wbs_code")} style={{ ...input, fontFamily: MONO }} placeholder="2224.3.2" />
          </div>
          <div>
            <div style={label}>P6 Activity ID</div>
            <input value={f.p6_activity_id} onChange={set("p6_activity_id")} style={{ ...input, fontFamily: MONO }} placeholder="A1010" />
          </div>
          <div>
            <div style={label}>Need Date (P6 start)</div>
            <input type="date" value={f.p6_start_date} onChange={set("p6_start_date")} style={{ ...input, fontFamily: MONO }} />
          </div>
          <div>
            <div style={label}>P6 Finish Date</div>
            <input type="date" value={f.p6_finish_date} onChange={set("p6_finish_date")} style={{ ...input, fontFamily: MONO }} />
          </div>
          <div>
            <div style={label}>Trade Partner (buyout)</div>
            <select value={f.buyout_id} onChange={set("buyout_id")} style={input}>
              <option value="">— none —</option>
              {buyouts.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
            </select>
          </div>
          <div>
            <div style={label}>Lead Time Override (days)</div>
            <input type="number" value={f.override_lead_time_days} onChange={set("override_lead_time_days")} style={{ ...input, fontFamily: MONO }} placeholder="uses project default" />
          </div>
          <div>
            <div style={label}>Location Tag</div>
            <input value={f.location_tag} onChange={set("location_tag")} style={input} placeholder="Level 2 / East" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Btn type="submit" kind="primary" disabled={saving}><Icon.plus /> {saving ? "Adding…" : "Add Item"}</Btn>
          <Btn type="button" kind="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}
