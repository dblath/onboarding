import { useState } from "react";
import type { State } from "../domain";
import type { OnboardingService } from "../application";
import type { Run } from "../TaskCard";
import { triggerCatalog } from "./triggers";
import type { RecordingTrigger, TriggerKind } from "./types";

export default function TriggerManager({
  state,
  service,
  run,
  busy,
}: {
  state: State;
  service: OnboardingService;
  run: Run;
  busy: boolean;
}) {
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TriggerKind>("application");
  const [enabled, setEnabled] = useState(false);
  function clear() {
    setEditing(undefined);
    setName("");
    setEnabled(false);
  }
  function edit(t: RecordingTrigger) {
    setEditing(t.id);
    setName(t.name);
    setKind(t.kind);
    setEnabled(t.enabled);
  }
  return (
    <section className="panel trigger-manager" aria-label="Recording Triggers">
      {state.viz?.captureError && (
        <p className="alert" role="alert">
          {state.viz.captureError}
        </p>
      )}
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE VIZ FISHING NET</span>
          <h2>Recording Triggers</h2>
        </div>
        <span className="pill">
          {state.viz?.triggers?.filter((t) => t.enabled).length ?? 0} enabled
        </span>
      </div>
      <p>
        Choose what to catch. Each matching commit starts its own journey, even
        when the Monitor is closed.
      </p>
      <p className="muted">
        Opt-in recording · local browser workspace · commands run only while the
        application is open. Disabling or removing a trigger leaves existing
        recordings running.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await service.saveRecordingTrigger({
              id: editing,
              name,
              kind,
              enabled,
            });
            clear();
          }, "Recording trigger saved.");
        }}
      >
        <div className="form-grid">
          <label>
            Trigger name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Capture point
            <select
              aria-label="Capture point"
              value={kind}
              onChange={(e) => setKind(e.target.value as TriggerKind)}
            >
              {triggerCatalog.map((t) => (
                <option key={t.kind} value={t.kind}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>
          <small>
            {triggerCatalog.find((t) => t.kind === kind)?.contract} →{" "}
            {triggerCatalog.find((t) => t.kind === kind)?.scope}
          </small>
        </p>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable this trigger
        </label>
        <div className="button-row">
          <button className="primary" disabled={busy}>
            {editing ? "Save trigger" : "Create trigger"}
          </button>
          {editing && (
            <button type="button" className="secondary" onClick={clear}>
              Cancel edit
            </button>
          )}
        </div>
      </form>
      <div className="trigger-list">
        {!state.viz?.triggers?.length && (
          <p>
            No triggers configured. Manual recording is still available in
            Journey Map.
          </p>
        )}
        {(state.viz?.triggers ?? []).map((t) => (
          <article key={t.id} className="trigger-row" aria-label={t.name}>
            <div>
              <h3>{t.name}</h3>
              <p>
                {triggerCatalog.find((c) => c.kind === t.kind)?.label ??
                  "Unsupported capture point"}{" "}
                · {t.enabled ? "Enabled" : "Disabled"}
              </p>
              <small>
                {triggerCatalog.find((c) => c.kind === t.kind)?.scope ??
                  "Unsupported definition/version"}
              </small>
              <p>
                {t.fireCount} occurrences · Last fired:{" "}
                {t.lastFiredAt
                  ? new Date(t.lastFiredAt).toLocaleString()
                  : "Never"}
              </p>
              {t.captureError && (
                <p role="alert" className="alert">
                  {t.captureError}
                </p>
              )}
            </div>
            <div className="button-row">
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      service.saveRecordingTrigger({
                        ...t,
                        enabled: !t.enabled,
                      }),
                    "Trigger updated.",
                  )
                }
              >
                {t.enabled ? "Disable" : "Enable"}
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => edit(t)}
              >
                Edit
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => service.removeRecordingTrigger(t.id),
                    "Trigger removed. Existing recordings preserved.",
                  )
                }
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      <details>
        <summary>Supported capture scopes</summary>
        <p>
          Only the four catalog entries above and version 2 workflows are
          supported. Readiness uses the accepted readiness event and the
          company’s uniquely identified onboarding root. Unsupported workflow
          versions produce a visible capture issue; business processing
          continues. No historical backfill, background worker or generic rule
          expressions.
        </p>
      </details>
    </section>
  );
}
