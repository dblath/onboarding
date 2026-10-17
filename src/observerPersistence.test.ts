import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { IndexedDbRepository } from "./application";
import { id } from "./domain";
import { testService } from "./testing";
import { parseWorkspaceFile } from "./workspace/format";

it("an individual frame transaction failure preserves valid business facts, quarantines only that capture, and never rewrites history", async () => {
  const repository = new IndexedDbRepository(`observer-${id()}`),
    service = testService(repository);
  const app = await service.submitApplication({
    name: "Observer",
    contact: "Alex",
    email: "observer@example.com",
    skill: "HVAC",
  });
  const origin = (await service.getState()).events[0].eventId;
  const failedId = await service.startVizRecording(origin),
    healthyId = await service.startVizRecording(origin);
  const before = await service.getState(),
    original = IDBObjectStore.prototype.add;
  const add = vi
    .spyOn(IDBObjectStore.prototype, "add")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (
        this.name === "viz-frames" &&
        Array.isArray(key) &&
        key[0] === failedId
      )
        throw new DOMException("Injected frame quota", "QuotaExceededError");
      return original.call(this, value, key);
    });
  try {
    await expect(
      service.recordScreeningDecision(app, "Proceed", ""),
    ).resolves.toBeUndefined();
  } finally {
    add.mockRestore();
  }
  let state = await service.getState();
  expect(state.applications[0].status).toBe("Onboarding");
  expect(state.workItems.filter((t) => t.status === "Open")).toHaveLength(4);
  expect(state.viz!.recordings.find((r) => r.id === failedId)!.status).toBe(
    "Capture issue",
  );
  expect(state.viz!.recordings.find((r) => r.id === failedId)!.frames).toEqual(
    before.viz!.recordings[0].frames,
  );
  expect(
    state.viz!.recordings.find((r) => r.id === healthyId)!.frames,
  ).toHaveLength(2);
  await service.submitEvidence(
    state.workItems.find(
      (t) => t.activity === "SubmitLicense" && t.status === "Open",
    )!.id,
    "Valid demo document",
  );
  state = await service.getState();
  expect(
    state.viz!.recordings.find((r) => r.id === failedId)!.frames,
  ).toHaveLength(1);
  expect(
    state.viz!.recordings.find((r) => r.id === healthyId)!.frames,
  ).toHaveLength(3);
  const file = await service.saveWorkspace("Gap preserved");
  await service.resetWorkspace(state.revision);
  await service.restoreWorkspace(
    parseWorkspaceFile(JSON.stringify(file)),
    (await service.getState()).revision,
  );
  expect((await service.getState()).viz).toEqual(
    JSON.parse(JSON.stringify(file.state.viz)),
  );
});

it("observer-control storage failure does not roll back a business action, but failed trigger administration is reported honestly", async () => {
  const service = testService(new IndexedDbRepository(`controls-${id()}`));
  await service.saveRecordingTrigger({
    name: "Applications",
    kind: "application",
    enabled: true,
  });
  const put = IDBObjectStore.prototype.put;
  const fault = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === "viz-control")
        throw new DOMException(
          "Control storage unavailable",
          "QuotaExceededError",
        );
      return put.call(this, value, key);
    });
  try {
    await service.submitApplication({
      name: "Durable",
      contact: "Alex",
      email: "durable@example.com",
      skill: "HVAC",
    });
    const state = await service.getState();
    expect(state.applications).toHaveLength(1);
    expect(state.viz!.captureError).toContain("capture gap");
    await expect(
      service.saveRecordingTrigger({
        name: "Not saved",
        kind: "skill",
        enabled: true,
      }),
    ).rejects.toThrow("could not be fully saved");
    expect((await service.getState()).viz!.triggers).toHaveLength(1);
  } finally {
    fault.mockRestore();
  }
});

it("atomic replacement failure leaves business, controls, recordings and frames unchanged", async () => {
  const service = testService(new IndexedDbRepository(`replace-${id()}`));
  await service.submitApplication({
    name: "Keep",
    contact: "Alex",
    email: "keep@example.com",
    skill: "HVAC",
  });
  const before = await service.getState();
  const file = parseWorkspaceFile(
    readFileSync("tests/fixtures/workspace-v2/iteration-3.7.json", "utf8"),
  );
  const original = IDBObjectStore.prototype.add;
  const fault = vi
    .spyOn(IDBObjectStore.prototype, "add")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === "viz-frames")
        throw new Error("Injected restore failure");
      return original.call(this, value, key);
    });
  try {
    await expect(
      service.restoreWorkspace(file, before.revision),
    ).rejects.toThrow("Injected");
  } finally {
    fault.mockRestore();
  }
  expect(await service.getState()).toEqual(before);
});

