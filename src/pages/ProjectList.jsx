import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, MONO } from "../theme.js";
import { Icon } from "../components/icons.jsx";
import { Btn } from "../components/ui.jsx";
import { listProjects } from "../lib/db.js";
import { supabaseConfigured } from "../supabaseClient.js";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100%", background: C.bg }}>
      <div style={{ background: C.charcoal, color: "#fff", padding: "24px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: C.accent, display: "flex" }}><Icon.box width={22} height={22} /></span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#7e8aa0" }}>Okland Construction</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Material Procurement</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Btn kind="primary" onClick={() => navigate("/projects/new")}><Icon.plus /> New Project</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Projects</h1>
        <div style={{ fontSize: 13, color: C.mut, marginBottom: 20 }}>
          Pick a project to manage its procurement log, or create a new one.
        </div>

        {!supabaseConfigured && (
          <Banner kind="warn">
            Supabase isn't configured. Copy <code>.env.example</code> to <code>.env</code>,
            set your project URL + anon key, and restart <code>npm run dev</code>.
          </Banner>
        )}
        {error && (
          <Banner kind="error">
            Couldn't load projects: {error}. Make sure you've run <code>supabase/schema.sql</code> in
            your Supabase SQL editor and that your <code>.env</code> values are correct.
          </Banner>
        )}

        {loading ? (
          <div style={{ color: C.mut, padding: 24 }}>Loading…</div>
        ) : projects.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, padding: 40, textAlign: "center" }}>
            <div style={{ color: C.mut, marginBottom: 16 }}>No projects yet.</div>
            <Btn kind="primary" onClick={() => navigate("/projects/new")}><Icon.plus /> Create your first project</Btn>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}/dashboard`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, padding: 18, height: "100%" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: C.mut, marginTop: 4 }}>
                    {p.number ? `#${p.number}` : "—"}{p.project_type ? ` · ${p.project_type}` : ""}
                  </div>
                  {p.client && <div style={{ fontSize: 12.5, color: C.mut, marginTop: 8 }}>{p.client}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Banner({ kind, children }) {
  const palette = kind === "error"
    ? { bg: C.criticalTint, bar: C.critical, fg: C.criticalText }
    : { bg: C.watchTint, bar: C.watch, fg: C.watch };
  return (
    <div style={{ background: palette.bg, borderLeft: `4px solid ${palette.bar}`, color: palette.fg, padding: "12px 16px", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}
