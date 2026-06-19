// Shared presentational bits — ported/adapted from reference/ProcurementTool.jsx.
import React from "react";
import { C, MONO, SANS } from "../theme.js";
import { Icon } from "./icons.jsx";
import { ACTIONS, floatDays, bucket } from "../lib/formulas.js";
import { floatStyle, actionColor } from "../lib/statusStyles.js";

// ── Status badge: solid left-border accent, no rounding ──────────────────────
export function ActionBadge({ action, small }) {
  const col = actionColor(action);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "2px 8px 2px 7px" : "4px 10px 4px 8px", background: "#fff", border: `1px solid ${C.border}`, borderLeft: `3px solid ${col}`, fontSize: small ? 11 : 12, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", letterSpacing: 0.1 }}>
      {action === ACTIONS.ON_SITE && <span style={{ color: col, display: "flex" }}><Icon.check width={12} height={12} /></span>}
      {action}
    </span>
  );
}

// ── Float chip — the hero element of every row ───────────────────────────────
export function FloatChip({ it, project, size = "md" }) {
  const f = floatDays(it, project);
  const st = floatStyle(it, project);
  const done = !!it.date_on_site;
  const unknown = f === null && !done;
  const sizes = {
    sm: { fs: 16, pad: "4px 10px", lh: 1 },
    md: { fs: 22, pad: "6px 12px", lh: 1 },
    lg: { fs: 44, pad: "14px 20px", lh: 1 },
  }[size];
  const display = done ? "✓" : unknown ? "—" : f > 0 ? `+${f}` : f;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", background: st.bg, padding: sizes.pad, borderLeft: `4px solid ${st.bar}`, minWidth: size === "lg" ? 150 : 64 }}>
      <span style={{ fontFamily: MONO, fontSize: sizes.fs, fontWeight: 700, color: st.fg, lineHeight: sizes.lh, fontVariantNumeric: "tabular-nums" }}>
        {display}
      </span>
      {size === "lg" && (
        <span style={{ fontSize: 11, fontWeight: 600, color: st.fg, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {done ? "On site" : unknown ? "No need date" : f < 0 ? `${Math.abs(f)} days late` : f === 0 ? "On the line" : "days of float"}
        </span>
      )}
    </div>
  );
}

// ── Header bar ───────────────────────────────────────────────────────────────
export function Header({ title, sub, right }) {
  return (
    <div style={{ padding: "22px 28px 18px", borderBottom: `1px solid ${C.border}`, background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: -0.2 }}>{title}</h1>
        <div style={{ fontSize: 13, color: C.mut, marginTop: 3 }}>{sub}</div>
      </div>
      {right || (
        <div style={{ textAlign: "right", fontSize: 12, color: C.mut }}>
          <div style={{ fontWeight: 600, color: C.ink }}>Will it be on site in time?</div>
          <div style={{ fontFamily: MONO, marginTop: 2 }}>Float = need date − projected delivery</div>
        </div>
      )}
    </div>
  );
}

export function Card({ children, pad = 18 }) {
  return <div style={{ background: "#fff", border: `1px solid ${C.border}`, padding: pad }}>{children}</div>;
}

export function CardHead({ title, sub, action }) {
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

export function Th({ children, left, right, hero }) {
  return (
    <th style={{ textAlign: left ? "left" : right ? "right" : "left", padding: "10px 16px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: hero ? C.ink : C.mut }}>{children}</th>
  );
}

export function FilterBtn({ children, active, onClick, small }) {
  return (
    <button onClick={onClick} style={{ padding: small ? "5px 9px" : "6px 12px", fontSize: small ? 11.5 : 12.5, fontWeight: 600, background: active ? C.charcoal : "#fff", color: active ? "#fff" : C.ink, border: `1px solid ${active ? C.charcoal : C.border}`, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}>{children}</button>
  );
}

export function Stat({ label, value, icon, accent, note, noteColor }) {
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

export function Metric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mut, marginBottom: 4 }}>{label}</div>
      {value}
    </div>
  );
}

export function KV({ label, value, mono, color }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, fontFamily: mono ? MONO : SANS, color: color || C.ink }}>{value}</div>
    </div>
  );
}

// Generic primary/secondary buttons in the utilitarian style.
export function Btn({ children, onClick, kind = "primary", type = "button", disabled, style }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px",
    fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: SANS, border: "1px solid", whiteSpace: "nowrap", opacity: disabled ? 0.55 : 1,
  };
  const kinds = {
    primary: { background: C.accent, color: "#fff", borderColor: C.accent },
    dark: { background: C.charcoal, color: "#fff", borderColor: C.charcoal },
    ghost: { background: "#fff", color: C.ink, borderColor: C.border },
    danger: { background: "#fff", color: C.criticalText, borderColor: C.critical },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>
      {children}
    </button>
  );
}

export const linkBtn = { display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: SANS };
