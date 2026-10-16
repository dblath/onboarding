// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { contractorSessionKey } from "./ContractorAccess";
import { IndexedDbRepository } from "./application";
import { id } from "./domain";
import { testService } from "./testing";

beforeEach(() => {
  sessionStorage.clear();
  window.location.hash = "/contractor";
});
afterEach(cleanup);
async function setup() {
  const service = testService(new IndexedDbRepository(`portal-${id()}`));
  await service.submitApplication({
    name: "Alpha Company",
    contact: "Alpha Demo",
    email: "shared@example.com",
    skill: "HVAC",
  });
  await service.submitApplication({
    name: "Beta Company",
    contact: "Beta Demo",
    email: "shared@example.com",
    skill: "Plumbing",
  });
  await service.submitApplication({
    name: "Other Company",
    contact: "Other Demo",
    email: "other@example.com",
    skill: "HVAC",
  });
  const user = userEvent.setup();
  render(<App service={service} />);
  await screen.findByRole("heading", { name: "Sign in to your company" });
  return { service, user };
}
it("does not restore legacy selection or expose company work anonymously; rejects bad credentials without writes", async () => {
  sessionStorage.setItem("fieldwork:contractor:company", "legacy-choice");
  const { service, user } = await setup();
  const before = await service.getState();
  expect(screen.queryByText("Alpha Company")).toBeNull();
  expect(screen.queryByRole("button", { name: "Required actions" })).toBeNull();
  await user.type(
    screen.getByLabelText("Application email"),
    "shared@example.com",
  );
  await user.type(screen.getByLabelText("Demo password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  expect(screen.getByRole("alert").textContent).toContain(
    "Incorrect demo password",
  );
  expect(sessionStorage.getItem(contractorSessionKey)).toBeNull();
  await user.clear(screen.getByLabelText("Application email"));
  await user.type(
    screen.getByLabelText("Application email"),
    "unknown@example.com",
  );
  await user.clear(screen.getByLabelText("Demo password"));
  await user.type(screen.getByLabelText("Demo password"), "123");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  expect(screen.getByRole("alert").textContent).toContain("No company found");
  expect(sessionStorage.getItem(contractorSessionKey)).toBeNull();
  expect(await service.getState()).toEqual(before);
});
it("requires an explicit duplicate-email company choice and sign-out preserves domain and internal preferences", async () => {
  const { service, user } = await setup();
  const before = await service.getState();
  sessionStorage.setItem("fieldwork:operations:role", "Finance");
  sessionStorage.setItem("fieldwork:monitor:company", "monitor-selection");
  await user.type(
    screen.getByLabelText("Application email"),
    "SHARED@example.com",
  );
  await user.type(screen.getByLabelText("Demo password"), "123");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  expect(
    screen.getByRole("heading", { name: "Choose your company" }),
  ).not.toBeNull();
  expect(sessionStorage.getItem(contractorSessionKey)).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Continue to company",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.queryByText("Other Company")).toBeNull();
  const beta = before.companies.find(
    (company) => company.name === "Beta Company",
  )!;
  await user.selectOptions(
    screen.getByLabelText("Company for this sign in"),
    beta.id,
  );
  await user.click(screen.getByRole("button", { name: "Continue to company" }));
  await screen.findByRole("heading", { name: "Beta Company" });
  expect(screen.queryByText("Alpha Company")).toBeNull();
  expect(sessionStorage.getItem(contractorSessionKey)).toBe(beta.id);
  expect(sessionStorage.getItem("fieldwork:operations:role")).toBe("Finance");
  await user.click(screen.getByRole("button", { name: "Sign Out" }));
  await screen.findByRole("heading", { name: "Sign in to your company" });
  expect(screen.queryByText("Beta Company")).toBeNull();
  expect(sessionStorage.getItem(contractorSessionKey)).toBeNull();
  expect(sessionStorage.getItem("fieldwork:monitor:company")).toBe(
    "monitor-selection",
  );
  expect(await service.getState()).toEqual(before);
});
it("never falls back to another company when a stored session is invalid", async () => {
  sessionStorage.setItem(contractorSessionKey, "missing-company");
  await setup();
  expect(screen.queryByText("Alpha Company")).toBeNull();
  expect(screen.queryByTestId("lifecycle-onboarding")).toBeNull();
});
it("keeps diagnostic panels independent, keyboard operable, live while hidden and reset on remount", async () => {
  const user = userEvent.setup();
  const panels = (value: string) => (
    <>
      <DiagnosticPanel title="Expected events & owners">
        <p>{value}</p>
      </DiagnosticPanel>
      <DiagnosticPanel title="Correlation">
        <p>Company ID</p>
      </DiagnosticPanel>
    </>
  );
  const view = render(panels("Old event"));
  const expected = screen.getByRole("button", {
    name: "Expected events & owners",
  });
  const correlation = screen.getByRole("button", { name: "Correlation" });
  expect(expected.getAttribute("aria-expanded")).toBe("false");
  expect(
    document.getElementById(expected.getAttribute("aria-controls")!)!.hidden,
  ).toBe(true);
  view.rerender(panels("Current event"));
  expected.focus();
  await user.keyboard("{Enter}");
  await user.click(correlation);
  expect(expected.getAttribute("aria-expanded")).toBe("true");
  expect(correlation.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText("Current event")).not.toBeNull();
  expected.focus();
  await user.keyboard(" ");
  expect(expected.getAttribute("aria-expanded")).toBe("false");
  expect(correlation.getAttribute("aria-expanded")).toBe("true");
  view.unmount();
  render(panels("Newest event"));
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Correlation" })
        .getAttribute("aria-expanded"),
    ).toBe("false"),
  );
});
