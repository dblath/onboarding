import { expect, it } from "vitest";
import { mapDefinition } from "./definition";
import { layoutGroups } from "./layout";
import { compactLabel, edgeStatus, frameStory } from "./story";
import { largeVizFixture } from "../../tests/fixtures/vizLayout";
import type { WorkflowInstance } from "../domain";

it("packs the real 37-node map and synthetic 80-node topology without node overlap", () => {
  const real = mapDefinition({
    definitionId: "CompanyOnboarding",
    definitionVersion: 2,
  } as WorkflowInstance);
  for (const definition of [real, largeVizFixture().definition]) {
    const nodes = definition.nodes.map((model) => ({
      id: model.id,
      data: { model },
      position: { x: 0, y: 0 },
      width: 0,
      height: 0,
    }));
    const backwards = new Set(
      definition.edges
        .filter((e) => ["Resubmit", "Review again"].includes(e.label ?? ""))
        .map((e) => e.id),
    );
    layoutGroups(nodes, definition.edges, backwards);
    for (const [i, a] of nodes.entries()) {
      expect(a.height).toBe(44);
      if (a.data.model.kind === "activity") expect(a.width).toBe(154);
      for (const b of nodes.slice(i + 1))
        expect(
          a.position.x + a.width <= b.position.x ||
            b.position.x + b.width <= a.position.x ||
            a.position.y + a.height <= b.position.y ||
            b.position.y + b.height <= a.position.y,
        ).toBe(true);
    }
    const starts = [
      "Insurance",
      "Finance",
      "Agreement",
      "Skill qualification",
    ].map((g) =>
      Math.min(
        ...nodes
          .filter((n) => n.data.model.group === g)
          .map((n) => n.position.y),
      ),
    );
    // All four lanes begin together, rather than pushing skill qualification below admin work.
    expect(Math.max(...starts) - Math.min(...starts)).toBeLessThan(160);
  }
});

it("derives changes, next owners and join storytelling only from immutable frames", () => {
  const r = largeVizFixture();
  const first = r.frames[0];
  expect(frameStory(r, first).nodes.size).toBe(0);
  const next = structuredClone(first);
  next.number = 1;
  next.nodes["enable-4"] = {
    status: "complete",
    explanation: "Training confirmed",
    eventIds: ["actual-reference"],
  };
  next.nodes["readiness-join"] = {
    status: "complete",
    explanation: "All prerequisites satisfied",
    eventIds: [],
    satisfied: 4,
    total: 4,
    outstanding: [],
  };
  next.nodes["activate-0"].status = "waiting";
  next.edges["enable-4:activate-0"] = "waiting";
  r.frames.push(next);
  const before = structuredClone(r),
    story = frameStory(r, next);
  expect(story.nodes.has("enable-4")).toBe(true);
  expect(story.edges.has("enable-4:activate-0")).toBe(true);
  expect(story.explanation).toBe(
    "All four activation requirements are satisfied.",
  );
  expect(story.next.some((n) => n.owner === "Layout fixture")).toBe(true);
  expect(r).toEqual(before);
  expect(
    compactLabel({
      ...r.definition.nodes[0],
      id: "origin",
      label: "Company skill requested",
    }),
  ).toBe("Skill requested");
});

it("keeps satisfied join inputs green while other dependencies wait, without rewriting frames", () => {
  const r = largeVizFixture(),
    frame = r.frames[0];
  const edge = r.definition.edges.find((e) => e.target === "enable-0")!;
  r.definition.nodes.find((n) => n.id === edge.target)!.kind = "join";
  frame.nodes[edge.target].status = "waiting";
  frame.nodes[edge.source].status = "complete";
  frame.edges[edge.id] = "waiting";
  const before = structuredClone(frame);
  expect(edgeStatus(r, frame, edge)).toBe("complete");
  expect(frame).toEqual(before);
  frame.nodes[edge.source].status = "error";
  expect(edgeStatus(r, frame, edge)).toBe("error");
});
