import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useParams, useNavigate, Link } from "react-router-dom";
import { C, MONO, SANS } from "../theme.js";
import { Icon } from "../components/icons.jsx";
import { fmt, today } from "../lib/dates.js";
import { bucket } from "../lib/formulas.js";
import { getProject, listItems, listBuyouts } from "../lib/db.js";
import { getCurrentUser, setCurrentUser } from "../lib/audit.js";

// Loads a project + its items + buyouts, renders the charcoal sidebar shell,
// and hands everything to nested routes through the Outlet context.
export default function ProjectLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [buyouts, setBuyouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(getCurrentUser());

  const reload = useCallback(async () => {
    const [p, its, bos] = await Promise.all([
      getProject(projectId),
      listItems(projectId),
      listBuyouts(projectId),
    ]);
    setProject(p);
    setItems(its);
    setBuyouts(bos);
    return { project: p, items: its, buyouts: bos };
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [reload]);

  // Lightweight refreshers so child pages can refetch a slice after a mutation.
  const refreshItems = useCallback(async () => {
    setItems(await listItems(projectId));
  }, [projectId]);
  const refreshBuyouts = useCallback(async () => {
    setBuyouts(await listBuyouts(projectId));
  }, [projectId]);

  if (loading) {
    return <Centered>Loading project…</Centered>;
  }
  if (error || !project) {
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: C.criticalText, marginBottom: 10 }}>
            Couldn't load this project{error ? `: ${error}` : "."}
          </div>
          <Link to="/" style={{ color: C.accent, fontWeight: 600 }}>← Back to projects</Link>
        </div>
      </Centered>
    );
  }

  const critical = items.filter((i) => bucket(i, project) === "critical").length;

  const ctx = { project, items, buyouts, reload, refreshItems, refreshBuyouts, user };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: SANS, color: C.ink, background: C.bg, fontSize: 14 }}>
      <aside style={{ width: 236, background: C.charcoal, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "18px 18px 16px", borderBottom: "1px solid #2b3447" }}>
          <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#7e8aa0", cursor: "pointer", padding: 0, marginBottom: 14, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: SANS }}>
            <Icon.box width={15} height={15} /> All Projects
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{project.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: "#7e8aa0", marginTop: 3 }}>
            {project.number ? `#${project.number}` : "—"}
          </div>
          {project.client && (
            <div style={{ fontSize: 11, color: "#7e8aa0", marginTop: 8, lineHeight: 1.4 }}>{project.client}</div>
          )}
        </div>

        <nav style={{ padding: "12px 0", flex: 1 }}>
          <NavItem to={`/projects/${projectId}/dashboard`} icon={<Icon.grid />} label="Dashboard" badge={critical} />
          <NavItem to={`/projects/${projectId}/log`} icon={<Icon.list />} label="Procurement Log" />
          <NavItem to={`/projects/${projectId}/buyout`} icon={<Icon.building />} label="Buyout Log" />
        </nav>

        <div style={{ padding: "14px 18px", borderTop: "1px solid #2b3447" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#7e8aa0", marginBottom: 6 }}>Signed in as</div>
          <input
            value={user}
            onChange={(e) => { setUser(e.target.value); setCurrentUser(e.target.value); }}
            placeholder="Your name"
            style={{ width: "100%", padding: "6px 8px", background: "#2b3447", border: "1px solid #3a4357", color: "#fff", fontSize: 12.5, fontFamily: SANS }}
          />
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#7e8aa0", marginTop: 10 }}>Today · {fmt(today())}</div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <Outlet context={ctx} />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 18px",
      background: isActive ? "#2b3447" : "transparent", textDecoration: "none",
      borderLeft: isActive ? `3px solid ${C.accent}` : "3px solid transparent",
      color: isActive ? "#fff" : "#9aa3b5", fontSize: 13.5, fontWeight: 600,
    })}>
      {icon}{label}
      {badge > 0 && (
        <span style={{ marginLeft: "auto", background: C.critical, color: "#fff", fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{badge}</span>
      )}
    </NavLink>
  );
}

function Centered({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: C.mut, fontFamily: SANS }}>
      {children}
    </div>
  );
}
