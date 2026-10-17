import { expect, it } from "vitest";
import { contractorStates } from "../tests/fixtures/contractorStates";
import { contractorJourney } from "./contractorJourney";

it("tells the parallel onboarding story from real facts without changing readiness or historical completion", async () => {
  const { states } = await contractorStates();
  const model = (name: string) =>
    contractorJourney(
      states[name],
      states[name].companies[0],
      states[name].applications[0],
    );
  expect(model("submitted").stages[0].status).toBe("Waiting on another team");
  expect(
    model("submitted")
      .stages.slice(1)
      .every((s) => s.status === "Not yet started"),
  ).toBe(true);
  expect(
    model("active-work")
      .stages.filter((s) => s.status === "Waiting on you")
      .map((s) => s.key),
  ).toEqual(["administration", "skills"]);
  expect(model("correction").stages[1].status).toBe("Requires correction");
  expect(model("correction").correction(model("correction").mine[0])).toBe(
    true,
  );
  expect(model("waiting-team").mine).toHaveLength(0);
  expect(model("waiting-team").others.map((t) => t.owner)).toContain("Finance");
  expect(model("activation-pending")).toMatchObject({
    ready: true,
    eligible: false,
    historical: false,
  });
  expect(model("activation-pending").stages.at(-1)?.status).toBe(
    "Waiting on another team",
  );
  expect(model("eligible")).toMatchObject({
    ready: true,
    eligible: true,
    historical: true,
  });
  expect(model("eligible").stages.every((s) => s.status === "Complete")).toBe(
    true,
  );
  expect(
    model("separate-skill").stages.every((s) => s.status === "Complete"),
  ).toBe(true);
  expect(model("separate-skill").mine).toHaveLength(1);
  expect(model("suspended")).toMatchObject({
    ready: false,
    eligible: false,
    historical: true,
  });
  expect(model("suspended").stages.every((s) => s.status === "Complete")).toBe(
    true,
  );
  expect(model("suspended").title).toContain("suspended");
  // Pure presentation must not mutate facts, recording frames or workflow state.
  for (const s of Object.values(states)) {
    const before = JSON.stringify(s);
    contractorJourney(s, s.companies[0], s.applications[0]);
    expect(JSON.stringify(s)).toBe(before);
  }
});
