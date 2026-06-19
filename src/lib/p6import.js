// ═══════════════════════════════════════════════════════════════════════════
// P6 import — parse a Primavera P6 CSV/XLS export into procurement_items rows.
// ---------------------------------------------------------------------------
// File shape (per CLAUDE.md):
//   Row 0 = machine-readable headers: task_code, status_code, wbs_id,
//           task_name, start_date, end_date  → USE THESE
//   Row 1 = human-readable headers           → SKIP
//   Dates  = Excel serial numbers            → convert
//   Some start_date values are blank          → keep null, never crash
//
// We use SheetJS (xlsx) which reads .xls/.xlsx AND .csv uniformly and gives us
// raw cell values (serial numbers stay numeric), then map by the row-0 headers.
// ═══════════════════════════════════════════════════════════════════════════
import * as XLSX from "xlsx";
import { excelSerialToISO } from "./dates.js";

// Map P6 machine header → our field name.
const HEADER_MAP = {
  task_code: "p6_activity_id",
  status_code: "p6_activity_status",
  wbs_id: "wbs_code",
  task_name: "description",
  start_date: "p6_start_date",
  end_date: "p6_finish_date",
};

const DATE_FIELDS = new Set(["p6_start_date", "p6_finish_date"]);

// A value might already be an ISO/"YYYY-MM-DD" date string, a JS Date, or an
// Excel serial number. Normalize to "YYYY-MM-DD" | null.
function normalizeDate(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "number") return excelSerialToISO(v);
  const s = String(v).trim();
  if (!s) return null;
  // Already looks like a date string?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Numeric string that's really a serial?
  if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToISO(Number(s));
  // Fall back to Date parsing (e.g. "01-Mar-26", "3/1/2026").
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

// Parse an ArrayBuffer (from a File) into an array of normalized item objects.
// Returns { rows, skipped, errors } where rows are ready for upsert.
export function parseP6Workbook(arrayBuffer) {
  const errors = [];
  let rows = [];
  let skipped = 0;
  try {
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // header:1 → array-of-arrays so we can address row 0 / row 1 explicitly.
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    if (!aoa.length) {
      return { rows: [], skipped: 0, errors: ["File appears to be empty."] };
    }
    const headerRow = (aoa[0] || []).map((h) =>
      String(h ?? "").trim().toLowerCase()
    );
    // Verify we found at least the activity id column.
    if (!headerRow.includes("task_code")) {
      errors.push(
        'Could not find a "task_code" column in row 0. Make sure this is a ' +
          "machine-readable P6 export (row 0 = task_code, status_code, wbs_id, " +
          "task_name, start_date, end_date)."
      );
    }
    // Data starts at row 2 (index 2): skip row 0 (machine headers) and row 1
    // (human-readable headers).
    for (let r = 2; r < aoa.length; r++) {
      const cells = aoa[r] || [];
      const isBlank = cells.every((c) => c === null || c === "" || c === undefined);
      if (isBlank) {
        skipped++;
        continue;
      }
      const obj = {};
      headerRow.forEach((h, ci) => {
        const field = HEADER_MAP[h];
        if (!field) return;
        let val = cells[ci];
        if (DATE_FIELDS.has(field)) {
          obj[field] = normalizeDate(val);
        } else {
          obj[field] = val === null || val === undefined ? null : String(val).trim() || null;
        }
      });
      // A row with no activity id can't be upserted reliably; skip it.
      if (!obj.p6_activity_id) {
        skipped++;
        continue;
      }
      rows.push(obj);
    }
  } catch (e) {
    errors.push(`Failed to read file: ${e.message || e}`);
  }
  return { rows, skipped, errors };
}

// Upsert parsed P6 rows into procurement_items for a given project.
// Match on (project_id, p6_activity_id):
//  • match  → update P6 fields ONLY, never touch manually-entered actual dates.
//  • no match → insert new row with P6 fields, actuals null.
// `supabase` is the client; returns a summary { inserted, updated, errors }.
export async function importP6Rows(supabase, projectId, rows) {
  const summary = { inserted: 0, updated: 0, errors: [] };
  if (!rows.length) return summary;

  // Pull existing items for this project so we can decide insert vs update.
  const { data: existing, error: fetchErr } = await supabase
    .from("procurement_items")
    .select("id, p6_activity_id")
    .eq("project_id", projectId);
  if (fetchErr) {
    summary.errors.push(`Could not load existing items: ${fetchErr.message}`);
    return summary;
  }
  const byActivity = new Map();
  (existing || []).forEach((row) => {
    if (row.p6_activity_id) byActivity.set(row.p6_activity_id, row.id);
  });

  const inserts = [];
  for (const row of rows) {
    const p6Fields = {
      p6_activity_id: row.p6_activity_id,
      p6_activity_status: row.p6_activity_status ?? null,
      wbs_code: row.wbs_code ?? null,
      description: row.description ?? null,
      p6_start_date: row.p6_start_date ?? null,
      p6_finish_date: row.p6_finish_date ?? null,
    };
    const existingId = byActivity.get(row.p6_activity_id);
    if (existingId) {
      // Update P6 fields only — actual dates are left untouched.
      const { error } = await supabase
        .from("procurement_items")
        .update(p6Fields)
        .eq("id", existingId);
      if (error) summary.errors.push(`Update ${row.p6_activity_id}: ${error.message}`);
      else summary.updated++;
    } else {
      inserts.push({ project_id: projectId, ...p6Fields });
    }
  }

  if (inserts.length) {
    const { error } = await supabase.from("procurement_items").insert(inserts);
    if (error) summary.errors.push(`Insert batch: ${error.message}`);
    else summary.inserted += inserts.length;
  }

  return summary;
}
