// @vitest-environment jsdom
import { testService } from "./testing";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import {
  cleanup,
  act,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { IndexedDbRepository, OnboardingService } from "./application";
import { id, isReady, type Persona } from "./domain";
let user: ReturnType<typeof userEvent.setup>,
  service: OnboardingService,
  databaseName: string;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = "/contractor";
  user = userEvent.setup();
  databaseName = `ui-${id()}`;
  service = testService(new IndexedDbRepository(databaseName));
});
afterEach(cleanup);
async function persona(p: Persona) {
  const route =
    p === "Contractor"
      ? "contractor"
      : p === "Workflow Monitor"
        ? "monitor"
        : "operations";
  await act(async () => {
    window.location.hash = `/${route}`;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  if (route === "operations") {
    await user.selectOptions(screen.getByLabelText("Internal role"), p);
    const first = document.querySelector<HTMLElement>(".ops-company-row");
    if (first && !document.querySelector(".ops-company-row.selected"))
      await user.click(first);
  } else if (route === "monitor") await go("Workflow monitor");
  else if (route === "contractor") await go("Work queue");
}
async function go(name: string) {
  const mapped =
    window.location.hash === "#/contractor"
      ? ((
          {
            Overview: "Your journey",
            "Work queue": "Required actions",
            Outbox: "Messages",
          } as Record<string, string>
        )[name] ?? name)
      : name;
  if (!(name === "Overview" && window.location.hash === "#/operations"))
    await user.click(screen.getAllByRole("button", { name: mapped })[0]);
  if (name === "Overview" && window.location.hash === "#/operations") {
    await user.click(screen.getByRole("button", { name: "All companies" }));
    await user.click(
      screen.getByText("Summit UI Demo", {
        selector: ".application-row strong",
      }),
    );
    for (const summary of document.querySelectorAll<HTMLElement>(
      ".ops-disclosure>summary, .ops-stage>summary",
    )) {
      if (
        summary.textContent?.includes("Company facts & readiness") ||
        summary.textContent?.includes("Skill qualification")
      )
        if (!summary.parentElement?.hasAttribute("open"))
          await user.click(summary);
    }
  }
}
function card(name: string) {
  return screen.getByRole("heading", { name }).closest("article")!;
}
async function submitApplication() {
  render(<App service={service} />);
  const start = await screen.findByRole("button", {
    name: "＋ New application",
  });
  await waitFor(() => expect(start.hasAttribute("disabled")).toBe(false));
  await user.click(start);
  await user.type(
    screen.getByLabelText("Fictional company name"),
    "Summit UI Demo",
  );
  await user.type(screen.getByLabelText("Contact name"), "Alex Demo");
  await user.type(
    screen.getByLabelText("Application email"),
    "alex@example.com",
  );
  await user.selectOptions(
    screen.getByLabelText("Initial requested skill"),
    "HVAC",
  );
  await user.click(
    screen.getByRole("button", { name: "Submit application →" }),
  );
  await screen.findByRole("heading", { name: "Application submitted" });
  await user.type(screen.getByLabelText("Simulation password"), "123");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  await screen.findByRole("heading", { name: "Summit UI Demo" });
}
async function proceed() {
  await persona("Recruitment");
  const t = card("Review application");
  await user.click(
    within(t).getByRole("button", { name: "Record decision →" }),
  );
  await waitFor(() => expect(t.isConnected).toBe(false));
}
async function submitEvidence(label: string, fixture = "Valid demo document") {
  const t = card(label);
  await user.selectOptions(
    within(t).getByLabelText("Fictional evidence fixture"),
    fixture,
  );
  await user.click(
    within(t).getByRole("button", { name: "Submit evidence →" }),
  );
  await waitFor(() => expect(t.isConnected).toBe(false));
}
async function runReview(label: string) {
  const t = card(label);
  await user.click(
    within(t).getByRole("button", { name: "Run simulated verification →" }),
  );
  await waitFor(() => expect(t.isConnected).toBe(false));
}
async function completeTask(label: string, button: string) {
  const t = card(label);
  await user.click(within(t).getByRole("checkbox"));
  await user.click(within(t).getByRole("button", { name: button }));
  await waitFor(() => expect(t.isConnected).toBe(false));
}
async function qualify(approve = true) {
  await persona("Contractor");
  await submitEvidence("Submit license evidence");
  await persona("Compliance");
  await runReview("Verify license");
  await persona("Field Manager");
  const t = card("Approve skill qualification");
  if (!approve) {
    await user.selectOptions(
      within(t).getByLabelText("Qualification decision"),
      "Reject",
    );
    await user.type(
      within(t).getByLabelText("Decision note"),
      "Demo practical assessment failed",
    );
  }
  await user.click(
    within(t).getByRole("button", { name: "Record skill decision →" }),
  );
  await waitFor(() => expect(t.isConnected).toBe(false));
}
async function submitAdmin() {
  await persona("Contractor");
  for (const label of [
    "Submit insurance evidence",
    "Submit fictional tax / banking pack",
    "Submit simulated agreement",
  ])
    await submitEvidence(label);
}
async function reviewAdmin() {
  await persona("Compliance");
  await runReview("Review insurance");
  await persona("Finance");
  await runReview("Verify fictional financial pack");
  await persona("Contractor Relations");
  await runReview("Execute simulated agreement");
}
async function systemActivities() {
  await persona("Workflow Monitor");
  await go("Automations & Integrations");
}
async function vendor() {
  await systemActivities();
  const t = card("Create vendor record");
  await user.click(
    within(t).getByRole("button", { name: "Create vendor record →" }),
  );
  await waitFor(() => expect(t.isConnected).toBe(false));
}
async function training() {
  await persona("Contractor");
  await completeTask(
    "Complete simulated portal setup",
    "Complete portal setup →",
  );
  await completeTask(
    "Complete initial training",
    "Complete initial training →",
  );
  await persona("Training");
  await completeTask("Confirm training completion", "Confirm training →");
}
async function activate() {
  await systemActivities();
  const t = card("Publish contractor activation");
  await user.click(
    within(t).getByRole("button", { name: "Publish contractor activation →" }),
  );
  await waitFor(() => expect(t.isConnected).toBe(false));
}
async function happy() {
  await submitApplication();
  await proceed();
  await submitAdmin();
  await reviewAdmin();
  await vendor();
  await qualify();
  await training();
  await activate();
  await persona("Training");
  await go("Overview");
  await waitFor(() =>
    expect(screen.getByTestId("lifecycle-eligibility").textContent).toBe(
      "Eligible",
    ),
  );
}
describe("participant UI acceptance", () => {
  it("keeps the company non-ready when a mandatory administrative prerequisite is missing", async () => {
    await submitApplication();
    await proceed();
    await qualify();
    await persona("Contractor");
    await submitEvidence("Submit insurance evidence");
    await submitEvidence("Submit simulated agreement");
    await persona("Compliance");
    await runReview("Review insurance");
    await persona("Contractor Relations");
    await runReview("Execute simulated agreement");
    await go("Overview");
    expect(
      screen.getByRole("heading", {
        name: "Onboarding at a glance",
      }),
    ).not.toBeNull();
    expect(screen.getByTestId("lifecycle-readiness").textContent).toBe(
      "Not ready",
    );
    expect(
      screen.queryByRole("heading", { name: "Create vendor record" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: "Publish contractor activation",
      }),
    ).toBeNull();
    const s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
  }, 30000);
  it("reaches Ready through the UI without direct state manipulation", async () => {
    await happy();
    const s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(s.companies[0].activationStatus).toBe("Active");
    expect(s.workItems.every((t) => t.status === "Completed")).toBe(true);
  }, 30000);
  it("shows correction, durable waiting, failure/retry, monitor delivery, timer and escalation", async () => {
    await submitApplication();
    await proceed();
    await persona("Contractor");
    await submitEvidence("Submit license evidence", "Expired demo document");
    await persona("Compliance");
    await runReview("Verify license");
    await persona("Contractor");
    expect(card("Submit license evidence").textContent).toContain("expired");
    // Recreate the UI and service against the same IndexedDB: the durable wait must survive.
    cleanup();
    service = testService(new IndexedDbRepository(databaseName));
    render(<App service={service} />);
    await screen.findByRole("heading", { name: "Summit UI Demo" });
    await go("Work queue");
    expect(card("Submit license evidence").textContent).toContain("expired");
    await submitEvidence("Submit license evidence");
    await persona("Compliance");
    await runReview("Verify license");
    await persona("Field Manager");
    const approval = card("Approve skill qualification");
    await user.click(
      within(approval).getByRole("button", { name: "Record skill decision →" }),
    );
    await waitFor(() => expect(approval.isConnected).toBe(false));
    await submitAdmin();
    await reviewAdmin();
    await systemActivities();
    let t = card("Create vendor record");
    await user.click(within(t).getByRole("checkbox"));
    await user.click(
      within(t).getByRole("button", { name: "Create vendor record →" }),
    );
    expect(
      await within(t).findByText("Technical failure · attempt 1"),
    ).not.toBeNull();
    expect(
      (await service.getState()).companies[0].vendorReference,
    ).toBeUndefined();
    await user.click(
      within(t).getByRole("button", { name: "↻ Retry activity →" }),
    );
    await waitFor(() => expect(t.isConnected).toBe(false));
    await persona("Workflow Monitor");
    await user.click(
      screen.getByRole("button", { name: "Timer & escalation lab" }),
    );
    await user.click(screen.getByRole("button", { name: "Advance 3 days" }));
    await screen.findByText(/Simulation clock advanced 3 days/);
    await user.click(screen.getByRole("button", { name: "Advance 2 days" }));
    await waitFor(async () =>
      expect(
        (await service.getState()).outbox.some((m) => m.kind === "Escalation"),
      ).toBe(true),
    );
    await go("Outbox");
    expect(
      screen.getByText(/Escalation: Contractor has overdue work/),
    ).not.toBeNull();
    await training();
    await activate();
    await persona("Workflow Monitor");
    await user.click(
      screen.getByRole("button", { name: "Event ingress demonstrations" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Redeliver last event" }),
    );
    expect(
      await screen.findByText(
        "✓ Duplicate event ignored. No work or history was duplicated.",
      ),
    ).not.toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Deliver unrelated correlation" }),
    );
    expect(
      await screen.findByText(
        "✓ Unrelated correlation rejected. The workflow did not advance.",
      ),
    ).not.toBeNull();
    const s = await service.getState();
    expect(s.attempts.some((a) => a.status === "Failed")).toBe(true);
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(
      s.evidence.filter((e) => e.qualificationId).map((e) => e.version),
    ).toEqual([1, 2]);
  }, 30000);
  it("expands skills, keeps readiness for rejection and one invalidation, then loses it for the last approval", async () => {
    await happy();
    await persona("Contractor");
    await go("Overview");
    await user.selectOptions(
      screen.getByLabelText("Add another company skill"),
      "Plumbing",
    );
    await user.click(
      screen.getByRole("button", { name: "＋ Request qualification" }),
    );
    await screen.findByText("Additional company skill · separate activity");
    await qualify(false);
    let s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    await persona("Contractor");
    await go("Overview");
    await user.selectOptions(
      screen.getByLabelText("Add another company skill"),
      "Plumbing",
    );
    await user.click(
      screen.getByRole("button", { name: "＋ Request qualification" }),
    );
    await waitFor(async () =>
      expect((await service.getState()).qualifications).toHaveLength(3),
    );
    await qualify();
    await persona("Compliance");
    await go("Overview");
    let fields = screen.getAllByLabelText("Invalidation reason");
    await user.type(fields[0], "Demo: approval withdrawn");
    await user.click(
      screen.getAllByRole("button", { name: "Invalidate skill approval" })[0],
    );
    await waitFor(() =>
      expect(screen.getAllByLabelText("Invalidation reason")).toHaveLength(1),
    );
    s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    fields = screen.getAllByLabelText("Invalidation reason");
    await user.type(fields[0], "Demo: final approval withdrawn");
    await user.click(
      screen.getByRole("button", { name: "Invalidate skill approval" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("lifecycle-readiness").textContent).toBe(
        "Not ready",
      ),
    );
    expect(screen.getByTestId("lifecycle-onboarding").textContent).toBe(
      "Completed",
    );
    s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    expect(s.companies[0].activationStatus).toBe("Suspended");
    expect(
      s.workflows.filter((w) => w.definitionId === "CompanyOnboarding"),
    ).toHaveLength(1);
  }, 30000);
});
