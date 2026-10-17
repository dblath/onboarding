import { activityDefinitions, type Activity } from "./domain";

/** Display labels only: stored activity names, evidence values and events stay intact. */
export const activityLabel = (activity: Activity) =>
  activity === "CreateVendor"
    ? "Create vendor record"
    : activity === "PublishActivation"
      ? "Publish contractor activation"
      : activityDefinitions[activity].label.replace(/\bdemo\b/g, "simulated");

/** Translate only known system messages; never rewrite company names or free text. */
export function simulationMessage(message: string) {
  const labels: Record<string, string> = {
    "Demo verification passed.": "Simulated verification passed.",
    "The demo document is expired. Submit a current replacement.":
      "The simulated document is expired. Submit a current replacement.",
    "The demo pack is incomplete. Submit a complete replacement.":
      "The simulated pack is incomplete. Submit a complete replacement.",
    "Enter a valid demo email.": "Enter a valid email address.",
    "Advance between 1 and 30 whole demo days.":
      "Advance between 1 and 30 whole simulation days.",
    "Shared writes are disabled. This demo needs Chrome with Web Locks and BroadcastChannel on localhost or HTTPS. No unsafe writes will be attempted.":
      "Shared writes are disabled. Unity fieldwork requires Chrome with Web Locks and BroadcastChannel on localhost or HTTPS. No unsafe writes will be attempted.",
  };
  return labels[message] ?? message;
}

export function automationLink(companyId = "", activityId = "") {
  const query = new URLSearchParams({ view: "automations" });
  if (companyId) query.set("company", companyId);
  if (activityId) query.set("activity", activityId);
  return `#/monitor?${query}`;
}

export function monitorContext() {
  const [path, query] = window.location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  return {
    automation: path === "/monitor" && params.get("view") === "automations",
    journey: path === "/monitor" && params.get("view") === "journey",
    workspace: path === "/monitor" && params.get("view") === "workspace",
    triggers: path === "/monitor" && params.get("view") === "triggers",
    companyId: params.get("company") ?? "",
    activityId: params.get("activity") ?? "",
  };
}
