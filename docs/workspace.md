# Portable Demo Workspace

Iteration 3.6 adds a first-class Monitor view at `#/monitor?view=workspace`. The existing browser IndexedDB snapshot remains authoritative. Files are portable backups/scenarios, not a replacement live repository or an event replay mechanism.

## File contract

```json
{
  "format": "unity-fieldwork-workspace",
  "formatVersion": 1,
  "exportedAt": "2026-10-16T15:00:00.000Z",
  "scenario": { "name": "Activation ready", "description": "Publication outstanding" },
  "state": { "schemaVersion": 4, "revision": 123, "clock": "...", "...": "all authoritative collections" }
}
```

This is an envelope illustration, not a loadable fixture. Real files contain complete companies, applications, requirements, qualifications, evidence, work, workflows/history, events, attempts, outbox, simulation clock and optional Viz state. Name length: 1–120; description: up to 2000 characters. File limit: 50 MiB. Format/state/Viz versions currently supported are 1/4/1; recorded maps must match the supported pinned v2 adapter structure. No silent import migration or arbitrary workflow-definition import.

Sessions, tab-local preferences/playback settings, browser database internals and the local `workspaceEpoch` are excluded. Saved file metadata names the scenario; there is no separate custom-scenario database. Built-in scenario generation uses `buildScenario` in `src/workspace/scenarios.ts`, with normal service commands and the existing recorder in an isolated repository. Only confirmation changes the live repository.

`src/workspace/format.ts` is the runtime validation boundary: strict field shapes/enums/dates, unique identities, owned/cross-record references, supported maps, ordered and complete frames, scoped frame causes, lineage/processed IDs, current readiness/admin consistency, completed-workflow work constraints and active latest-frame consistency. It validates snapshots, not their cryptographic provenance or every historical decision by replay.

## Consistency and replacement

1. **Save:** per-service command queue -> existing exclusive Web Lock -> latest repository load -> cloned logical snapshot/envelope. No revision increment, business action or Viz frame. Invoke Chrome's picker before awaiting storage to preserve its required user gesture; otherwise use a conventional Blob download.
2. **Preview:** parse/validate before mutation; capture the current local revision; show scenario name/description, company identities, counts, clock and active frame. Offer to save current state first. Cancel/Escape changes nothing.
3. **Confirm:** validate/clone target, queue -> same Web Lock -> reload current state -> require the preview revision still to match -> rebase revision to `max(local, imported) + 1` -> fresh local epoch -> one atomic IndexedDB save -> release -> existing revision-only publication. No migration, integration execution, history reconstruction or recording capture during replacement.
4. **Reset:** same replacement transaction with `emptyState()` and a new clock, after typed RESET confirmation. Everything clears together, including recordings. Only local revision/epoch remain as coordination metadata.
5. **Other tabs:** normal invalidation/focus reload sees a higher revision. Stale reads cannot replace newer snapshots. Commands capture the observed epoch at enqueue time and reject if they reach the lock after a replacement. Two confirmations against one preview revision cannot overwrite each other. This requires current-version clients; close older builds before demonstrations.

Frame revisions, numbers, causes, IDs, pinned definitions and archived content are preserved. Normal export/import keeps object order too. For valid JSON whose object keys were reordered, only equal-valued active-frame comparison objects are aligned to the existing pure projection order; no recorded value changes or frames are added. This preserves the recorder's existing comparison behavior without changing its semantics.

Viz remounts at the persisted active journey's latest frame. Playback cursor, camera, expanded groups and Follow settings reset as tab-local presentation state. A valid existing company session/selection remains; a vanished contractor identity signs out, while an invalid internal company or queue filter requires explicit selection. The default company displayed on initial load is remembered so a later replacement cannot silently substitute a different company.

## Limits and verification

`src/workspace/workspace.test.ts` and `tests/browser/workspace.spec.ts` cover exact Frame 13, archives/attempts/waits, real downloads/imports, reset, continuation/reloading original, malformed/incompatible references, stale and competing replacements, transaction abort, native API contract/cancellation/write failure, selection cleanup, refresh and all-tab revisions. Native operating-system picker dialogs remain a manual check; the native API is mocked in browser automation.

History remains unbounded in one snapshot. Export/validation/clone/serialization cost and quota pressure increase with accumulated Viz frames and archives. No streaming, compression, pruning, near-limit performance or quota-recovery guarantee. Representative sizes and actual executed test results are in [STATUS](STATUS.md); detailed current acceptance steps and fictional exported files are local-only under `docs/chet/`.
