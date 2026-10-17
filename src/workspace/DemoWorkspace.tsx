import { useEffect, useRef, useState } from "react";
import type { OnboardingService } from "../application";
import type { State } from "../domain";
import type { Run } from "../TaskCard";
import {
  maxWorkspaceBytes,
  parseWorkspaceFile,
  workspaceFilename,
  workspaceSummary,
  type WorkspaceFile,
} from "./format";
import { buildScenario, scenarios, type ScenarioId } from "./scenarios";
import "./workspace.css";

type SaveHandle = {
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
    abort(): Promise<void>;
  }>;
};
type SaveWindow = Window & {
  showSaveFilePicker?: (options: unknown) => Promise<SaveHandle>;
};
type Preview = {
  file?: WorkspaceFile;
  revision: number;
  currentCompanies: number;
};

export default function DemoWorkspace({
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
  const [name, setName] = useState("My demonstration"),
    [description, setDescription] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [resetText, setResetText] = useState("");
  const [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const downloadUrl = useRef<string | undefined>(undefined);
  useEffect(() => {
    const cleanup = () => {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = undefined;
    };
    window.addEventListener("pagehide", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      cleanup();
    };
  }, []);
  const disabled = busy || working;
  useEffect(() => {
    if (preview) dialog.current?.showModal();
    else dialog.current?.close();
  }, [preview]);
  const current = {
    companies: state.companies.length,
    work: state.workItems.filter((t) => t.status === "Open").length,
    frames: state.viz?.recordings.reduce((n, r) => n + r.frames.length, 0) ?? 0,
  };
  const active = state.viz?.recordings.find(
    (r) => r.id === state.viz?.activeRecordingId,
  );
  async function save(downloadOnly = false) {
    setError("");
    setMessage("");
    if (!name.trim() || name.trim().length > 120 || description.length > 2000) {
      setError(
        "Provide a scenario name of 1–120 characters and a description of up to 2000 characters.",
      );
      return;
    }
    setWorking(true);
    try {
      const picker = (window as SaveWindow).showSaveFilePicker;
      // Invoke the picker before awaiting storage, while Chrome's user activation is available.
      const handle =
        !downloadOnly && picker
          ? await picker.call(window, {
              suggestedName: workspaceFilename(name),
              types: [
                {
                  description: "Unity fieldwork workspace",
                  accept: { "application/json": [".json"] },
                },
              ],
            })
          : undefined;
      const file = await service.saveWorkspace(name, description),
        json = JSON.stringify(file, null, 2),
        blob = new Blob([json], { type: "application/json" });
      if (blob.size > maxWorkspaceBytes)
        throw new Error(
          "This workspace exceeds the supported 50 MiB file limit. No file was written.",
        );
      if (handle) {
        const writable = await handle.createWritable();
        try {
          await writable.write(blob);
          await writable.close();
        } catch (e) {
          await writable.abort().catch(() => {});
          throw e;
        }
      } else {
        if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = workspaceFilename(name);
        document.body.append(a);
        a.click();
        a.remove();
        // Retain only the latest blob until the next download or view/page exit.
        downloadUrl.current = url;
      }
      setMessage(
        `${handle ? "Saved" : "Download started"}: ${file.scenario.name} · ${(blob.size / 1024).toFixed(1)} KiB. ${preview ? "Keep this file before replacing the workspace." : "Sign-ins are not included."}`,
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError")
        setMessage("Save cancelled. Workspace unchanged.");
      else
        setError(
          `${e instanceof Error ? e.message : String(e)} You can also use Download JSON.`,
        );
    } finally {
      setWorking(false);
    }
  }
  async function review(file?: WorkspaceFile) {
    setError("");
    setConfirmed(false);
    setResetText("");
    try {
      const current = await service.getState();
      setPreview({
        file,
        revision: current.revision,
        currentCompanies: current.companies.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function readFile(file: File) {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      if (file.size > maxWorkspaceBytes)
        throw new Error("Workspace file exceeds the supported 50 MiB limit.");
      await review(parseWorkspaceFile(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }
  async function scenario(id: ScenarioId) {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await review(await buildScenario(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }
  const summary = preview?.file ? workspaceSummary(preview.file) : undefined;
  return (
    <section className="panel demo-workspace" aria-label="Demo Workspace">
      <div className="section-heading">
        <div>
          <div className="eyebrow">WORKFLOW MONITOR</div>
          <h2>Demo Workspace</h2>
        </div>
        <span className="pill neutral">Simulation · browser workspace</span>
      </div>
      <p>
        Bring a saved business story to your next meeting. Save all company
        records and Viz history together; sign-ins stay in each tab.
      </p>
      <div className="workspace-metrics">
        <span>
          <strong>{current.companies}</strong> companies
        </span>
        <span>
          <strong>{current.work}</strong> open actions
        </span>
        <span>
          <strong>{current.frames}</strong> recorded frames
        </span>
        {active && (
          <span>
            Active Viz: <strong>Frame {active.frames.at(-1)?.number}</strong>
          </span>
        )}
        <span>Clock: {new Date(state.clock).toLocaleString()}</span>
      </div>
      <div className="workspace-save">
        <label>
          Scenario name
          <input
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            aria-label="Description"
            maxLength={2000}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      <div className="workspace-actions">
        <button
          className="primary"
          disabled={disabled}
          onClick={() => void save()}
        >
          Save State
        </button>
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => void save(true)}
        >
          Download JSON
        </button>
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          Load State
        </button>
        <button
          className="text-button"
          disabled={disabled}
          onClick={() => void review()}
        >
          Reset Workspace
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Workspace JSON file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void readFile(file);
        }}
      />
      {!preview && error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!preview && message && <p role="status">{message}</p>}
      <h3>Prepared business scenarios</h3>
      <div className="workspace-scenarios">
        {scenarios.map((s) => (
          <article key={s.id}>
            <h4>{s.name}</h4>
            <p>{s.description}</p>
            <button
              className="secondary"
              disabled={disabled}
              onClick={() => void scenario(s.id)}
            >
              Preview {s.name}
            </button>
          </article>
        ))}
      </div>
      <p className="muted">
        Prepared scenarios use Summit Field Services. Contractor sign-in:
        alex@example.com with simulation password 123.
      </p>
      <p className="muted">
        Save a JSON file to keep this workspace for another meeting. Supported
        size: up to 50 MiB. Long Viz histories increase file size and restore
        time. Loading or resetting replaces this entire browser workspace in
        every tab.
      </p>
      <dialog
        ref={dialog}
        aria-labelledby="workspace-confirm-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!disabled) setPreview(null);
        }}
      >
        {preview && (
          <>
            <h2 id="workspace-confirm-title">
              {preview.file ? "Load workspace?" : "Reset workspace?"}
            </h2>
            {preview.file ? (
              <>
                <h3>{preview.file.scenario.name}</h3>
                <p>
                  {preview.file.scenario.description ||
                    "No description supplied."}
                </p>
                <p>
                  {preview.file.state.companies
                    .slice(0, 3)
                    .map((c) => `${c.name} (${c.email})`)
                    .join("; ")}
                  {preview.file.state.companies.length > 3
                    ? `; +${preview.file.state.companies.length - 3} more companies`
                    : ""}
                </p>
                <p>
                  Restore {summary!.companies} companies,{" "}
                  {preview.file.state.workflows.length} processes,{" "}
                  {summary!.openWork} open actions, {summary!.events} business
                  updates and {summary!.failedAttempts} failed attempts.
                </p>
                <p>
                  {summary!.recordings} Viz recordings · {summary!.frames}{" "}
                  recorded frames · simulation clock{" "}
                  {new Date(preview.file.state.clock).toLocaleString()}.
                </p>
                <p>
                  {preview.file.state.viz?.activeRecordingId
                    ? `Active journey restores at Frame ${preview.file.state.viz.recordings.find((r) => r.id === preview.file!.state.viz!.activeRecordingId)!.frames.at(-1)!.number}.`
                    : "No active Viz journey in this file."}
                </p>
              </>
            ) : (
              <p>
                This permanently removes all companies, processes, events, work
                and Viz recordings from this browser workspace. It cannot be
                undone without a saved file.
              </p>
            )}
            <p>
              This replaces the current workspace ({preview.currentCompanies}{" "}
              companies) in all tabs. Existing work is not merged.
            </p>
            <button
              className="secondary"
              disabled={disabled}
              onClick={() => void save()}
            >
              Save current workspace first
            </button>
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => void save(true)}
            >
              Download current workspace
            </button>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            {preview.file ? (
              <label className="workspace-consent">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Replace the entire current workspace with this scenario
              </label>
            ) : (
              <label>
                Type RESET to permanently clear the workspace
                <input
                  value={resetText}
                  autoComplete="off"
                  onChange={(e) => setResetText(e.target.value)}
                />
              </label>
            )}
            <div className="workspace-actions">
              <button
                className="primary"
                disabled={
                  disabled ||
                  (preview.file ? !confirmed : resetText !== "RESET")
                }
                onClick={() =>
                  void run(
                    async () => {
                      try {
                        if (preview.file) {
                          await service.restoreWorkspace(
                            preview.file,
                            preview.revision,
                          );
                          setName(preview.file.scenario.name);
                          setDescription(preview.file.scenario.description);
                        } else await service.resetWorkspace(preview.revision);
                        setPreview(null);
                        setMessage("");
                      } catch (e) {
                        setError(e instanceof Error ? e.message : String(e));
                        throw e;
                      }
                    },
                    preview.file
                      ? "Workspace restored. All tabs will show the restored state."
                      : "Workspace reset. Start a new application or load a scenario.",
                  )
                }
              >
                {preview.file
                  ? "Confirm Load State"
                  : "Permanently Reset Workspace"}
              </button>
              <button
                className="secondary"
                disabled={disabled}
                onClick={() => {
                  setPreview(null);
                  setError("");
                  setMessage("");
                }}
              >
                Cancel
              </button>
              <button
                className="text-button"
                disabled={disabled}
                onClick={() => void review(preview.file)}
              >
                Refresh replacement review
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
