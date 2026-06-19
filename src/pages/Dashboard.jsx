import React from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { C, MONO } from "../theme.js";
import { Icon } from "../components/icons.jsx";
import { Header, Card, CardHead, Stat, FloatChip, ActionBadge, linkBtn } from "../components/ui.jsx";
import { fmt, diffDays, today } from "../lib/dates.js";
import { actionRequired, floatDays, nextActionDue, bucket } from "../lib/formulas.js";

// Sort helper: lower float = more urgent; null float (no need date) sorts last.
function byFloat(project) {
  return (a, b) => {
    const fa = floatDays(a, project);
    const fb = floatDays(b, project);
    if (fa === null && fb === null) return 0;
    if (fa === null) return 1;
    if (fb === null) return -1;
    return fa - fb;
  };
}

export default function Dashboard() {
  const { project, items } = useOutletContext();
  const navigate = useNavigate();
  const T = today();

  const total = items.length;
  const critItems = items.filter((i) => bucket(i, project) === "critical");
  const floatVals = critItems.map((i) => floatDays(i, project)).filter((v) => v !== null);
  const worstLate = floatVals.length ? Math.min(...floatVals) : 0;
  const onSite = items.filter((i) => i.date_on_site).length;
  const thisWeek = items.filter((i) => {
    if (i.date_on_site) return false;
    const due = nextActionDue(i, project);
    return due && diffDays(due, T) <= 7;
  });

  const counts = {
    critical: items.filter((i) => bucket(i, project) === "critical").length,
    watch: items.filter((i) => bucket(i, project) === "watch").length,
    healthy: items.filter((i) => bucket(i, project) === "healthy").length,
    complete: items.filter((i) => bucket(i, project) === "complete").length,
    unknown: items.filter((i) => bucket(i, project) === "unknown").length,
  };

  const priority = [...items].sort(byFloat(project)).slice(0, 6);
  const goLog = () => navigate(`/projects/${project.id}/log`);

  return (
    <div style={{ minHeight: "100vh", overflowY: "auto" }}>
      <Header title="Dashboard" sub="Schedule health across all tracked materials" />
      <div style={{ padding: "22px 28px 40px" }}>
        {total === 0 ? (
          <EmptyState onGo={goLog} />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
              <Stat label="Total Items Tracked" value={total} icon={<Icon.box />} accent={C.accent} />
              <Stat label="Critical / At Risk" value={critItems.length} icon={<Icon.alert />} accent={C.critical}
                note={critItems.length ? `Worst is ${Math.abs(worstLate)} days late` : "All clear"} noteColor={C.criticalText} />
              <Stat label="On Site" value={onSite} icon={<Icon.check />} accent={C.healthy} note="Fully delivered" noteColor={C.healthy} />
              <Stat label="Action Due ≤ 7 Days" value={thisWeek.length} icon={<Icon.clock />} accent={C.watch} note="Includes overdue" noteColor={C.watch} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18 }}>
              <Card pad={0}>
                <CardHead title="Priority Items" sub="Sorted by float — most urgent first"
                  action={<button onClick={goLog} style={linkBtn}>Open log <Icon.arrow /></button>} />
                <div>
                  {priority.map((it, idx) => {
                    const due = nextActionDue(it, project);
                    const overdue = due && diffDays(due, T) < 0;
                    return (
                      <button key={it.id} onClick={goLog} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center", width: "100%", padding: "13px 18px", background: "#fff", border: "none", borderTop: idx ? `1px solid ${C.border}` : "none", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.description || "(no description)"}</div>
                          <div style={{ fontSize: 12, color: C.mut, marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                            <ActionBadge action={actionRequired(it)} small />
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 11, color: C.mut, marginTop: 4 }}>
                            {due ? `Due ${fmt(due)}` : "No need date"} {overdue ? `· ${Math.abs(diffDays(due, T))}d overdue` : ""}
                          </div>
                        </div>
                        <FloatChip it={it} project={project} size="sm" />
                        <span style={{ color: C.mut, display: "flex" }}><Icon.arrow /></span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Float Distribution</div>
                <div style={{ fontSize: 12, color: C.mut, marginBottom: 16 }}>Where every material sits today</div>
                <DistBar counts={counts} />
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <Legend color={C.critical} label="Critical" desc="Negative float" n={counts.critical} />
                  <Legend color={C.watch} label="Watch" desc="0–14 days" n={counts.watch} />
                  <Legend color={C.healthy} label="Healthy" desc="> 14 days" n={counts.healthy} />
                  <Legend color={C.complete} label="Complete" desc="On site" n={counts.complete} />
                  {counts.unknown > 0 && <Legend color={C.border} label="No need date" desc="Can't score yet" n={counts.unknown} />}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DistBar({ counts }) {
  const segs = [
    { c: C.critical, n: counts.critical },
    { c: C.watch, n: counts.watch },
    { c: C.healthy, n: counts.healthy },
    { c: C.complete, n: counts.complete },
    { c: C.border, n: counts.unknown },
  ].filter((s) => s.n > 0);
  if (!segs.length) return <div style={{ height: 40, border: `1px solid ${C.border}` }} />;
  return (
    <div style={{ display: "flex", height: 40, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {segs.map((s, i) => (
        <div key={i} style={{ flex: s.n, background: s.c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: MONO, fontWeight: 700, fontSize: 14, minWidth: 0 }}>{s.n}</div>
      ))}
    </div>
  );
}

function Legend({ color, label, desc, n }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 12, height: 12, background: color, flexShrink: 0 }} />
      <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.mut }}>{desc}</span>
      <span style={{ marginLeft: "auto", fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{n}</span>
    </div>
  );
}

function EmptyState({ onGo }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No materials tracked yet</div>
      <div style={{ color: C.mut, fontSize: 13, marginBottom: 18 }}>
        Import a P6 export or add items manually in the Procurement Log to start tracking float.
      </div>
      <button onClick={onGo} style={{ ...linkBtn, fontSize: 14 }}>Go to Procurement Log <Icon.arrow /></button>
    </div>
  );
}
