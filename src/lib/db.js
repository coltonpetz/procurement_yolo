// Thin data-access layer over Supabase. Keeps pages free of query plumbing.
import { supabase } from "../supabaseClient.js";
import { logChange } from "./audit.js";

// ── Projects ─────────────────────────────────────────────────────────────────
export async function listProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProject(fields) {
  const { data, error } = await supabase
    .from("projects")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id, fields) {
  const { data, error } = await supabase
    .from("projects")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Procurement items ────────────────────────────────────────────────────────
export async function listItems(projectId) {
  const { data, error } = await supabase
    .from("procurement_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createItem(fields) {
  const { data, error } = await supabase
    .from("procurement_items")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update one or more fields on an item, writing an audit row per changed field.
// `prev` is the pre-edit item so we can capture old values. Pass note/by via opts.
export async function updateItem(id, changes, prev = {}, opts = {}) {
  const { data, error } = await supabase
    .from("procurement_items")
    .update(changes)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  // Audit each field that actually changed.
  for (const [field, newValue] of Object.entries(changes)) {
    const oldValue = prev[field];
    if (String(oldValue ?? "") !== String(newValue ?? "")) {
      await logChange({ itemId: id, field, oldValue, newValue, note: opts.note });
    }
  }
  return data;
}

export async function deleteItem(id) {
  const { error } = await supabase.from("procurement_items").delete().eq("id", id);
  if (error) throw error;
}

// Copy an item: clone all editable fields, blank the actual dates so the copy
// starts fresh in the workflow. Returns the new row.
export async function copyItem(item) {
  const clone = { ...item };
  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;
  // Reset workflow actuals so the copy begins at "Issue Work Order".
  [
    "date_wo_sent",
    "date_submittal_received",
    "date_submittal_to_ae",
    "date_returned_from_ae",
    "date_material_ordered",
    "date_communicated_delivery",
    "date_trade_shop_delivery",
    "date_on_site",
  ].forEach((f) => (clone[f] = null));
  clone.description = clone.description ? `${clone.description} (copy)` : "(copy)";
  return createItem(clone);
}

// ── Buyout log ───────────────────────────────────────────────────────────────
export async function listBuyouts(projectId) {
  const { data, error } = await supabase
    .from("buyout_log")
    .select("*")
    .eq("project_id", projectId)
    .order("company_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createBuyout(fields) {
  const { data, error } = await supabase
    .from("buyout_log")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBuyout(id, fields) {
  const { data, error } = await supabase
    .from("buyout_log")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBuyout(id) {
  const { error } = await supabase.from("buyout_log").delete().eq("id", id);
  if (error) throw error;
}
