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

/** UI-only vocabulary. Legacy helpers above also feed immutable Viz recordings;
 * keep their output stable. Never apply this adapter to company names or free text. */
export function businessText(text: string) {
  return text
    .replace(/\bsimulated\b/gi, (word) =>
      word[0] === word[0].toUpperCase() ? "Test" : "test",
    )
    .replace(/\bsimulation(?:-only)?\b/gi, (word) =>
      word[0] === word[0].toUpperCase() ? "Test" : "test",
    )
    .replace(/\bdemo document\b/gi, "sample document")
    .replace(/\bdemo pack\b/gi, "sample pack");
}

export const businessActivityLabel = (activity: Activity) => {
  const labels: Partial<Record<Activity, string>> = {
    SubmitAgreement: "Submit contractor agreement",
    ExecuteAgreement: "Review contractor agreement",
    SetupPortal: "Complete company profile",
  };
  return labels[activity] ?? businessText(activityLabel(activity));
};

/** Exact system outcomes only; user decisions, reasons and names remain verbatim. */
export function businessMessage(message: string): string {
  const known = simulationMessage(message);
  if (known !== message) return businessText(known);
  if (
    /^(?:Simulated|Test) (?:integration timeout|timeout|verification passed)/i.test(
      message,
    )
  )
    return businessText(message);
  if (
    /^Review (?:insurance|financial|agreement) evidence v\d+ using the simulated verifier\.$/i.test(
      message,
    )
  )
    return businessText(message);
  const waiting = /^(Waiting for [^.]+\. )(.+)$/s.exec(message);
  if (waiting) return waiting[1] + businessMessage(waiting[2]);
  if (
    /^(?:Reminder: .+ is overdue\.|Escalation: .+ has overdue work — .+\.|Reminder sent in-app to .+: .+|Escalated overdue .+ to Contractor Relations)$/.test(
      message,
    )
  )
    return businessText(message);
  return message;
}

export function automationLink(companyId = "", activityId = "") {
  const query = new URLSearchParams({ view: "automations" });
  if (companyId) query.set("company", companyId);
  if (activityId) query.set("activity", activityId);
  return `#/monitor?${query}`;
}

export function workflowMonitorLink(companyId: string) {
  return `#/monitor?${new URLSearchParams({ view: "inspection", company: companyId })}`;
}

export function monitorContext() {
  const [path, query] = window.location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  return {
    inspection: path === "/monitor" && params.get("view") === "inspection",
    automation: path === "/monitor" && params.get("view") === "automations",
    journey: path === "/monitor" && params.get("view") === "journey",
    workspace: path === "/monitor" && params.get("view") === "workspace",
    triggers: path === "/monitor" && params.get("view") === "triggers",
    companyId: params.get("company") ?? "",
    activityId: params.get("activity") ?? "",
  };
}
