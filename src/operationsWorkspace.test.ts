import { it, expect } from "vitest";
import { operationsState } from "../tests/fixtures/operationsState";
import { operationsAttention } from "./OperationsWorkspace";

it("groups only Open owned tasks by company across workflow roots, without changing authoritative facts", async () => {
  const { state } = await operationsState(),
    before = JSON.stringify(state);
  expect(
    operationsAttention(state, "Recruitment")
      .filter((r) => r.count)
      .map((r) => r.company.name),
  ).toEqual(["Alpha Services", "Beta Services"]);
  const compliance = operationsAttention(state, "Compliance").filter(
    (r) => r.count,
  );
  expect(compliance.map((r) => r.count)).toEqual([2, 1]);
  expect(new Set(compliance[0].work.map((t) => t.workflowId)).size).toBe(2);
  expect(
    operationsAttention(state, "Finance").every((r) => r.count === 0),
  ).toBe(true);
  expect(
    operationsAttention(state, "Training").every((r) => r.count === 0),
  ).toBe(true);
  const automations = operationsAttention(state, "Simulation").filter(
    (r) => r.count,
  );
  expect(automations.map((r) => [r.company.name, r.count])).toEqual([
    ["Sierra Services", 1],
  ]);
  expect(automations[0].work.map((t) => t.activity)).toEqual([
    "PublishActivation",
  ]);
  expect(
    automations.every((r) =>
      r.work.every((t) => t.owner === "Simulation" && t.status === "Open"),
    ),
  ).toBe(true);
  expect(JSON.stringify(state)).toBe(before);
});
