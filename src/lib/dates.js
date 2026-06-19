// ── Date helpers — local, no timezone drift (ported from the reference) ───────
// All "dates" in the app are calendar dates stored as "YYYY-MM-DD" strings
// (matching Postgres DATE columns). We parse them into local Date objects so
// arithmetic never crosses a timezone boundary.

export function parse(d) {
  if (!d) return null;
  // Accept both "YYYY-MM-DD" and full ISO strings from Postgres.
  const datePart = String(d).slice(0, 10);
  const [y, m, day] = datePart.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

export function addDays(date, n) {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

export function diffDays(a, b) {
  // calendar days a - b
  return Math.round((a - b) / 86400000);
}

export function fmt(date) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Date -> "YYYY-MM-DD" for <input type="date"> and Postgres.
export function toInput(date) {
  if (!date) return "";
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

// "Today" is real now in the app (the reference pinned it to 2026-06-18 for a
// static mockup). Returns a midnight-local Date so day math is clean.
export function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

// ── Excel serial date -> "YYYY-MM-DD" ────────────────────────────────────────
// P6 exports store dates as Excel serial numbers. Excel's epoch is
// 1899-12-30 (accounting for the fictitious 1900-02-29 leap-year bug).
export function excelSerialToISO(serial) {
  if (serial === null || serial === undefined || serial === "") return null;
  const n = typeof serial === "number" ? serial : Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Use UTC math then read back Y/M/D to avoid DST shifting the day.
  const ms = Math.round(n * 86400000);
  const d = new Date(Date.UTC(1899, 11, 30) + ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
