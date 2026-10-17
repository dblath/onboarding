# Viz recording contracts - Iteration 3.8

Recording is auxiliary committed-state observation. It does not execute work, alter business rules, or dispatch workflows. `src/viz/triggers.ts` is a closed catalog, not a rules language.

| Catalog point              | Accepted contract                                             | Root / pinned definition                                |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Every new application      | `ApplicationSubmitted`                                        | Correlated CompanyOnboarding v2 / map adapter 1         |
| After Recruitment approval | `ScreeningDecisionRecorded`, `payload.decision === "Proceed"` | Same onboarding root, at the approval commit            |
| Contractor becomes ready   | `ContractorReadinessChanged`, `payload.ready === true`        | Company's uniquely identified CompanyOnboarding v2 root |
| New skill request          | `SkillRequested`, including initial qualification requests    | Exact SkillQualification v2 root                        |

Readiness is a company lifecycle event. Its application identity, when present, constrains root resolution; otherwise a unique company onboarding root is required. No match is inferred from history messages, stages, timestamps, or Monitor rendering. Unsupported workflow versions/scopes produce a visible gap instead of guessed correlation. A readiness restoration after historical onboarding completion may therefore create a Completed Frame 0 recording; it never schedules activation, clears suspension or reopens the root.

## Committed-state capture

`OnboardingService.change` acquires the existing Web Lock, loads the latest logical workspace, remembers accepted event IDs, runs the command, then calls `safelyCaptureVisuals` before saving the new revision. New persisted events are examined in authoritative array order. Existing events, duplicate ingress, notifications, reads, initialization and imported history cannot fire a rule. There is no separate dispatch cursor vulnerable to replay on load. Since 3.8 business durability commits first, then isolated incremental recording transactions and a control checkpoint; see [observer storage](observer-storage.md) for interruption detection and all-store replacement.

Equivalent enabled rules share at most one automatic recording for `(eventId, root workflowId)`; only one map version is currently supported for that root. Each recording stores immutable matched-rule identity/name/kind snapshots, independent of later edits/removal. Rule fire counts count accepted matching occurrences, including a failed capture start; last-fired uses wall time for administration, never correlation. Manual starts intentionally may create additional recordings of an existing origin.

Frame 0 projects the final state of the triggering atomic command. A command that accepts several events does not fabricate intermediate frames. All currently scoped causes are marked seen; subsequent commits append at most one projected frame per recording when visual information changes, or on legitimate root completion. Attempts without events and persisted timer identities are supported. A second identical failure may add an attempt/processed identity without another identical visual frame. Old frames are never regenerated.

Company capture follows its root and explicitly application-linked initial skill. An independent skill capture follows only its exact qualification root. Shared readiness facts are dependencies, not permission to ingest another skill's execution. Every Recording instance is evaluated under the same lock; its changed metadata and new frames are saved together in its own auxiliary transaction. Normal reads take that lock to avoid displaying intermediate observer phases.

## Lifecycle and failure

- Recording: independently observes later scoped commits.
- Completed: the actual tracked root is terminal; the final commit is captured and completion revision stored. No later capture or workflow resumption.
- Stopped: explicit per-recording stop; history remains available.
- Capture issue: failed projection is quarantined with an explicit gap. Other captures and valid business commands continue. There is no automatic backfill/resume pretending missed frames were recorded.

Automatic-start failures remain visible on the rule and workspace warning. A later successful match does not reconstruct the missed recording. An auxiliary recording-storage failure preserves business durability, quarantines the uncertain capture and permits healthy recordings to continue. Control-storage failure produces an explicit workspace gap and may leave administration at its last checkpoint. Failed trigger administration reports failure. Authoritative business-storage failure still rejects the business command; shared browser quota exhaustion has no recovery guarantee.

The old `activeRecordingId` is retained as a compatibility/default-view hint. Version 2 capture never consults it. Journey Map binds its visible selection locally; changing selection, filters, playback or camera does not write state or stop any recording. A manual start can update the default hint for a later fresh launch, while already-viewing tabs retain their selection.

## Portability

New workspace exports are format 2 / state schema 4 / Viz 2. Version 1 files are validated in their original shape before `upgradeViz` adds statuses and an empty trigger list. Old archived frames stay stopped; a legacy active root already terminal becomes Completed at its last recorded revision. No frame, event or activity is replayed. Reset clears all triggers and recordings together.

All four untouched Iteration 3.6 JSON files are committed as compatibility test fixtures in `tests/fixtures/workspace-v1/`; these are copies of fictional saved scenarios, not the local-only Chet directory. Frame 13 and archived Frame 0 remain exact. Live projection key order is normalized only after equal-value validation, independently for each healthy running capture, even if an unrelated trigger has reported a gap.

There is no automatic retention limit. Frames append incrementally; unchanged metadata and old frames are not rewritten. Pinned maps and cause/processed identity arrays still increase metadata, projection, memory and full-file costs. The UI's existing 50 MiB save/import limit remains. Actual 650-to-663-frame measurements and executed checks are in [STATUS](STATUS.md); this is not unlimited or production-grade storage.
