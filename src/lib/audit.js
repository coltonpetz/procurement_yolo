// Audit logging — record what changed, who changed it, when, and (optionally) why.
// MVP auth is stubbed: "who" comes from a name the user types, persisted in
// localStorage so it sticks between edits.
import { supabase } from "../supabaseClient.js";

const USER_KEY = "procurement.currentUser";

export function getCurrentUser() {
  return localStorage.getItem(USER_KEY) || "";
}
export function setCurrentUser(name) {
  localStorage.setItem(USER_KEY, name || "");
}

// Record a single field change. Fire-and-forget friendly, but returns the
// promise so callers can await/handle errors. old/new are stringified.
export async function logChange({ itemId, field, oldValue, newValue, note }) {
  const entry = {
    item_id: itemId,
    field_changed: field,
    old_value: oldValue === null || oldValue === undefined ? null : String(oldValue),
    new_value: newValue === null || newValue === undefined ? null : String(newValue),
    changed_by: getCurrentUser() || "unknown",
    note: note || null,
  };
  const { error } = await supabase.from("audit_log").insert(entry);
  if (error) console.error("audit log insert failed:", error.message);
  return { error };
}

// Fetch audit history for an item, newest first.
export async function fetchAudit(itemId) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("item_id", itemId)
    .order("changed_at", { ascending: false });
  if (error) {
    console.error("audit fetch failed:", error.message);
    return [];
  }
  return data || [];
}
