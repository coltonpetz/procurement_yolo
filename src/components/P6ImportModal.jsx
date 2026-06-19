import React, { useState } from "react";
import { C, MONO } from "../theme.js";
import { Icon } from "./icons.jsx";
import { Btn } from "./ui.jsx";
import { fmt, parse } from "../lib/dates.js";
import { parseP6Workbook, importP6Rows } from "../lib/p6import.js";
import { supabase } from "../supabaseClient.js";

// Two-step modal: 1) pick file → preview parsed rows, 2) confirm → upsert.
export default function P6ImportModal({ projectId, onClose, onImported }) {
  const [parsed, setParsed] = useState(null); // { rows, skipped, errors, fileName }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [readErr, setReadErr] = useState(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReadErr(null);
    try {
      const buf = await file.arrayBuffer();
      const out = parseP6Workbook(buf);
      setParsed({ ...out, fileName: file.name });
    } catch (err) {
      setReadErr(err.message || String(err));
    }
  }

  async function doImport() {
    setImporting(true);
    try {
      const summary = await importP6Rows(supabase, projectId, parsed.rows);
      setResult(summary);
      if (!summary.errors.length) onImported?.();
      else onImported?.(); // still refresh — partial success possible
    } catch (err) {
      setResult({ inserted: 0, updated: 0, errors: [err.message || String(err)] });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Import P6 Export" width={680}>
      {!parsed && !result && (
        <div>
          <p style={{ fontSize: 13, color: C.mut, lineHeight: 1.6, marginTop: 0 }}>
            Upload a Primavera P6 export (<code>.csv</code>, <code>.xls</code> or <code>.xlsx</code>).
            Row 0 must contain machine headers (<code>task_code</code>, <code>status_code</code>,{" "}
            <code>wbs_id</code>, <code>task_name</code>, <code>start_date</code>, <code>end_date</code>);
            row 1 (human-readable headers) is skipped automatically. Excel serial dates are converted.
          </p>
          <label style={{ display: "block", border: `2px dashed ${C.border}`, padding: 28, textAlign: "center", cursor: "pointer", background: "#fafbfc" }}>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={onFile} style={{ display: "none" }} />
            <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8, color: C.mut }}>
              <Icon.upload width={28} height={28} />
              <span style={{ fontWeight: 600, color: C.ink }}>Choose a P6 export file</span>
              <span style={{ fontSize: 12 }}>or drag it onto the file picker</span>
            </span>
          </label>
          {readErr && <ErrorBox>{readErr}</ErrorBox>}
        </div>
      )}

      {parsed && !result && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13 }}>
              <strong>{parsed.fileName}</strong> · {parsed.rows.length} rows ready
              {parsed.skipped ? `, ${parsed.skipped} skipped` : ""}
            </div>
            <button onClick={() => setParsed(null)} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, cursor: "pointer", fontSize: 12.5 }}>Choose a different file</button>
          </div>
          {parsed.errors.length > 0 && parsed.errors.map((e, i) => <ErrorBox key={i}>{e}</ErrorBox>)}
          <div style={{ maxHeight: 300, overflow: "auto", border: `1px solid ${C.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#fafbfc", position: "sticky", top: 0 }}>
                  {["Activity ID", "Status", "WBS", "Description", "Start", "Finish"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, color: C.mut, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 100).map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, opacity: String(r.p6_activity_status).toLowerCase() === "completed" ? 0.5 : 1 }}>
                    <td style={cell(true)}>{r.p6_activity_id}</td>
                    <td style={cell()}>{r.p6_activity_status || "—"}</td>
                    <td style={cell(true)}>{r.wbs_code || "—"}</td>
                    <td style={{ ...cell(), maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description || "—"}</td>
                    <td style={cell(true)}>{r.p6_start_date ? fmt(parse(r.p6_start_date)) : "—"}</td>
                    <td style={cell(true)}>{r.p6_finish_date ? fmt(parse(r.p6_finish_date)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 100 && <div style={{ fontSize: 11.5, color: C.mut, marginTop: 6 }}>Showing first 100 of {parsed.rows.length} rows.</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn kind="primary" onClick={doImport} disabled={importing || !parsed.rows.length}>
              {importing ? "Importing…" : `Import ${parsed.rows.length} rows`}
            </Btn>
            <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          </div>
          <div style={{ fontSize: 11.5, color: C.mut, marginTop: 10, lineHeight: 1.5 }}>
            Existing items are matched on Activity ID — their P6 fields are updated, your manually-entered actual dates are never overwritten. New Activity IDs are added as fresh items.
          </div>
        </div>
      )}

      {result && (
        <div>
          <div style={{ background: result.errors.length ? C.watchTint : C.healthyTint, borderLeft: `4px solid ${result.errors.length ? C.watch : C.healthy}`, padding: "14px 16px", fontSize: 14 }}>
            <strong>{result.inserted}</strong> added · <strong>{result.updated}</strong> updated
          </div>
          {result.errors.map((e, i) => <ErrorBox key={i}>{e}</ErrorBox>)}
          <div style={{ marginTop: 16 }}>
            <Btn kind="primary" onClick={onClose}>Done</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

const cell = (mono) => ({ padding: "7px 10px", fontFamily: mono ? MONO : "inherit", fontSize: 12, whiteSpace: "nowrap" });

function ErrorBox({ children }) {
  return <div style={{ background: C.criticalTint, borderLeft: `4px solid ${C.critical}`, color: C.criticalText, padding: "10px 14px", fontSize: 12.5, margin: "10px 0", lineHeight: 1.5 }}>{children}</div>;
}

export function Modal({ children, onClose, title, width = 560 }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,36,51,0.45)", zIndex: 50 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", background: "#fff", border: `1px solid ${C.border}`, zIndex: 51, boxShadow: "0 16px 48px rgba(0,0,0,0.24)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, padding: 6, cursor: "pointer", color: C.mut, display: "flex" }}><Icon.close /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </>
  );
}
