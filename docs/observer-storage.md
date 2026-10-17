# Observe, Leave No Trace — Iteration 3.8

Viz still computes committed-state projections inside the existing command lock. It does not execute work or change business rules. Its historical frames now have separate incremental durability, rather than being rewritten with business facts.

## Storage layout

IndexedDB `fieldwork-onboarding` is database version **2**. Business schema stays **4**; portable format stays **2**, with original format **1** supported. Stores:

| Store            | Key / value                                                                                                                     | Responsibility                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `state`          | `current`: business facts, revision/epoch, `storageLayout: 2`, `observerExpected`                                               | Authoritative business durability; contains no Viz history or trigger definitions        |
| `viz-control`    | `current`: trigger configuration/counts, default view, recording order, expected metadata revisions, workspace epoch/checkpoint | Small observer control/checkpoint ledger                                                 |
| `viz-recordings` | recording ID: metadata, pinned definition, causal identities, frame count, epoch and observed revision                          | Only changed recording metadata is written                                               |
| `viz-frames`     | `[recordingId, frameNumber]`: immutable frame                                                                                   | Only new frames are appended with `add`; normal commands never overwrite historical keys |

`src/indexedDbRepository.ts` implements these mechanics behind the existing Repository port. `application.ts` re-exports its class to preserve existing imports. `assembleStoredWorkspace` reconstructs the same logical State for queries, UI and portable exports; storage checkpoints never leak into saved files.

## Ordinary command sequence

1. Acquire the existing Web Lock, atomically prepare any legacy layout, load latest State and validate the observed replacement epoch.
2. Run the existing business command and safely compute Viz projection changes using actual accepted event/cause identities. Compare business JSON independently of Viz; auxiliary change detection uses metadata and frame counts, not all historical frames.
3. Commit business facts/revision in a transaction containing **only `state`**. Failure rejects the command and publishes nothing.
4. For each changed recording, commit its metadata and newly appended frames together in an isolated transaction. A failure rolls back only that recording transaction; continue the others.
5. Commit the small observer control/checkpoint ledger, including the metadata revision expected for each recording. Unchanged histories and metadata are not rewritten.
6. Release the command lock and publish only the existing revision notification. Production `getState` acquires the same lock, so normal readers do not render a half-finished observer phase. Read-only loading remains possible if browser write coordination is unavailable.

No second queue, backend, journal dispatcher or workflow engine was added. The business write happens after safe projection computation but before auxiliary storage. There is no promise that arbitrary JavaScript resource exhaustion cannot affect a browser; the tested guarantee is that ordinary auxiliary projection/storage failure does not veto an otherwise valid business write.

## Failure and interruption

If recording metadata/frame storage fails, its persisted metadata revision does not satisfy the current control ledger. A reader conservatively marks it **Capture issue**, retaining exactly its last saved frames. Missing/new recording metadata produces an explicit workspace gap. No frames are fabricated or historical business events replayed. Healthy recordings with satisfied checkpoints continue.

If the control transaction itself fails, the committed business revision and old control checkpoint disagree. Readers report a workspace capture gap; uncertain running recordings are conservatively quarantined unless their metadata proves observation of the current revision. Control-wide failure may leave trigger counts/configuration at the last successful checkpoint. Trigger administration reports failure rather than claiming its change was saved. Subsequent initialization never recreates missed historical starts to repair counts.

A browser interruption after business commit but before observer completion uses the same checkpoint detection on the next load. Already completed roots are never resumed. Frames are immutable in the repository's per-tab cache; arrays can grow by appending newly persisted frames, but old frame objects are frozen. Metadata comparison baselines are independently cloned so a caller cannot mutate the persisted-change baseline.

If authoritative business storage fails or the origin is exhausted, successful business persistence is not promised. It still rejects the command. This is independently fault-tested. No automatic retention, pruning, compression, retry/backfill or silent loss of stored frames was introduced.

## Read performance and concurrency

Each repository keeps an epoch-scoped immutable frame cache. Reads refresh business/control/metadata and fetch only new frame ranges. Historical frames are not loaded from IndexedDB again for every command or notification in a warmed tab. Initial load, export and playback still assemble the complete logical workspace, so memory grows with history and each tab retains its own cache.

All writes and production assembled reads remain coordinated by `fieldwork-onboarding:commands:v1`. Notifications remain `fieldwork-onboarding:changes:v1`, revision only, after durability attempts and lock release. There is no notification-driven capture. Old queued commands reject after workspace replacement exactly as before.

## Migration, replacement and compatibility

`prepare` migrates the original single-row layout atomically under the command lock, preserving existing frames/archives before ordinary writes. Older application tabs must close to permit the database version upgrade. If migration storage fails, the original workspace remains unchanged; make a backup/free storage before trying again.

Confirmed Load and Reset deliberately use a **single all-store replacement transaction**, rather than the best-effort observer path. Any failure leaves every previous store unchanged. Replacement revision is rebased, epoch changes, all caches invalidate, and importing events never fires triggers. The existing preview/backup/cancellation/stale-review safety remains intact.

Original 3.6 files are unchanged fixtures in `tests/fixtures/workspace-v1/`. The original delivered 3.7 multi-recording file is in `tests/fixtures/workspace-v2/iteration-3.7.json`. Both formats restore and continue without regeneration. Normal Save still exports one complete portable JSON workspace; the 50 MiB file limit remains visible.

## Evidence and limits

`src/observerPersistence.test.ts` covers per-record quota failure/healthy continuation, control-write failure and honest administration, authoritative business failure, atomic replacement rollback, original v1 database migration/Frame 13 continuation, untouched 3.7 restore/continuation/reset, and append-only writes. Browser acceptance injects an actual `viz-frames.add` failure while a business decision and healthy capture continue. The scale browser case uses legitimate service commands for 25 companies, 50 company/skill recordings and 650 initial frames, progressing to 663 across three tabs.

Before/after timings, logical storage sizes and methodology are recorded in STATUS and the local-only Chet metrics. This is a prototype improvement, not production durability or unlimited scale. Cold loads/export/import still process complete history; business facts and events still use one snapshot; metadata/identity arrays grow; physical disk quota, near-50-MiB files, crash timing across every browser implementation and low-memory devices are not exhaustively characterized.
