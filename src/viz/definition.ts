import {
  activityDefinitions,
  definition,
  skillDefinition,
  type Activity,
  type WorkflowInstance,
} from "../domain";
import { activityLabel } from "../presentation";
import type { MapDefinition, MapNode } from "./types";

/** Versioned projection adapter for the compiled v2 transitions in orchestration.ts.
 * Static routes are possible paths, never evidence that a route actually ran.
 * The full adapter is pinned in each recording, independently of future releases. */
export function mapDefinition(workflow: WorkflowInstance): MapDefinition {
  if (workflow.definitionVersion !== 2)
    throw new Error(
      "Viz supports workflow definition v2. This legacy execution is available in diagnostics only.",
    );
  const graph: MapDefinition = {
    adapterVersion: 1,
    workflowName: workflow.definitionId,
    workflowVersion: 2,
    nodes: [],
    edges: [],
  };
  const node = (
    id: string,
    label: string,
    group: string,
    kind: MapNode["kind"],
    owner = "Workflow",
    scope?: MapNode["scope"],
  ) => graph.nodes.push({ id, label, group, kind, owner, scope });
  const activity = (
    a: Activity,
    group: string,
    scope: MapNode["scope"] = "company",
  ) =>
    graph.nodes.push({
      id: a,
      label: activityLabel(a),
      group,
      kind: "activity",
      owner:
        activityDefinitions[a].owner === "Simulation"
          ? "Automations & Integrations"
          : activityDefinitions[a].owner,
      activity: a,
      scope,
    });
  const edge = (
    source: string,
    target: string,
    label?: string,
    route?: string,
  ) =>
    graph.edges.push({
      id: `${source}:${target}`,
      source,
      target,
      label,
      route,
    });
  const chain = (...ids: string[]) =>
    ids.slice(1).forEach((id, i) => edge(ids[i], id));
  function skill() {
    activity("SubmitLicense", "Skill qualification", "skill");
    activity("VerifyLicense", "Skill qualification", "skill");
    node(
      "license-decision",
      "License valid?",
      "Skill qualification",
      "decision",
      "Compliance",
      "skill",
    );
    node(
      "license-correction",
      "Replace license evidence",
      "Skill qualification",
      "decision",
      "Contractor",
      "skill",
    );
    activity("ApproveSkill", "Skill qualification", "skill");
    node(
      "skill-decision",
      "Qualification decision",
      "Skill qualification",
      "decision",
      "Field Manager",
      "skill",
    );
    node(
      "skill-approved",
      "Company skill approved",
      "Skill qualification",
      "end",
      "Field Manager",
      "skill",
    );
    node(
      "skill-rejected",
      "Skill not approved",
      "Skill qualification",
      "end",
      "Field Manager",
      "skill",
    );
    chain("SubmitLicense", "VerifyLicense", "license-decision");
    edge("license-decision", "ApproveSkill", "Valid", "license-valid");
    edge(
      "license-decision",
      "license-correction",
      "Replace",
      "license-correction",
    );
    edge(
      "license-correction",
      "SubmitLicense",
      "Resubmit",
      "license-correction",
    );
    chain("ApproveSkill", "skill-decision");
    edge("skill-decision", "skill-approved", "Approved", "skill-approved");
    edge("skill-decision", "skill-rejected", "Rejected", "skill-rejected");
  }
  node(
    "origin",
    workflow.definitionId === "CompanyOnboarding"
      ? "Company application received"
      : "Company skill requested",
    "Starting point",
    "event",
  );
  if (workflow.definitionId === "CompanyOnboarding") {
    activity("ScreenApplication", "Starting point");
    node(
      "screening-decision",
      "Proceed with onboarding?",
      "Starting point",
      "decision",
      "Recruitment",
    );
    activity("ProvideInformation", "Starting point");
    node(
      "declined",
      "Application declined",
      "Starting point",
      "end",
      "Recruitment",
    );
    node("parallel", "Teams work in parallel", "Starting point", "event");
    chain("origin", "ScreenApplication", "screening-decision");
    edge(
      "screening-decision",
      "ProvideInformation",
      "More information",
      "information",
    );
    edge(
      "ProvideInformation",
      "ScreenApplication",
      "Review again",
      "information",
    );
    edge("screening-decision", "declined", "Decline", "declined");
    edge("screening-decision", "parallel", "Proceed", "proceed");
    for (const [name, submit, review] of [
      ["Insurance", "SubmitInsurance", "ReviewInsurance"],
      ["Finance", "SubmitFinancial", "ReviewFinancial"],
      ["Agreement", "SubmitAgreement", "ExecuteAgreement"],
    ] as const) {
      activity(submit, name);
      activity(review, name);
      node(
        `${name}-decision`,
        "Evidence accepted?",
        name,
        "decision",
        activityDefinitions[review].owner,
      );
      node(
        `${name}-correction`,
        "Replace supporting evidence",
        name,
        "decision",
        "Contractor",
      );
      node(
        `${name}-accepted`,
        `${name === "Finance" ? "Financial pack" : name} verified`,
        name,
        "end",
        activityDefinitions[review].owner,
      );
      chain("parallel", submit, review, `${name}-decision`);
      edge(
        `${name}-decision`,
        `${name}-accepted`,
        "Verified",
        `${name}-accepted`,
      );
      edge(
        `${name}-decision`,
        `${name}-correction`,
        "Replace",
        `${name}-correction`,
      );
      edge(`${name}-correction`, submit, "Resubmit", `${name}-correction`);
      edge(`${name}-accepted`, "admin-join");
    }
    node(
      "admin-join",
      "Administration approved",
      "Enablement",
      "join",
      "Compliance · Finance · Contractor Relations",
    );
    for (const a of [
      "CreateVendor",
      "SetupPortal",
      "CompleteTraining",
      "ConfirmTraining",
    ] as const)
      activity(a, "Enablement");
    chain(
      "admin-join",
      "CreateVendor",
      "SetupPortal",
      "CompleteTraining",
      "ConfirmTraining",
      "readiness-join",
    );
    skill();
    edge("parallel", "SubmitLicense");
    edge("skill-approved", "readiness-join");
    edge("admin-join", "readiness-join", "Administrative prerequisite");
    node(
      "readiness-join",
      "Ready for activation",
      "Activation",
      "join",
      "All teams",
    );
    activity("PublishActivation", "Activation");
    node("complete", "Onboarding completed", "Activation", "end", "Operations");
    chain("readiness-join", "PublishActivation", "complete");
  } else {
    skill();
    edge("origin", "SubmitLicense");
  }
  const expected =
    workflow.definitionId === "CompanyOnboarding"
      ? [...definition.activities, ...skillDefinition.activities]
      : skillDefinition.activities;
  if (expected.some((a) => !graph.nodes.some((n) => n.activity === a)))
    throw new Error(
      "Viz adapter does not cover the workflow activity catalog.",
    );
  return graph;
}
