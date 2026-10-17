import { emptyState, type State } from "./domain";
import type { Repository } from "./application";
import type { VisualFrame, VizRecording, VizState } from "./viz/types";

const stores = ["state", "viz-control", "viz-recordings", "viz-frames"];
export type BusinessRow = Omit<State, "viz"> & {
  storageLayout: 2;
  observerExpected: boolean;
};
export type Head = Omit<VizRecording, "frames"> & {
  frameCount: number;
  observedRevision: number;
  epoch: string;
};
export type Control = {
  viz: Omit<VizState, "recordings">;
  recordingIds: string[];
  observedRevision: number;
  epoch: string;
  expectedRevisions?: Record<string, number>;
};
const epoch = (s: State) => s.workspaceEpoch ?? "original";
const gap =
  "Viz capture gap: auxiliary storage did not complete for the committed business revision. Previous frames are preserved; missing history will not be reconstructed.";
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
function completed(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("Storage transaction aborted."));
    tx.onerror = () => {};
  });
}
function freezeFrame(f: VisualFrame): VisualFrame {
  const freeze = (v: unknown) => {
    if (v && typeof v === "object" && !Object.isFrozen(v)) {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  freeze(f);
  return f;
}

/** Business durability first; auxiliary transactions are isolated per recording.
 * Frame rows are append-only. Replace/import is intentionally one all-store transaction. */
export class IndexedDbRepository implements Repository {
  private db: Promise<IDBDatabase>;
  private prepared = false;
  private cacheEpoch = "";
  private frames = new Map<string, VisualFrame[]>();
  private heads = new Map<string, Head>();
  constructor(name = "fieldwork-onboarding") {
    this.db = new Promise((resolve, reject) => {
      const r = indexedDB.open(name, 2);
      r.onupgradeneeded = () => {
        for (const store of stores)
          if (!r.result.objectStoreNames.contains(store))
            r.result.createObjectStore(store);
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => r.result.close();
        resolve(r.result);
      };
      r.onerror = () => reject(r.error);
      r.onblocked = () =>
        reject(
          new Error(
            "Storage upgrade is blocked. Close older application tabs and reload.",
          ),
        );
    });
  }
  /** Must be called under the command lock. Preserve legacy archives atomically before normal writes. */
  async prepare() {
    if (this.prepared) return;
    const db = await this.db;
    const raw = await request(
      db.transaction("state").objectStore("state").get("current"),
    );
    if (raw && raw.storageLayout !== 2) await this.replace(raw);
    this.prepared = true;
  }
  async load(): Promise<State> {
    const db = await this.db,
      tx = db.transaction(stores, "readonly"),
      done = completed(tx);
    const [raw, control, rows] = await Promise.all([
      request(tx.objectStore("state").get("current")),
      request<Control | undefined>(
        tx.objectStore("viz-control").get("current"),
      ),
      request<Head[]>(tx.objectStore("viz-recordings").getAll()),
    ]);
    await done;
    if (!raw) return emptyState();
    if (raw.storageLayout !== 2) {
      this.prepared = false;
      return raw;
    }
    const {
      storageLayout: _layout,
      observerExpected,
      ...business
    } = raw as BusinessRow;
    const s: State = business;
    if (this.cacheEpoch !== epoch(s)) {
      this.frames.clear();
      this.heads.clear();
      this.cacheEpoch = epoch(s);
    }
    const scoped = rows.filter(
      (r) => r.epoch === epoch(s) && r.observedRevision <= s.revision,
    );
    for (const head of scoped) {
      let cached = this.frames.get(head.id) ?? [];
      if (cached.length > head.frameCount) cached = [];
      if (cached.length < head.frameCount) {
        const read = db.transaction("viz-frames", "readonly"),
          finished = completed(read);
        const extra = await request<VisualFrame[]>(
          read
            .objectStore("viz-frames")
            .getAll(
              IDBKeyRange.bound(
                [head.id, cached.length],
                [head.id, head.frameCount - 1],
              ),
            ),
        );
        await finished;
        cached = [...cached, ...extra.map(freezeFrame)];
      }
      this.frames.set(head.id, cached);
      this.heads.set(head.id, structuredClone(head));
    }
    return assembleStoredWorkspace(raw, control, rows, this.frames);
  }
  private business(s: State): BusinessRow {
    const { viz: _viz, ...facts } = s;
    return { ...facts, storageLayout: 2, observerExpected: !!s.viz };
  }
  private head(s: State, r: VizRecording): Head {
    const { frames, ...metadata } = r;
    return {
      ...metadata,
      frameCount: frames.length,
      observedRevision: s.revision,
      epoch: epoch(s),
    };
  }
  private control(s: State): Control {
    const { recordings, ...viz } = s.viz!;
    return {
      viz,
      recordingIds: recordings.map((r) => r.id),
      observedRevision: s.revision,
      epoch: epoch(s),
      expectedRevisions: Object.fromEntries(
        recordings.map((r) => [r.id, s.revision]),
      ),
    };
  }
  async save(s: State) {
    await this.prepare();
    const db = await this.db;
    const businessTx = db.transaction("state", "readwrite"),
      businessDone = completed(businessTx);
    businessTx.objectStore("state").put(this.business(s), "current");
    await businessDone; // A failure here rejects the business command. No promise of quota recovery.
    const issues: string[] = [];
    const expectedRevisions: Record<string, number> = {};
    for (const r of s.viz?.recordings ?? []) {
      expectedRevisions[r.id] = s.revision;
      try {
        const previous = this.heads.get(r.id),
          head = this.head(s, r);
        const { observedRevision: _old, ...before } = previous ?? {};
        const { observedRevision: _new, ...after } = head;
        if (previous && JSON.stringify(before) === JSON.stringify(after)) {
          expectedRevisions[r.id] = previous.observedRevision;
          continue;
        }
        const tx = db.transaction(
            ["viz-recordings", "viz-frames"],
            "readwrite",
          ),
          done = completed(tx);
        try {
          tx.objectStore("viz-recordings").put(head, r.id);
          const start = previous?.frameCount ?? 0;
          if (r.frames.length < start)
            throw new Error("Recorded history cannot be shortened.");
          for (const f of r.frames.slice(start))
            tx.objectStore("viz-frames").add(f, [r.id, f.number]);
        } catch (e) {
          tx.abort();
          await done.catch(() => {});
          throw e;
        }
        await done;
        this.heads.set(r.id, structuredClone(head));
      } catch (e) {
        issues.push(
          `${r.companyName}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    if (s.viz) {
      try {
        const tx = db.transaction("viz-control", "readwrite"),
          done = completed(tx);
        const control = this.control(s);
        control.expectedRevisions = expectedRevisions;
        if (issues.length)
          control.viz.captureError = `${gap} ${issues.join("; ")}`;
        tx.objectStore("viz-control").put(control, "current");
        await done;
      } catch (e) {
        issues.push(
          `Recording controls: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return issues.length
      ? { captureError: `${gap} ${issues.join("; ")}` }
      : undefined;
  }
  /** Atomic replacement is deliberately separate from best-effort observation. */
  async replace(s: State) {
    const db = await this.db,
      tx = db.transaction(stores, "readwrite"),
      done = completed(tx);
    try {
      for (const store of stores) tx.objectStore(store).clear();
      tx.objectStore("state").put(this.business(s), "current");
      for (const r of s.viz?.recordings ?? []) {
        tx.objectStore("viz-recordings").put(this.head(s, r), r.id);
        for (const f of r.frames)
          tx.objectStore("viz-frames").add(f, [r.id, f.number]);
      }
      if (s.viz) tx.objectStore("viz-control").put(this.control(s), "current");
    } catch (e) {
      tx.abort();
      await done.catch(() => {});
      throw e;
    }
    await done;
    this.prepared = true;
    this.frames.clear();
    this.heads.clear();
    this.cacheEpoch = epoch(s);
  }
}

/** Shared logical reader; storage-only checkpoints never leak into portable State. */
export function assembleStoredWorkspace(
  raw: BusinessRow | State | undefined,
  control: Control | undefined,
  rows: Head[],
  frames: Map<string, VisualFrame[]>,
): State {
  if (!raw) return emptyState();
  if (!("storageLayout" in raw)) return raw;
  const { storageLayout: _layout, observerExpected, ...business } = raw;
  const s: State = business,
    scoped = rows.filter(
      (r) => r.epoch === epoch(s) && r.observedRevision <= s.revision,
    );
  const recordings = scoped.map((head) => {
    const { frameCount, observedRevision, epoch: _epoch, ...metadata } = head;
    const history = frames.get(head.id) ?? [];
    const r: VizRecording = { ...metadata, frames: [...history] };
    if (
      (r.status === "Recording" &&
        observedRevision !==
          (control?.epoch === epoch(s) &&
          control.observedRevision === s.revision
            ? (control.expectedRevisions?.[r.id] ?? s.revision)
            : s.revision)) ||
      history.length !== frameCount ||
      history.some((f, i) => f.number !== i)
    ) {
      r.status = "Capture issue";
      r.captureError = gap;
    }
    return r;
  });
  if (observerExpected || scoped.length || control?.epoch === epoch(s)) {
    const valid =
      control?.epoch === epoch(s) && control.observedRevision <= s.revision;
    s.viz = {
      ...(valid
        ? control!.viz
        : { version: 2 as const, activeRecordingId: "", triggers: [] }),
      recordings,
    };
    if (
      !valid ||
      control!.observedRevision !== s.revision ||
      control!.recordingIds.some((id) => !scoped.some((r) => r.id === id))
    )
      s.viz.captureError = gap;
    const order = valid ? control!.recordingIds : [];
    recordings.sort((a, b) => {
      const ai = order.indexOf(a.id),
        bi = order.indexOf(b.id);
      return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
    });
    if (!recordings.some((r) => r.id === s.viz!.activeRecordingId))
      s.viz.activeRecordingId = recordings[0]?.id ?? "";
  }
  return s;
}
