import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { C, MONO } from "../theme.js";
import { Icon } from "../components/icons.jsx";
import { Header, FilterBtn, FloatChip, ActionBadge, Th, Btn } from "../components/ui.jsx";
import { fmt, parse, diffDays, today } from "../lib/dates.js";
import { actionRequired, projectedDelivery, floatDays, nextActionDue, bucket, isP6Completed, ACTIONS } from "../lib/formulas.js";
import { copyItem, deleteItem } from "../lib/db.js";
import ItemDetail from "../components/ItemDetail.jsx";
import AddItemModal from "../components/AddItemModal.jsx";
import P6ImportModal from "../components/P6ImportModal.jsx";

// Float sort: nulls (no need date) last.
function byFloat(project) {
  return (a, b) => {
    const fa = floatDays(a, project), fb = floatDays(b, project);
    if (fa === null && fb === null) return 0;
    if (fa === null) return 1;
    if (fb === null) return -1;
    return fa - fb;
  };
}

export default function ProcurementLog() {
  const { project, items, buyouts, refreshItems } = useOutletContext();
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [wbsFilter, setWbsFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const T = today();
  const buyoutName = (id) => buyouts.find((b) => b.id === id)?.company_name || null;

  // Distinct companies + WBS prefixes for the dropdown filters.
  const companies = useMemo(() => {
    const s = new Set();
    items.forEach((i) => { const n = buyoutName(i.buyout_id); if (n) s.add(n); });
    return [...s].sort();
  }, [items, buyouts]);
  const wbsCodes = useMemo(() => {
    const s = new Set();
    items.forEach((i) => { if (i.wbs_code) s.add(i.wbs_code); });
    return [...s].sort();
  }, [items]);

  const filtered = useMemo(() => {
    let r = items;
    if (statusFilter === "critical") r = r.filter((i) => bucket(i, project) === "critical");
    else if (statusFilter === "watch") r = r.filter((i) => bucket(i, project) === "watch");
    else if (statusFilter === "healthy") r = r.filter((i) => bucket(i, project) === "healthy");
    else if (statusFilter === "onsite") r = r.filter((i) => !!i.date_on_site);
    if (actionFilter !== "all") r = r.filter((i) => actionRequired(i) === actionFilter);
    if (companyFilter !== "all") r = r.filter((i) => buyoutName(i.buyout_id) === companyFilter);
    if (wbsFilter !== "all") r = r.filter((i) => i.wbs_code === wbsFilter);
    return [...r].sort(byFloat(project));
  }, [items, project, statusFilter, actionFilter, companyFilter, wbsFilter, buyouts]);

  const statusFilters = [
    { k: "all", label: "All" },
    { k: "critical", label: "Critical" },
    { k: "watch", label: "Watch" },
    { k: "healthy", label: "Healthy" },
    { k: "onsite", label: "On Site" },
  ];
  const actionOptions = Object.values(ACTIONS);

  const openItem = items.find((i) => i.id === openId) || null;

  async function quickCopy(e, item) {
    e.stopPropagation();
    await copyItem(item);
    refreshItems();
  }
  async function quickDelete(e, item) {
    e.stopPropagation();
    if (!confirm(`Delete "${item.description || "this item"}"? This cannot be undone.`)) return;
    await deleteItem(item.id);
    refreshItems();
  }

  return (
    <div style={{ minHeight: "100vh", overflowY: "auto" }}>
      <Header title="Procurement Log" sub={`${items.length} materials · sorted by float`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" onClick={() => setShowImport(true)}><Icon.upload /> Import P6</Btn>
            <Btn kind="primary" onClick={() => setShowAdd(true)}><Icon.plus /> Add Item</Btn>
          </div>
        } />

      <div style={{ padding: "16px 28px 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {statusFilters.map((f) => (
            <FilterBtn key={f.k} active={statusFilter === f.k} onClick={() => setStatusFilter(f.k)}>{f.label}</FilterBtn>
          ))}
          <span style={{ width: 1, height: 22, background: C.border, margin: "0 4px" }} />
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={selStyle}>
            <option value="all">All actions</option>
            {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={selStyle}>
            <option value="all">All companies</option>
            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={wbsFilter} onChange={(e) => setWbsFilter(e.target.value)} style={selStyle}>
            <option value="all">All WBS</option>
            {wbsCodes.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          {(statusFilter !== "all" || actionFilter !== "all" || companyFilter !== "all" || wbsFilter !== "all") && (
            <button onClick={() => { setStatusFilter("all"); setActionFilter("all"); setCompanyFilter("all"); setWbsFilter("all"); }}
              style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Clear filters</button>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.mut, marginTop: 8 }}>
          Showing {filtered.length} of {items.length}
        </div>
      </div>

      <div style={{ padding: "12px 28px 48px" }}>
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
                <Th right>Row</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const due = nextActionDue(it, project);
                const overdue = due && diffDays(due, T) < 0;
                const crit = bucket(it, project) === "critical";
                const completed = isP6Completed(it);
                return (
                  <tr key={it.id} onClick={() => setOpenId(it.id)}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: crit ? C.criticalTint : "#fff", opacity: completed ? 0.55 : 1 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = crit ? "#fbe0e0" : "#f7f8fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = crit ? C.criticalTint : "#fff")}>
                    <td style={{ padding: "12px 16px", maxWidth: 280 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {completed && <span title="P6 Completed" style={{ color: C.complete, marginRight: 6, fontSize: 11 }}>✓ done</span>}
                        {it.description || <span style={{ color: C.mut, fontStyle: "italic" }}>(no description)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{buyoutName(it.buyout_id) || "—"}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, color: C.mut, whiteSpace: "nowrap" }}>{it.wbs_code || "—"}</td>
                    <td style={{ padding: "12px 16px" }}><ActionBadge action={actionRequired(it)} small /></td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, whiteSpace: "nowrap" }}>{fmt(parse(it.p6_start_date))}</td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, color: C.mut, whiteSpace: "nowrap" }}>{fmt(projectedDelivery(it, project))}</td>
                    <td style={{ padding: "8px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", justifyContent: "flex-end" }}><FloatChip it={it} project={project} size="md" /></div>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: MONO, fontSize: 12.5, whiteSpace: "nowrap", color: overdue ? C.criticalText : C.ink, fontWeight: overdue ? 700 : 400 }}>
                      {due ? fmt(due) : "—"}{overdue ? ` · ${Math.abs(diffDays(due, T))}d late` : ""}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button title="Copy row" onClick={(e) => quickCopy(e, it)} style={iconBtn}><Icon.copy /></button>
                      <button title="Delete row" onClick={(e) => quickDelete(e, it)} style={{ ...iconBtn, color: C.critical }}><Icon.trash /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.mut }}>
                  {items.length === 0 ? "No items yet. Add one or import a P6 export." : "No materials match these filters."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openItem && (
        <ItemDetail item={openItem} project={project} buyouts={buyouts}
          onClose={() => setOpenId(null)} onChanged={refreshItems} />
      )}
      {showAdd && (
        <AddItemModal projectId={project.id} buyouts={buyouts}
          onClose={() => setShowAdd(false)} onAdded={refreshItems} />
      )}
      {showImport && (
        <P6ImportModal projectId={project.id}
          onClose={() => setShowImport(false)} onImported={refreshItems} />
      )}
    </div>
  );
}

const selStyle = { padding: "6px 10px", fontSize: 12.5, fontWeight: 600, background: "#fff", color: C.ink, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "inherit" };
const iconBtn = { background: "none", border: `1px solid ${C.border}`, padding: "5px 7px", margin: "0 2px", cursor: "pointer", color: C.mut, verticalAlign: "middle" };
