// Lightweight sanity tests for the pure formula engine + P6 parser.
// Run with: node test/engine.test.mjs
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { excelSerialToISO, parse, diffDays } from "../src/lib/dates.js";
import {
  actionRequired, projectedDelivery, floatDays, nextActionDue, bucket, resolveDurations, ACTIONS,
} from "../src/lib/formulas.js";
import { parseP6Workbook } from "../src/lib/p6import.js";
import { buyoutMismatch } from "../src/lib/buyout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("  ok -", name); };

console.log("Excel serial conversion");
t("46082 → 2026-03-01", () => assert.equal(excelSerialToISO(46082), "2026-03-01"));
t("46280 → 2026-09-15", () => assert.equal(excelSerialToISO(46280), "2026-09-15"));
t("blank → null", () => assert.equal(excelSerialToISO(""), null));
t("null → null", () => assert.equal(excelSerialToISO(null), null));

console.log("Action Required state machine");
const proj = { default_wo_to_submittal_days: 14, default_gc_review_days: 10, default_ae_review_days: 14, default_float_buffer_days: 7, default_lead_time_days: 60 };
t("empty → Issue Work Order", () => assert.equal(actionRequired({}), ACTIONS.ISSUE_WO));
t("wo sent → Request Submittal", () => assert.equal(actionRequired({ date_wo_sent: "2025-08-15" }), ACTIONS.REQUEST_SUBMITTAL));
t("submittal received → GC Review", () => assert.equal(actionRequired({ date_wo_sent: "x", date_submittal_received: "y" }), ACTIONS.GC_REVIEW));
t("to A/E → Awaiting A/E", () => assert.equal(actionRequired({ date_submittal_to_ae: "y" }), ACTIONS.AWAITING_AE));
t("returned → Order Material", () => assert.equal(actionRequired({ date_returned_from_ae: "y" }), ACTIONS.ORDER_MATERIAL));
t("ordered → Awaiting Delivery", () => assert.equal(actionRequired({ date_material_ordered: "y" }), ACTIONS.AWAITING_DELIVERY));
t("on site → On Site", () => assert.equal(actionRequired({ date_on_site: "y" }), ACTIONS.ON_SITE));

console.log("Projected delivery & float");
// Item 1 from the reference seed: fully delivered, communicated delivery wins.
const item1 = { p6_start_date: "2026-03-01", override_lead_time_days: 60, date_material_ordered: "2025-10-15", date_communicated_delivery: "2026-02-18", date_on_site: "2026-02-22" };
t("communicated delivery used as projected", () =>
  assert.equal(diffDays(projectedDelivery(item1, proj), parse("2026-02-18")), 0));
t("float = need − projected (Mar 1 − Feb 18 = 11)", () =>
  assert.equal(floatDays(item1, proj), diffDays(parse("2026-03-01"), parse("2026-02-18"))));

// Material ordered, no communicated delivery → order + lead time.
const item2 = { p6_start_date: "2026-09-15", override_lead_time_days: 180, date_material_ordered: "2026-02-10" };
t("ordered + lead time → projected", () => {
  const pd = projectedDelivery(item2, proj);
  assert.equal(diffDays(pd, parse("2026-02-10")), 180);
});

// Null need date → float null, bucket unknown.
t("null need date → float null", () => assert.equal(floatDays({ p6_start_date: null }, proj), null));
t("null need date → bucket unknown", () => assert.equal(bucket({ p6_start_date: null }, proj), "unknown"));

console.log("resolveDurations: override beats project default beats fallback");
t("override wins", () => assert.equal(resolveDurations({ override_lead_time_days: 99 }, proj).leadTime, 99));
t("project default used", () => assert.equal(resolveDurations({}, proj).leadTime, 60));
t("fallback used", () => assert.equal(resolveDurations({}, {}).leadTime, 21));

console.log("nextActionDue follows the action");
t("issue WO → start deadline non-null", () => assert.ok(nextActionDue({ p6_start_date: "2026-09-15" }, proj)));
t("on site → null", () => assert.equal(nextActionDue({ date_on_site: "x", p6_start_date: "2026-09-15" }, proj), null));

console.log("Buyout cascade mismatch");
t("WO sent but loi_only → warning", () =>
  assert.ok(buyoutMismatch({ date_wo_sent: "2025-08-15" }, { company_name: "X", status: "loi_only" })));
t("WO sent + work_order_issued → no warning", () =>
  assert.equal(buyoutMismatch({ date_wo_sent: "2025-08-15" }, { company_name: "X", status: "work_order_issued" }), null));

console.log("P6 parser on sample CSV");
const csv = readFileSync(join(__dirname, "../sample_data/sample_p6_export.csv"));
const out = parseP6Workbook(csv.buffer.slice(csv.byteOffset, csv.byteOffset + csv.byteLength));
t("no fatal errors", () => assert.equal(out.errors.length, 0, out.errors.join("; ")));
t("parsed 12 data rows (row 1 skipped)", () => assert.equal(out.rows.length, 12));
t("first row activity id mapped", () => assert.equal(out.rows[0].p6_activity_id, "2224-3001"));
t("first row serial date converted", () => assert.equal(out.rows[0].p6_start_date, "2026-03-01"));
t("completed status preserved", () => assert.ok(out.rows.some((r) => r.p6_activity_status === "Completed")));
t("blank start date → null, doesn't crash", () => {
  const blank = out.rows.find((r) => r.p6_activity_id === "2224-9001");
  assert.equal(blank.p6_start_date, null);
});

console.log(`\nAll ${pass} checks passed ✅`);
