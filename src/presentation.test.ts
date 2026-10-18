import { expect, it } from "vitest";
import {
  activityLabel,
  simulationMessage,
  businessActivityLabel,
  businessMessage,
  businessText,
} from "./presentation";

it("keeps legacy recorder vocabulary stable while adapting normal business labels", () => {
  expect(activityLabel("ExecuteAgreement")).toBe("Execute simulated agreement");
  expect(simulationMessage("Demo verification passed.")).toBe(
    "Simulated verification passed.",
  );
  expect(businessActivityLabel("ExecuteAgreement")).toBe(
    "Review contractor agreement",
  );
  expect(businessActivityLabel("SetupPortal")).toBe("Complete company profile");
});

it("adapts system outcomes, case variants and legacy recorded waiting explanations", () => {
  expect(businessText("SIMULATION / Simulated / sImUlAtEd")).toBe(
    "Test / Test / test",
  );
  expect(businessMessage("Demo verification passed.")).toBe(
    "Test verification passed.",
  );
  expect(
    businessMessage(
      "Waiting for Compliance. Review insurance evidence v2 using the simulated verifier.",
    ),
  ).toBe(
    "Waiting for Compliance. Review insurance evidence v2 using the test verifier.",
  );
});

it("preserves unknown free text, company names and original values", () => {
  const original =
    "Simulation Services requests a SIMULATED model for inspection.";
  expect(businessMessage(original)).toBe(original);
  expect(businessMessage("Please explain simulation experience.")).toBe(
    "Please explain simulation experience.",
  );
  expect(original).toBe(
    "Simulation Services requests a SIMULATED model for inspection.",
  );
});

it("adapts generated reminders and recorded timer captions without changing source records", () => {
  const record = {
    message: "Reminder: Execute simulated agreement is overdue.",
  };
  expect(businessMessage(record.message)).toBe(
    "Reminder: Execute test agreement is overdue.",
  );
  expect(
    businessMessage(
      "Reminder sent in-app to Contractor Relations: Execute simulated agreement",
    ),
  ).not.toMatch(/simulat/i);
  expect(record.message).toBe(
    "Reminder: Execute simulated agreement is overdue.",
  );
});
