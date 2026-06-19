import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { C, MONO } from "../theme.js";
import { Icon } from "../components/icons.jsx";
import { Btn } from "../components/ui.jsx";
import { createProject } from "../lib/db.js";

const FieldLabel = ({ children, hint }) => (
  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mut, marginBottom: 5 }}>
    {children}{hint && <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: C.mut }}> · {hint}</span>}
  </div>
);

const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit" };

export default function ProjectCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [f, setF] = useState({
    name: "",
    number: "",
    client: "",
    project_type: "",
    start_date: "",
    end_date: "",
    use_working_days: true,
    p6_update_cadence: 7,
    default_wo_to_submittal_days: 14,
    default_gc_review_days: 10,
    default_ae_review_days: 14,
    default_float_buffer_days: 5,
    default_lead_time_days: 21,
  });

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setF((prev) => ({ ...prev, [k]: v }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!f.name.trim()) {
      setError("Project name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    // Coerce: empty dates → null, numeric defaults → integers.
    const payload = {
      name: f.name.trim(),
      number: f.number.trim() || null,
      client: f.client.trim() || null,
      project_type: f.project_type.trim() || null,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      use_working_days: !!f.use_working_days,
      p6_update_cadence: Number(f.p6_update_cadence) || 7,
      default_wo_to_submittal_days: Number(f.default_wo_to_submittal_days) || 0,
      default_gc_review_days: Number(f.default_gc_review_days) || 0,
      default_ae_review_days: Number(f.default_ae_review_days) || 0,
      default_float_buffer_days: Number(f.default_float_buffer_days) || 0,
      default_lead_time_days: Number(f.default_lead_time_days) || 0,
    };
    try {
      const proj = await createProject(payload);
      navigate(`/projects/${proj.id}/dashboard`);
    } catch (err) {
      setError(err.message || String(err));
      setSaving(false);
    }
  }

  const numField = (key, label, hint) => (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <input type="number" value={f[key]} onChange={set(key)} style={{ ...inputStyle, fontFamily: MONO }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100%", background: C.bg }}>
      <div style={{ background: C.charcoal, color: "#fff", padding: "18px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/" style={{ color: "#9aa3b5", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← Projects</Link>
        <div style={{ fontSize: 16, fontWeight: 700, marginLeft: 8 }}>New Project</div>
      </div>

      <form onSubmit={onSubmit} style={{ maxWidth: 760, margin: "0 auto", padding: 28 }}>
        {error && (
          <div style={{ background: C.criticalTint, borderLeft: `4px solid ${C.critical}`, color: C.criticalText, padding: "12px 16px", fontSize: 13, marginBottom: 18 }}>{error}</div>
        )}

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, padding: 22, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Project Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>Project Name *</FieldLabel>
              <input value={f.name} onChange={set("name")} style={inputStyle} placeholder="Heber Valley Temple" autoFocus />
            </div>
            <div>
              <FieldLabel>Project Number</FieldLabel>
              <input value={f.number} onChange={set("number")} style={inputStyle} placeholder="2224" />
            </div>
            <div>
              <FieldLabel>Project Type</FieldLabel>
              <input value={f.project_type} onChange={set("project_type")} style={inputStyle} placeholder="Religious / Institutional" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>Client</FieldLabel>
              <input value={f.client} onChange={set("client")} style={inputStyle} placeholder="The Church of Jesus Christ of Latter-day Saints" />
            </div>
            <div>
              <FieldLabel>Contract Start</FieldLabel>
              <input type="date" value={f.start_date} onChange={set("start_date")} style={{ ...inputStyle, fontFamily: MONO }} />
            </div>
            <div>
              <FieldLabel>Contract End</FieldLabel>
              <input type="date" value={f.end_date} onChange={set("end_date")} style={{ ...inputStyle, fontFamily: MONO }} />
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, padding: 22, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Contract Duration Defaults</div>
          <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 16 }}>
            These drive the float/projected-delivery math for every item. Each item can override them individually later.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {numField("default_wo_to_submittal_days", "WO → Submittal", "days")}
            {numField("default_gc_review_days", "GC Review", "days")}
            {numField("default_ae_review_days", "A/E Review", "days")}
            {numField("default_float_buffer_days", "Float Buffer", "days")}
            {numField("default_lead_time_days", "Lead Time", "days")}
            {numField("p6_update_cadence", "P6 Update Cadence", "days")}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={f.use_working_days} onChange={set("use_working_days")} />
            Use working days for schedule math (informational for MVP — math currently uses calendar days)
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn type="submit" kind="primary" disabled={saving}>
            <Icon.check /> {saving ? "Creating…" : "Create Project"}
          </Btn>
          <Btn type="button" kind="ghost" onClick={() => navigate("/")}>Cancel</Btn>
        </div>
      </form>
    </div>
  );
}
