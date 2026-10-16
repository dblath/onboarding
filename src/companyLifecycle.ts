import {
  companyLifecycleCorrelation,
  id,
  isJobEligible,
  type BusinessEvent,
  type ContractorCompany,
  type State,
} from "./domain";

/** Company facts and operational policy outlive initial workflow execution. */
export function applyReadinessChange(
  s: State,
  c: ContractorCompany,
  event: Extract<BusinessEvent, { eventType: "ContractorReadinessChanged" }>,
) {
  c.readinessPublished = event.payload.ready;
  if (!event.payload.ready && c.activationStatus === "Active") {
    c.activationStatus = "Suspended";
    const suspension: BusinessEvent = {
      eventId: id(),
      eventVersion: 1,
      eventType: "ContractorSuspended",
      occurredAt: s.clock,
      companyId: c.id,
      correlationId: companyLifecycleCorrelation(c.id),
      actor: "Operational policy",
      payload: {
        reason:
          "Readiness prerequisites are no longer satisfied. Removing suspension requires an administrative request and approval in Iteration 4.",
        causedByEventId: event.eventId,
      },
    };
    s.events.push(suspension);
    s.outbox.push({
      id: id(),
      companyId: c.id,
      at: s.clock,
      recipient: "Contractor",
      kind: "Operational",
      message: suspension.payload.reason,
    });
  }
  // Regaining readiness never clears Suspended. No reinstatement command exists in 3.1.
  s.outbox.push({
    id: id(),
    companyId: c.id,
    at: s.clock,
    recipient: "Contractor",
    kind: "Readiness",
    message: `Readiness changed: ${event.payload.ready ? "Ready" : "Not ready"}. Job eligibility: ${isJobEligible(c, s.qualifications) ? "Eligible" : "Not eligible"}. Operational status: ${c.activationStatus}.`,
  });
}
