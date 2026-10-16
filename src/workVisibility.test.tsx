// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { EligibilityGuidance } from "./EligibilityGuidance";
import { OperationsQueueNavigation } from "./OperationsWorkQueue";
import { IndexedDbRepository } from "./application";
import {
  emptyState,
  id,
  type Activity,
  type Role,
  type WorkItem,
} from "./domain";
import { testService } from "./testing";

beforeEach(() => {
  sessionStorage.clear();
  window.location.hash = "/operations";
});
afterEach(cleanup);
function work(
  activity: Activity,
  owner: Role,
  status: WorkItem["status"] = "Open",
): WorkItem {
  return {
    id: id(),
    workflowId: "workflow",
    companyId: "company",
    activity,
    owner,
    status,
    dueAt: "2026-10-18",
    createdAt: "2026-10-16",
    expectedOutcome: "Complete",
    instructions: "Demo action",
    completionHistory: [],
  };
}
function readyState() {
  const s = emptyState();
  s.companies.push({
    id: "company",
    name: "Ready Company",
    email: "ready@example.com",
    contact: "Demo",
    adminComplete: true,
    portalSetupComplete: true,
    initialTrainingComplete: true,
    readinessPublished: true,
    activationStatus: "Pending",
  });
  s.applications.push({
    id: "application",
    companyId: "company",
    source: "Contractor portal",
    skill: "HVAC",
    submittedAt: s.clock,
    status: "Onboarding",
    responses: [],
    screeningDecisions: [],
  });
  s.qualifications.push({
    id: "qualification",
    companyId: "company",
    skill: "HVAC",
    status: "Approved",
    evidenceIds: [],
  });
  return s;
}
it("counts only open WorkItems, including system activities, and exposes every participant", () => {
  const state = readyState();
  state.workItems = [
    work("ScreenApplication", "Recruitment"),
    work("CreateVendor", "Simulation"),
    work("PublishActivation", "Simulation", "Cancelled"),
    work("ReviewFinancial", "Finance", "Completed"),
  ];
  render(
    <OperationsQueueNavigation
      state={state}
      expanded
      participant="Finance"
      onSelect={vi.fn()}
      onToggle={vi.fn()}
    />,
  );
  expect(screen.getByTestId("queue-total").textContent).toBe("2");
  expect(screen.getByTestId("queue-count-Simulation").textContent).toBe("1");
  expect(screen.getByTestId("queue-count-Finance").textContent).toBe("0");
  for (const role of [
    "Recruitment",
    "Compliance",
    "Finance",
    "Contractor Relations",
    "Field Manager",
    "Training",
    "Contractor",
    "System Activities",
  ])
    expect(screen.getByRole("button", { name: `${role} work` })).not.toBeNull();
});
it("keeps the global parent count during role/company filtering and reloads counts after completing work", async () => {
  const service = testService(new IndexedDbRepository(`visibility-${id()}`));
  const alpha = await service.submitApplication({
    name: "Alpha Work",
    email: "alpha@example.com",
    contact: "Alpha",
    skill: "HVAC",
  });
  await service.recordScreeningDecision(alpha, "Proceed", "");
  await service.submitApplication({
    name: "Beta Work",
    email: "beta@example.com",
    contact: "Beta",
    skill: "HVAC",
  });
  const s = await service.getState();
  const beta = s.companies.find((company) => company.name === "Beta Work")!;
  const user = userEvent.setup();
  render(<App service={service} />);
  await screen.findByRole("heading", { name: "Alpha Work" });
  const parent = screen.getByRole("button", { name: "Work queue" });
  await user.click(parent);
  expect(parent.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByTestId("queue-total").textContent).toBe("5");
  const queue = screen.getByRole("region", { name: "Operations work queue" });
  expect(within(queue).getAllByTestId("queue-item")).toHaveLength(1);
  expect(within(queue).getByTestId("queue-item").textContent).toContain(
    "Beta Work",
  );
  await user.click(screen.getByRole("button", { name: "Contractor work" }));
  expect(within(queue).getAllByTestId("queue-item")).toHaveLength(4);
  expect(screen.getByTestId("queue-total").textContent).toBe("5");
  await user.selectOptions(
    screen.getByLabelText("Work queue company"),
    beta.id,
  );
  expect(within(queue).queryAllByTestId("queue-item")).toHaveLength(0);
  expect(screen.getByTestId("queue-total").textContent).toBe("5");
  await user.click(screen.getByRole("button", { name: "Recruitment work" }));
  await user.click(
    within(queue).getByRole("button", { name: "Record decision →" }),
  );
  expect(screen.getByTestId("queue-count-Recruitment").textContent).toBe("0");
  expect(screen.getByTestId("queue-count-Contractor").textContent).toBe("8");
  expect(screen.getByTestId("queue-total").textContent).toBe("8");
  const after = await service.getState();
  expect(
    after.workItems.filter((task) => task.status === "Completed"),
  ).toHaveLength(2);
  await user.click(parent);
  expect(parent.getAttribute("aria-expanded")).toBe("false");
  expect(screen.getByTestId("queue-total").textContent).toBe("8");
}, 30000);
it("explains pending activation and missing publication separately without changing state", async () => {
  const user = userEvent.setup(),
    onOpenWork = vi.fn(),
    state = readyState();
  state.workItems = [work("PublishActivation", "Simulation")];
  const before = structuredClone(state);
  const view = render(
    <EligibilityGuidance
      state={state}
      company={state.companies[0]}
      application={state.applications[0]}
      onOpenWork={onOpenWork}
    />,
  );
  expect(
    screen.getByText(
      "All requirements are complete. Contractor activation is awaiting publication by Operations.",
    ),
  ).not.toBeNull();
  await user.click(
    screen.getByRole("button", { name: "View Operations action" }),
  );
  expect(onOpenWork).toHaveBeenCalledWith("Simulation");
  expect(state).toEqual(before);
  const cancelled = {
    ...state,
    workItems: [{ ...state.workItems[0], status: "Cancelled" as const }],
  };
  view.rerender(
    <EligibilityGuidance
      state={cancelled}
      company={cancelled.companies[0]}
      application={cancelled.applications[0]}
    />,
  );
  expect(
    screen.getByText(/No publication action is currently available/),
  ).not.toBeNull();
  expect(screen.queryByText("Pending with Operations")).toBeNull();
});
it("keeps restored readiness distinct from suspension and never offers an activation bypass", () => {
  const state = readyState();
  state.companies[0].activationStatus = "Suspended";
  state.applications[0].status = "Completed";
  const view = render(
    <EligibilityGuidance
      state={state}
      company={state.companies[0]}
      application={state.applications[0]}
      onOpenWork={vi.fn()}
    />,
  );
  expect(screen.getByText(/This company is suspended/)).not.toBeNull();
  expect(
    screen.getByText(/separate administrative request and approval/),
  ).not.toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  const active = { ...state.companies[0], activationStatus: "Active" as const };
  view.rerender(
    <EligibilityGuidance
      state={state}
      company={active}
      application={state.applications[0]}
    />,
  );
  expect(
    screen.queryByRole("region", { name: "Eligibility blockers" }),
  ).toBeNull();
});
