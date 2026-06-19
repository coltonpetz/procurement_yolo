// Buyout status cascade.
// CLAUDE.md: buyout status (loi_only → work_order_issued → work_order_executed)
// cascades into which Action Required states are reachable for linked items.
//
// Practical interpretation for the MVP:
//  • loi_only          → a Letter of Intent exists but no Work Order. You should
//                        NOT have a Work Order Sent date yet.
//  • work_order_issued → the Work Order has been issued; the procurement flow
//                        (submittals, A/E review, ordering) can proceed.
//  • work_order_executed → fully bought out; no gating.

export const BUYOUT_STATUS = {
  loi_only: "LOI Only",
  work_order_issued: "Work Order Issued",
  work_order_executed: "Work Order Executed",
};

export const BUYOUT_ORDER = ["loi_only", "work_order_issued", "work_order_executed"];

// Can a Work Order be sent (date_wo_sent recorded) given the buyout status?
export function buyoutAllowsWorkOrder(status) {
  return status === "work_order_issued" || status === "work_order_executed";
}

// Returns a human-readable warning if the item's recorded progress is ahead of
// what its linked buyout status permits, else null. Items with no buyout link
// are unconstrained.
export function buyoutMismatch(item, buyout) {
  if (!buyout) return null;
  if (item.date_wo_sent && !buyoutAllowsWorkOrder(buyout.status)) {
    return `Work Order Sent is recorded, but ${buyout.company_name}'s buyout status is "${
      BUYOUT_STATUS[buyout.status] || buyout.status
    }". A Work Order should only be sent once the buyout reaches "Work Order Issued".`;
  }
  return null;
}
