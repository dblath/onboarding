import { expect, it } from "vitest";
import { qualificationChoices } from "./qualificationChoices";
import { contractorStates } from "../tests/fixtures/contractorStates";
import { testService } from "./testing";
import type { Activity } from "./domain";

it("blocks approved and outstanding skills; preserves actual rejected/invalidated requalification commands", async () => {
  const { states } = await contractorStates();
  let state = structuredClone(states.eligible);
  const service = testService({
    load: async () => structuredClone(state),
    save: async (next) => {
      state = structuredClone(next);
    },
  });
  const company = state.companies[0];
  expect(
    qualificationChoices(state, company.id).map((c) => c.available),
  ).toEqual([false, true]);
  const task = (activity: Activity) =>
    state.workItems.find((t) => t.activity === activity && t.status === "Open")!
      .id;
  const review = async (approve: boolean) => {
    await service.submitEvidence(task("SubmitLicense"), "Valid demo document");
    await service.executeActivity(task("VerifyLicense"));
    await service.decideSkill(
      task("ApproveSkill"),
      approve,
      "Qualification review complete.",
    );
  };
  await service.requestSkill(company.id, "Plumbing");
  expect(
    qualificationChoices(state, company.id).map((c) => c.available),
  ).toEqual([false, false]);
  await expect(service.requestSkill(company.id, "Plumbing")).rejects.toThrow(
    "already approved or in progress",
  );
  await review(false);
  expect(qualificationChoices(state, company.id)[1].available).toBe(true);
  await service.requestSkill(company.id, "Plumbing");
  await review(true);
  expect(qualificationChoices(state, company.id)[1].available).toBe(false);
  const plumbing = state.qualifications.find(
    (q) => q.skill === "Plumbing" && q.status === "Approved",
  )!;
  await service.invalidateSkill(plumbing.id, "Approval withdrawn for review.");
  expect(state.companies[0].activationStatus).toBe("Active");
  expect(qualificationChoices(state, company.id)[1].available).toBe(true);
  await service.requestSkill(company.id, "Plumbing");
  expect(
    state.qualifications.filter((q) => q.skill === "Plumbing"),
  ).toHaveLength(3);
});