it("upgrades original v1 IndexedDB atomically without losing Frame 13 or archive bytes, then continues", async () => {
  const name = `legacy-${id()}`,
    file = parseWorkspaceFile(
      readFileSync(
        "tests/fixtures/workspace-v1/frame-13-workspace.json",
        "utf8",
      ),
    );
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(file.state, "current");
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  const service = testService(new IndexedDbRepository(name));
  await service.initialize();
  const s = await service.getState();
  expect(s.viz!.recordings.map((r) => r.frames)).toEqual(
    file.state.viz!.recordings.map((r) => r.frames),
  );
  await service.completeParticipantTask(
    s.workItems.find(
      (t) => t.activity === "CompleteTraining" && t.status === "Open",
    )!.id,
  );
  expect(
    (await service.getState()).viz!.recordings.at(-1)!.frames.at(-1)!.number,
  ).toBe(14);
});

it("restores the untouched 3.7 workspace with all trigger metadata, continues one recording and resets every store", async () => {
  const name = `v2-${id()}`,
    service = testService(new IndexedDbRepository(name));
  const file = parseWorkspaceFile(
    readFileSync("tests/fixtures/workspace-v2/iteration-3.7.json", "utf8"),
  );
  await service.restoreWorkspace(file, 0);
  let s = await service.getState();
  expect(s.viz).toEqual(file.state.viz);
  await service.initialize();
  expect((await service.getState()).viz).toEqual(file.state.viz);
  const review = s.workItems.find(
    (t) => t.activity === "ReviewInsurance" && t.status === "Open",
  )!;
  const old = s.viz!.recordings.find((r) => r.companyId === review.companyId)!;
  await service.executeActivity(review.id);
  s = await service.getState();
  expect(s.viz!.recordings.find((r) => r.id === old.id)!.frames).toHaveLength(
    old.frames.length + 1,
  );
  expect(s.viz!.recordings.find((r) => r.status === "Stopped")!.frames).toEqual(
    file.state.viz!.recordings.find((r) => r.status === "Stopped")!.frames,
  );
  expect(s.viz!.triggers).toEqual(file.state.viz!.triggers);
  await service.resetWorkspace(s.revision);
  expect((await service.getState()).viz).toBeUndefined();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  for (const store of ["viz-frames", "viz-recordings", "viz-control"]) {
    const count = await new Promise<number>((resolve, reject) => {
      const r = db.transaction(store).objectStore(store).count();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    expect(count).toBe(0);
  }
  db.close();
});
it("appends only new frame keys; an unrelated command never rewrites old frames and business put contains no Viz", async () => {
  const service = testService(new IndexedDbRepository(`append-${id()}`));
  const app = await service.submitApplication({
    name: "Append",
    contact: "Alex",
    email: "append@example.com",
    skill: "HVAC",
  });
  await service.startVizRecording((await service.getState()).events[0].eventId);
  const writes: unknown[] = [],
    metadataWrites: unknown[] = [],
    original = IDBObjectStore.prototype.put,
    add = IDBObjectStore.prototype.add;
  const putting = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === "state") expect(value.viz).toBeUndefined();
      if (this.name === "viz-recordings") metadataWrites.push(key);
      if (this.name === "viz-frames")
        throw new Error("Frames must be appended");
      return original.call(this, value, key);
    });
  const adding = vi
    .spyOn(IDBObjectStore.prototype, "add")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === "viz-frames") writes.push(key);
      return add.call(this, value, key);
    });
  try {
    await service.recordScreeningDecision(app, "Proceed", "");
    await service.submitApplication({
      name: "Other",
      contact: "Alex",
      email: "other@example.com",
      skill: "HVAC",
    });
  } finally {
    putting.mockRestore();
    adding.mockRestore();
  }
  expect(writes).toHaveLength(1);
  expect(metadataWrites).toHaveLength(1);
  expect((writes[0] as unknown[])[1]).toBe(1);
});

it("business-store failure still rejects the command, publishes nothing and leaves all prior facts and frames intact", async () => {
  const service = testService(
    new IndexedDbRepository(`business-failure-${id()}`),
  );
  const app = await service.submitApplication({
    name: "Keep",
    contact: "Alex",
    email: "keep@example.com",
    skill: "HVAC",
  });
  await service.startVizRecording((await service.getState()).events[0].eventId);
  const before = await service.getState(),
    notify = vi.fn(),
    unsubscribe = service.subscribe(notify);
  const original = IDBObjectStore.prototype.put;
  const fault = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === "state")
        throw new DOMException("Business storage full", "QuotaExceededError");
      return original.call(this, value, key);
    });
  try {
    await expect(
      service.recordScreeningDecision(app, "Proceed", ""),
    ).rejects.toThrow("Business storage full");
  } finally {
    fault.mockRestore();
    unsubscribe();
  }
  expect(notify).not.toHaveBeenCalled();
  expect(await service.getState()).toEqual(before);
});
