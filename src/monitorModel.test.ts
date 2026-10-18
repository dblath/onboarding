import { expect, it } from "vitest";
import {
  monitorCompanies,
  monitorSummary,
  businessEventLabel,
} from "./monitorModel";
import { monitorStates } from "../tests/fixtures/monitorStates";

it("reports real onboarding, attention, publication, independent work and recording facts without mutation", async () => {
  const files = await monitorStates();
  for (const file of Object.values(files)) {
    const before = JSON.stringify(file.state);
    monitorCompanies(file.state);
    monitorSummary(file.state);
    for (const e of file.state.events)
      expect(businessEventLabel(e, file.state)).toBeTruthy();
    expect(JSON.stringify(file.state)).toBe(before);
  }
  expect(monitorSummary(files.parallel.state)).toMatchObject({
    inProgress: 5,
    attention: 1,
    retries: 0,
    activation: 1,
    completed: 0,
    recording: 5,
  });
  expect(monitorSummary(files.failure.state).retries).toBe(1);
  expect(monitorCompanies(files.correction.state)[0]).toMatchObject({
    attention: true,
    running: true,
  });
  expect(monitorCompanies(files.independent.state)[0]).toMatchObject({
    historical: true,
    running: false,
    active: true,
  });
  expect(
    monitorCompanies(files.independent.state)[0].activeSkills,
  ).toHaveLength(1);
  expect(monitorSummary(files.recordings.state).recording).toBe(3);
});

it("does not classify normal waits as failures or infer status from raw history wording", async () => {
  const { submitted } = await monitorStates();
  const state = structuredClone(submitted.state);
  const original = monitorSummary(state);
  state.workflows[0].history.push({
    at: state.clock,
    kind: "Rule",
    message: "FAILED READY ACTIVATION suspended retry",
  });
  expect(monitorSummary(state)).toEqual(original);
  expect(original).toMatchObject({
    inProgress: 1,
    attention: 0,
    retries: 0,
    activation: 0,
    completed: 0,
  });
});
