// Status → color mappings (ported from the reference's floatStyle/actionColor).
import { C } from "../theme.js";
import { ACTIONS, bucket } from "./formulas.js";

export function floatStyle(it, project) {
  const b = bucket(it, project);
  if (b === "critical")
    return { fg: C.criticalText, bg: C.criticalTint, bar: C.critical };
  if (b === "watch") return { fg: C.watch, bg: C.watchTint, bar: C.watch };
  if (b === "healthy") return { fg: C.healthy, bg: C.healthyTint, bar: C.healthy };
  if (b === "unknown") return { fg: C.mut, bg: C.completeTint, bar: C.border };
  return { fg: C.complete, bg: C.completeTint, bar: C.complete }; // complete
}

export function actionColor(action) {
  switch (action) {
    case ACTIONS.ON_SITE:
      return C.healthy;
    case ACTIONS.AWAITING_DELIVERY:
      return C.accent;
    case ACTIONS.ORDER_MATERIAL:
      return C.watch;
    case ACTIONS.AWAITING_AE:
      return "#7c3aed";
    case ACTIONS.GC_REVIEW:
      return "#0891b2";
    case ACTIONS.REQUEST_SUBMITTAL:
      return "#db2777";
    case ACTIONS.ISSUE_WO:
      return C.mut;
    default:
      return C.mut;
  }
}
