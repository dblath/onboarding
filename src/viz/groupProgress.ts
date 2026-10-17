import type { MapDefinition, VisualFrame } from "./types";

/** Current applicable activity stages, not history entries or possible future loops.
 * Only the selected immutable frame and its pinned topology are consulted. */
export function groupProgress(
  definition: MapDefinition,
  frame: VisualFrame,
  group: string,
) {
  const activities = definition.nodes.filter(
    (n) => n.group === group && n.kind === "activity",
  );
  const company = definition.nodes.some((n) => n.id === "ScreenApplication");
  const proceeded = frame.nodes.parallel?.status === "complete";
  const declined = frame.nodes.declined?.status === "error";
  if (company && !proceeded && !declined)
    return {
      label: group === "Starting point" ? "Decision pending" : "Route pending",
      remaining: undefined,
      activities: [] as string[],
    };
  if (company && declined && group !== "Starting point")
    return { label: "Not required", remaining: 0, activities: [] as string[] };
  const applicable = activities.filter(
    (n) =>
      n.id !== "ProvideInformation" || frame.nodes[n.id].status !== "neutral",
  );
  const unfinished = applicable.filter(
    (n) =>
      frame.nodes[n.id].status !== "complete" &&
      !(frame.nodes[n.id].status === "neutral" && frame.nodes[n.id].workItemId),
  );
  const cancelled = applicable.some(
    (n) =>
      frame.nodes[n.id].status === "neutral" && frame.nodes[n.id].workItemId,
  );
  const ids = new Set(unfinished.map((n) => n.id));
  // An open replacement submission makes verification applicable again, even
  // while the preceding verification remains correctly recorded as completed.
  for (const [submit, review] of [
    ["SubmitInsurance", "ReviewInsurance"],
    ["SubmitFinancial", "ReviewFinancial"],
    ["SubmitAgreement", "ExecuteAgreement"],
    ["SubmitLicense", "VerifyLicense"],
  ]) {
    if (
      activities.some((n) => n.id === submit) &&
      ["waiting", "error"].includes(frame.nodes[submit]?.status) &&
      frame.nodes[review]?.status === "complete"
    )
      ids.add(review);
  }
  const remaining = ids.size;
  return {
    label: remaining
      ? `${remaining} remaining`
      : cancelled
        ? "Blocked"
        : "Complete",
    remaining,
    activities: [...ids],
  };
}
