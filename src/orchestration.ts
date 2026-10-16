import {
  activityDefinitions,
  administrativeComplete,
  approvedSkills,
  definition,
  id,
  isReady,
  latestEvidence,
  reviewActivity,
  reviewEvidence,
  submissionActivity,
  type Activity,
  type BusinessEvent,
  type EventPayloads,
  type EventType,
  type HistoryEntry,
  type State,
  type WorkflowInstance,
  type WorkItem,
} from "./domain";
export interface OrchestrationPort {
  deliver(state: State, event: BusinessEvent): boolean;
}
export function log(
  s: State,
  w: WorkflowInstance,
  kind: HistoryEntry["kind"],
  message: string,
  eventId?: string,
) {
  w.history.push({ at: s.clock, kind, message, eventId });
}
export function schedule(
  s: State,
  w: WorkflowInstance,
  activity: Activity,
  instructions: string,
  related: { requirementId?: string; qualificationId?: string } = {},
) {
  if (
    s.workItems.some(
      (t) =>
        t.workflowId === w.id &&
        t.activity === activity &&
        t.status === "Open" &&
        t.requirementId === related.requirementId,
    )
  )
    return;
  const d = activityDefinitions[activity];
  const task: WorkItem = {
    id: id(),
    workflowId: w.id,
    companyId: w.companyId,
    applicationId: w.applicationId,
    qualificationId: w.qualificationId,
    ...related,
    activity,
    owner: d.owner,
    status: "Open",
    dueAt: new Date(Date.parse(s.clock) + 2 * 86400000).toISOString(),
    createdAt: s.clock,
    expectedOutcome: d.event,
    instructions,
    completionHistory: [],
  };
  s.workItems.push(task);
  log(s, w, "Activity", `Scheduled ${d.label} → ${d.owner}`);
  if (d.owner !== "Simulation")
    s.outbox.push({
      id: id(),
      companyId: w.companyId,
      at: s.clock,
      recipient: d.owner,
      kind: "Task",
      message: instructions,
      workItemId: task.id,
    });
  updateWaits(s, w);
}
export function updateWaits(s: State, w: WorkflowInstance) {
  w.awaitedEvents = s.workItems
    .filter((t) => t.workflowId === w.id && t.status === "Open")
    .map((t) => ({
      eventType: t.expectedOutcome,
      workItemId: t.id,
      subjectId: t.requirementId ?? t.qualificationId,
    }));
  if (
    w.status === "Running" &&
    w.definitionId === "CompanyOnboarding" &&
    !w.awaitedEvents.length
  )
    w.awaitedEvents.push({ eventType: "ContractorReadinessChanged" });
  w.waitingFor = w.awaitedEvents.map((x) => x.eventType).join(", ") || null;
}
export function makeWorkflow(
  s: State,
  companyId: string,
  definitionId: WorkflowInstance["definitionId"],
  applicationId?: string,
  qualificationId?: string,
  correlationId: string = id(),
): WorkflowInstance {
  const w: WorkflowInstance = {
    id: id(),
    companyId,
    applicationId,
    qualificationId,
    definitionId,
    definitionVersion: 2,
    correlationId,
    status: "Running",
    stage:
      definitionId === "CompanyOnboarding" ? "Screening" : "Awaiting evidence",
    waitingFor: null,
    awaitedEvents: [],
    processedEventIds: [],
    history: [],
  };
  s.workflows.push(w);
  log(s, w, "Lifecycle", `Started ${definitionId} v2`);
  return w;
}
export function envelope<K extends EventType>(
  s: State,
  w: WorkflowInstance,
  eventType: K,
  payload: EventPayloads[K],
  actor: string,
): BusinessEvent {
  return {
    eventId: id(),
    eventType,
    eventVersion: 1,
    occurredAt: s.clock,
    companyId: w.companyId,
    applicationId: w.applicationId,
    qualificationId: w.qualificationId,
    correlationId: w.correlationId,
    actor,
    payload,
  } as BusinessEvent;
}
/** Explicit transitions for two known processes. This adapter is an educational simulation, not Temporal. */
export class LocalOrchestrator implements OrchestrationPort {
  deliver(s: State, e: BusinessEvent): boolean {
    if (s.events.some((x) => x.eventId === e.eventId) || e.eventVersion !== 1)
      return false;
    const c = s.companies.find((x) => x.id === e.companyId);
    if (!c) return false;
    const a = s.applications.find(
      (x) => x.id === e.applicationId && x.companyId === c.id,
    );
    let w = s.workflows.find(
      (x) =>
        x.correlationId === e.correlationId &&
        x.companyId === e.companyId &&
        x.applicationId === e.applicationId &&
        x.qualificationId === e.qualificationId,
    );
    if (e.eventType === "ApplicationSubmitted") {
      if (
        !a ||
        a.status !== "Screening" ||
        e.payload.skill !== a.skill ||
        w ||
        s.workflows.some(
          (x) =>
            x.applicationId === a.id && x.definitionId === "CompanyOnboarding",
        )
      )
        return false;
      w = makeWorkflow(
        s,
        c.id,
        definition.name,
        a.id,
        undefined,
        e.correlationId,
      );
    } else if (e.eventType === "SkillRequested") {
      const q = s.qualifications.find(
        (q) =>
          q.id === e.payload.qualificationId &&
          q.companyId === c.id &&
          q.skill === e.payload.skill,
      );
      if (
        !q ||
        e.applicationId !== q.originatingApplicationId ||
        w ||
        e.qualificationId !== q.id ||
        s.workflows.some((x) => x.qualificationId === q.id)
      )
        return false;
      w = makeWorkflow(
        s,
        c.id,
        "SkillQualification",
        q.originatingApplicationId,
        q.id,
        e.correlationId,
      );
    } else if (!w) return false;
    if (!w) return false;
    if (
      w.status === "Completed" &&
      ![
        "SkillInvalidated",
        "ContractorReadinessChanged",
        "ContractorActivated",
      ].includes(e.eventType)
    )
      return false;
    const workItemId =
      "workItemId" in e.payload ? e.payload.workItemId : undefined;
    const task = workItemId
      ? s.workItems.find(
          (t) =>
            t.id === workItemId &&
            t.workflowId === w!.id &&
            t.companyId === c.id &&
            t.status === "Open",
        )
      : undefined;
    const open = (activity: Activity) =>
      s.workItems.find(
        (t) =>
          t.workflowId === w!.id &&
          t.status === "Open" &&
          t.activity === activity,
      );
    const q = s.qualifications.find(
      (q) => q.id === w!.qualificationId && q.companyId === c.id,
    );
    // Validate correlation, expected activity, subject, current evidence and business preconditions before mutation.
    switch (e.eventType) {
      case "ScreeningDecisionRecorded":
        if (
          !open("ScreenApplication") ||
          !a ||
          !["Proceed", "RequestInformation", "Decline"].includes(
            e.payload.decision,
          ) ||
          (e.payload.decision !== "Proceed" && !e.payload.reason.trim())
        )
          return false;
        break;
      case "AdditionalInformationSubmitted":
        if (!open("ProvideInformation") || !a || !e.payload.text.trim())
          return false;
        break;
      case "EvidenceSubmitted":
        if (
          !task ||
          ![
            "SubmitInsurance",
            "SubmitFinancial",
            "SubmitAgreement",
            "SubmitLicense",
          ].includes(task.activity) ||
          !e.payload.description.trim() ||
          ![
            "Valid demo document",
            "Expired demo document",
            "Incomplete demo document",
          ].includes(e.payload.fixture) ||
          s.evidence.some((x) => x.id === e.payload.evidenceId)
        )
          return false;
        break;
      case "InsuranceReviewCompleted":
      case "FinancialReviewCompleted":
      case "AgreementExecuted": {
        const expected =
          e.eventType === "InsuranceReviewCompleted"
            ? "ReviewInsurance"
            : e.eventType === "FinancialReviewCompleted"
              ? "ReviewFinancial"
              : "ExecuteAgreement";
        if (
          !task ||
          task.activity !== expected ||
          latestEvidence(s, task)?.id !== e.payload.evidenceId
        )
          return false;
        const valid = reviewEvidence(latestEvidence(s, task)!) === "Valid";
        if (e.payload.outcome !== (valid ? "Verified" : "Correction required"))
          return false;
        break;
      }
      case "LicenseReviewCompleted":
        if (
          !task ||
          task.activity !== "VerifyLicense" ||
          latestEvidence(s, task)?.id !== e.payload.evidenceId ||
          e.payload.outcome !== reviewEvidence(latestEvidence(s, task)!)
        )
          return false;
        break;
      case "SkillApproved":
      case "SkillRejected":
        if (
          !task ||
          task.activity !== "ApproveSkill" ||
          !q ||
          q.id !== e.payload.qualificationId ||
          q.status !== "Awaiting approval" ||
          (e.eventType === "SkillRejected" && !e.payload.reason.trim())
        )
          return false;
        break;
      case "SkillInvalidated":
        if (
          !q ||
          q.id !== e.payload.qualificationId ||
          q.status !== "Approved" ||
          !e.payload.reason.trim()
        )
          return false;
        break;
      case "CompanyVendorCreated":
        if (
          !task ||
          task.activity !== "CreateVendor" ||
          !c.adminComplete ||
          c.vendorReference ||
          !e.payload.vendorReference
        )
          return false;
        break;
      case "PortalSetupCompleted":
        if (
          !task ||
          task.activity !== "SetupPortal" ||
          !c.vendorReference ||
          !c.adminComplete
        )
          return false;
        break;
      case "InitialTrainingCompleted":
        if (
          !task ||
          task.activity !== "CompleteTraining" ||
          !c.portalSetupComplete
        )
          return false;
        break;
      case "TrainingConfirmed":
        if (
          !task ||
          task.activity !== "ConfirmTraining" ||
          !c.portalSetupComplete
        )
          return false;
        break;
      case "ContractorReadinessChanged":
        if (
          w.definitionId !== "CompanyOnboarding" ||
          e.payload.ready !== isReady(c, s.qualifications) ||
          e.payload.ready === c.readinessPublished ||
          e.payload.approvedSkillCount !==
            approvedSkills(c.id, s.qualifications).length
        )
          return false;
        break;
      case "ContractorActivated":
        if (
          !task ||
          task.activity !== "PublishActivation" ||
          !isReady(c, s.qualifications) ||
          !c.readinessPublished
        )
          return false;
        break;
    }
    s.events.push(e);
    w.processedEventIds.push(e.eventId);
    log(s, w, "Event", `Received ${e.eventType} · ${e.actor}`, e.eventId);
    const finish = (t: WorkItem, outcome: string) => {
      t.status = "Completed";
      t.outcome = outcome;
      t.completedAt = s.clock;
      t.completionHistory.push({ at: s.clock, outcome, eventId: e.eventId });
      log(
        s,
        w!,
        "Activity",
        `Completed ${activityDefinitions[t.activity].label}: ${outcome}`,
        e.eventId,
      );
    };
    switch (e.eventType) {
      case "ApplicationSubmitted":
        schedule(
          s,
          w,
          "ScreenApplication",
          "Review the company and its requested initial skill.",
        );
        break;
      case "ScreeningDecisionRecorded": {
        finish(open("ScreenApplication")!, e.payload.decision);
        a!.reason = e.payload.reason;
        a!.screeningDecisions.push({
          decision: e.payload.decision,
          reason: e.payload.reason,
          at: s.clock,
        });
        if (e.payload.decision === "Proceed") {
          a!.status = "Onboarding";
          this.beginRequirements(s, w);
        } else if (e.payload.decision === "RequestInformation") {
          a!.status = "Information requested";
          w.stage = "Awaiting information";
          schedule(s, w, "ProvideInformation", e.payload.reason);
        } else {
          a!.status = "Declined";
          w.stage = "Declined";
          w.status = "Completed";
          log(s, w, "Lifecycle", `Closed: ${e.payload.reason}`);
        }
        break;
      }
      case "AdditionalInformationSubmitted":
        finish(open("ProvideInformation")!, "Information submitted");
        a!.responses.push({ text: e.payload.text, at: s.clock });
        a!.status = "Screening";
        w.stage = "Screening";
        schedule(
          s,
          w,
          "ScreenApplication",
          "Review the contractor’s additional information.",
        );
        break;
      case "SkillRequested":
        schedule(
          s,
          w,
          "SubmitLicense",
          `Submit fictional license evidence for ${q!.skill}.`,
        );
        break;
      case "EvidenceSubmitted": {
        const t = task!,
          versions = s.evidence.filter((x) =>
            t.requirementId
              ? x.requirementId === t.requirementId
              : x.qualificationId === t.qualificationId,
          );
        s.evidence.push({
          id: e.payload.evidenceId,
          companyId: c.id,
          requirementId: t.requirementId,
          qualificationId: t.qualificationId,
          version: versions.length + 1,
          submittedAt: s.clock,
          description: e.payload.description,
          fixture: e.payload.fixture,
          verificationState: "Submitted",
        });
        finish(t, `Evidence v${versions.length + 1} submitted`);
        if (t.requirementId) {
          const r = s.requirements.find((r) => r.id === t.requirementId)!;
          r.evidenceIds.push(e.payload.evidenceId);
          r.status = "Under review";
          schedule(
            s,
            w,
            reviewActivity[r.type],
            `Review ${r.type.toLowerCase()} evidence v${versions.length + 1} using the simulated verifier.`,
            { requirementId: r.id },
          );
        } else {
          q!.evidenceIds.push(e.payload.evidenceId);
          q!.status = "Under review";
          w.stage = "License verification";
          schedule(
            s,
            w,
            "VerifyLicense",
            "Verify the latest demo license. An expired result requires replacement; a timeout is retryable.",
          );
        }
        break;
      }
      case "InsuranceReviewCompleted":
      case "FinancialReviewCompleted":
      case "AgreementExecuted": {
        finish(task!, e.payload.outcome);
        const r = s.requirements.find((r) => r.id === task!.requirementId)!;
        r.status = e.payload.outcome;
        r.outcome = e.payload.reason;
        s.evidence.find(
          (x) => x.id === e.payload.evidenceId,
        )!.verificationState = e.payload.outcome;
        log(
          s,
          w,
          "Rule",
          `${r.type}: ${e.payload.outcome} — ${e.payload.reason}`,
          e.eventId,
        );
        if (r.status === "Correction required")
          schedule(s, w, submissionActivity[r.type], e.payload.reason, {
            requirementId: r.id,
          });
        c.adminComplete = administrativeComplete(
          s.requirements.filter((r) => r.companyId === c.id),
        );
        log(
          s,
          w,
          "Rule",
          `AdministrativeRequirementsComplete = ${c.adminComplete}`,
          e.eventId,
        );
        if (c.adminComplete && !c.vendorReference) {
          w.stage = "Vendor provisioning";
          schedule(
            s,
            w,
            "CreateVendor",
            "Provision a fictional vendor after all three administrative approvals.",
          );
        }
        break;
      }
      case "LicenseReviewCompleted": {
        finish(task!, e.payload.outcome);
        const evidence = s.evidence.find((x) => x.id === e.payload.evidenceId)!;
        evidence.verificationState =
          e.payload.outcome === "Valid" ? "Verified" : "Correction required";
        q!.reason = e.payload.reason;
        log(
          s,
          w,
          "Rule",
          `License rule: ${e.payload.outcome}. ${e.payload.reason}`,
          e.eventId,
        );
        if (e.payload.outcome === "Valid") {
          q!.status = "Awaiting approval";
          w.stage = "Field approval";
          schedule(
            s,
            w,
            "ApproveSkill",
            `Decide whether to approve ${q!.skill} after license verification.`,
          );
        } else {
          q!.status = "Correction required";
          w.stage = "Evidence correction";
          schedule(
            s,
            w,
            "SubmitLicense",
            `${e.payload.reason} Replace the license evidence and resubmit.`,
          );
        }
        break;
      }
      case "SkillApproved":
      case "SkillRejected":
        finish(
          task!,
          e.eventType === "SkillApproved" ? "Approved" : "Rejected",
        );
        q!.status = e.eventType === "SkillApproved" ? "Approved" : "Rejected";
        q!.reason = e.payload.reason;
        w.stage = q!.status;
        w.status = "Completed";
        log(
          s,
          w,
          "Lifecycle",
          `Qualification ${q!.status.toLowerCase()}; company onboarding is independent.`,
          e.eventId,
        );
        break;
      case "SkillInvalidated":
        q!.status = "Invalidated";
        q!.reason = e.payload.reason;
        w.stage = "Invalidated";
        log(
          s,
          w,
          "Rule",
          `Approved skill invalidated: ${e.payload.reason}`,
          e.eventId,
        );
        break;
      case "CompanyVendorCreated":
        finish(task!, "Vendor created");
        c.vendorReference = e.payload.vendorReference;
        w.stage = "Portal setup";
        schedule(
          s,
          w,
          "SetupPortal",
          "Confirm the fictional portal profile is configured. No real account is created.",
        );
        break;
      case "PortalSetupCompleted":
        finish(task!, "Portal configured");
        c.portalSetupComplete = true;
        w.stage = "Initial training";
        schedule(
          s,
          w,
          "CompleteTraining",
          "Complete the demo induction: safety basics, job acceptance and network standards.",
        );
        break;
      case "InitialTrainingCompleted":
        finish(task!, "Contractor completed induction");
        w.stage = "Training confirmation";
        schedule(
          s,
          w,
          "ConfirmTraining",
          "Confirm completion of the contractor’s initial induction.",
        );
        break;
      case "TrainingConfirmed":
        finish(task!, "Training confirmed");
        c.initialTrainingComplete = true;
        w.stage = "Waiting for approved skill";
        break;
      case "ContractorReadinessChanged": {
        c.readinessPublished = e.payload.ready;
        s.outbox.push({
          id: id(),
          companyId: c.id,
          at: s.clock,
          recipient: "Contractor",
          kind: "Readiness",
          message: `Eligibility for jobs changed: ${e.payload.ready ? "Ready" : "Not ready"}. ${e.payload.approvedSkillCount} approved skill(s).`,
        });
        if (e.payload.ready) {
          if (c.activationStatus !== "Active") {
            w.stage =
              w.status === "Completed"
                ? "Reactivation pending"
                : "Activation pending";
            schedule(
              s,
              w,
              "PublishActivation",
              "Publish derived readiness to the simulated contractor management system.",
            );
          }
        } else {
          c.activationStatus =
            c.activationStatus === "Active" ? "Suspended" : "Pending";
          const pending = s.workItems.find(
            (t) =>
              t.workflowId === w!.id &&
              t.activity === "PublishActivation" &&
              t.status === "Open",
          );
          if (pending)
            finish(
              pending,
              "Superseded: readiness prerequisites no longer satisfied",
            );
          log(
            s,
            w,
            "Rule",
            "Eligibility removed immediately; no manual activation can bypass readiness.",
            e.eventId,
          );
        }
        break;
      }
      case "ContractorActivated":
        finish(task!, "Activation published");
        c.activationStatus = "Active";
        w.stage = "Onboarding complete";
        w.status = "Completed";
        if (a) a.status = "Ready";
        log(
          s,
          w,
          "Lifecycle",
          "Initial onboarding complete. Additional skills run independently.",
          e.eventId,
        );
        break;
    }
    updateWaits(s, w);
    if (w.waitingFor)
      log(s, w, "Wait", `Waiting for ${w.waitingFor}`, e.eventId);
    this.evaluateReadiness(s, c.id, e.eventId);
    return true;
  }
  beginRequirements(s: State, w: WorkflowInstance) {
    w.stage = "Administrative checks";
    for (const type of ["Insurance", "Financial", "Agreement"] as const) {
      let r = s.requirements.find(
        (r) => r.companyId === w.companyId && r.type === type,
      );
      if (!r) {
        r = {
          id: id(),
          companyId: w.companyId,
          type,
          applicable: true,
          status: "Awaiting evidence",
          evidenceIds: [],
        };
        s.requirements.push(r);
      }
      if (r.status !== "Verified")
        schedule(
          s,
          w,
          submissionActivity[type],
          `Submit a fictional ${type.toLowerCase()} demo pack. Never enter real tax, banking or identity numbers.`,
          { requirementId: r.id },
        );
    }
    const a = s.applications.find((a) => a.id === w.applicationId)!;
    const existing = s.qualifications.find(
      (q) => q.originatingApplicationId === a.id,
    );
    if (!existing) this.startSkill(s, w.companyId, a.skill, a.id, "Workflow");
    else if (
      !s.workflows.some((child) => child.qualificationId === existing.id)
    ) {
      this.deliver(s, {
        eventId: id(),
        eventType: "SkillRequested",
        eventVersion: 1,
        occurredAt: s.clock,
        companyId: w.companyId,
        applicationId: a.id,
        qualificationId: existing.id,
        correlationId: id(),
        actor: "Workflow migration",
        payload: { qualificationId: existing.id, skill: existing.skill },
      });
    }
  }
  startSkill(
    s: State,
    companyId: string,
    skill: string,
    applicationId?: string,
    actor = "Contractor",
  ) {
    const qualificationId = id();
    s.qualifications.push({
      id: qualificationId,
      companyId,
      originatingApplicationId: applicationId,
      skill,
      status: "Awaiting evidence",
      evidenceIds: [],
    });
    const event: BusinessEvent = {
      eventId: id(),
      eventType: "SkillRequested",
      eventVersion: 1,
      occurredAt: s.clock,
      companyId,
      applicationId,
      qualificationId,
      correlationId: id(),
      actor,
      payload: { qualificationId, skill },
    };
    if (!this.deliver(s, event))
      throw new Error("Could not start skill qualification.");
    return qualificationId;
  }
  evaluateReadiness(s: State, companyId: string, eventId: string) {
    const c = s.companies.find((c) => c.id === companyId)!,
      root = s.workflows.find(
        (w) =>
          w.companyId === companyId && w.definitionId === "CompanyOnboarding",
      );
    if (!root || root.stage === "Declined") return;
    const ready = isReady(c, s.qualifications);
    log(
      s,
      root,
      "Rule",
      `Readiness = admin ${c.adminComplete} ∧ portal ${c.portalSetupComplete} ∧ training ${c.initialTrainingComplete} ∧ approved skills ${approvedSkills(c.id, s.qualifications).length} ≥ 1 → ${ready}`,
      eventId,
    );
    if (ready !== c.readinessPublished)
      this.deliver(
        s,
        envelope(
          s,
          root,
          "ContractorReadinessChanged",
          {
            ready,
            approvedSkillCount: approvedSkills(c.id, s.qualifications).length,
          },
          "Domain policy",
        ),
      );
  }
}
