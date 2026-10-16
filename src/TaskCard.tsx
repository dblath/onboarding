import { useState, type FormEvent } from "react";
import type { OnboardingService } from "./application";
import {
  activityDefinitions,
  latestEvidence,
  type Decision,
  type EvidenceFixture,
  type State,
  type WorkItem,
} from "./domain";
export type Run = (
  action: () => Promise<unknown>,
  message: string,
) => Promise<void>;
const integrationActivities = [
  "ReviewInsurance",
  "ReviewFinancial",
  "ExecuteAgreement",
  "VerifyLicense",
  "CreateVendor",
  "PublishActivation",
];
export function TaskCard({
  task: t,
  state: s,
  service,
  run,
  busy,
}: {
  task: WorkItem;
  state: State;
  service: OnboardingService;
  run: Run;
  busy: boolean;
}) {
  const [fail, setFail] = useState(false),
    [fixture, setFixture] = useState<EvidenceFixture>("Valid demo document");
  const q = s.qualifications.find((q) => q.id === t.qualificationId),
    evidence = latestEvidence(s, t),
    attempts = s.attempts.filter((a) => a.workItemId === t.id),
    failed = attempts.at(-1)?.status === "Failed";
  function form(
    e: FormEvent<HTMLFormElement>,
    action: (f: FormData) => Promise<unknown>,
    message: string,
  ) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() => action(f), message);
  }
  return (
    <article className={"task-card " + (failed ? "failed" : "")}>
      <div className="task-top">
        <span className="task-kind">
          {q ? `${q.skill} qualification` : "Company onboarding"}
        </span>
        <span className="pill neutral">
          {t.owner === "Simulation"
            ? "Operations · System Activities"
            : t.owner}
        </span>
      </div>
      <h3>{activityDefinitions[t.activity].label}</h3>
      <p className="task-instructions">{t.instructions}</p>
      <div className="task-due">
        Due {new Date(t.dueAt).toLocaleDateString()}{" "}
        {t.escalatedAt ? (
          <b>· Escalated</b>
        ) : t.remindedAt ? (
          <b>· Reminder issued</b>
        ) : null}
      </div>
      {evidence && (
        <div className="evidence-chip">
          ▤ {evidence.fixture}{" "}
          <small>
            v{evidence.version} · {evidence.verificationState}
          </small>
        </div>
      )}
      {t.activity === "ScreenApplication" && (
        <form
          onSubmit={(e) =>
            form(
              e,
              (f) =>
                service.recordScreeningDecision(
                  t.applicationId!,
                  String(f.get("decision")) as Decision,
                  String(f.get("reason")),
                ),
              "Screening decision delivered to the workflow.",
            )
          }
        >
          <label>
            Screening outcome
            <select name="decision">
              <option value="Proceed">Proceed</option>
              <option value="RequestInformation">Request information</option>
              <option value="Decline">Decline</option>
            </select>
          </label>
          <label>
            Reason / requested information
            <textarea
              name="reason"
              placeholder="Required for a request or decline"
            />
          </label>
          <button disabled={busy} className="primary">
            Record decision →
          </button>
        </form>
      )}
      {t.activity === "ProvideInformation" && (
        <form
          onSubmit={(e) =>
            form(
              e,
              (f) =>
                service.submitAdditionalInformation(
                  t.applicationId!,
                  String(f.get("response")),
                ),
              "Information submitted. Recruitment review resumed.",
            )
          }
        >
          <label>
            Response
            <textarea name="response" required />
          </label>
          <button disabled={busy} className="primary">
            Submit information →
          </button>
        </form>
      )}
      {[
        "SubmitLicense",
        "SubmitInsurance",
        "SubmitFinancial",
        "SubmitAgreement",
      ].includes(t.activity) && (
        <div>
          <label>
            Fictional evidence fixture
            <select
              value={fixture}
              onChange={(e) => setFixture(e.target.value as EvidenceFixture)}
            >
              <option>Valid demo document</option>
              <option>Expired demo document</option>
              <option>Incomplete demo document</option>
            </select>
          </label>
          <p className="muted">
            Simulated document submission. No files or real financial details
            are collected.
          </p>
          <button
            disabled={busy}
            className="primary"
            onClick={() =>
              run(
                () => service.submitEvidence(t.id, fixture),
                "Evidence submitted. A review activity has been scheduled.",
              )
            }
          >
            Submit demo evidence →
          </button>
        </div>
      )}
      {integrationActivities.includes(t.activity) && (
        <div>
          {failed ? (
            <div className="failure-box" role="status">
              <strong>
                Technical failure · attempt {attempts.at(-1)!.attempt}
              </strong>
              <p>{attempts.at(-1)!.technicalError}</p>
              <p>The work item remains open. Completed work is preserved.</p>
            </div>
          ) : (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={fail}
                onChange={(e) => setFail(e.target.checked)}
              />{" "}
              Inject a simulated timeout on this attempt
            </label>
          )}
          <button
            disabled={busy}
            className={failed ? "retry-button" : "primary"}
            onClick={() =>
              run(
                () =>
                  failed
                    ? service.retryActivity(t.id)
                    : service.executeActivity(t.id, fail),
                failed
                  ? "Retry completed. See the activity result and next work."
                  : fail
                    ? "Timeout recorded. The workflow is waiting for a retry."
                    : "Simulated outcome delivered to the workflow.",
              )
            }
          >
            {failed
              ? "↻ Retry activity"
              : `Run ${t.activity === "CreateVendor" ? "vendor provisioning" : t.activity === "PublishActivation" ? "activation publication" : "simulated verification"}`}{" "}
            →
          </button>
        </div>
      )}
      {t.activity === "ApproveSkill" && (
        <form
          onSubmit={(e) =>
            form(
              e,
              (f) =>
                service.decideSkill(
                  t.id,
                  f.get("decision") === "Approve",
                  String(f.get("reason")),
                ),
              "Skill decision delivered. Readiness reevaluated.",
            )
          }
        >
          <label>
            Qualification decision
            <select name="decision">
              <option>Approve</option>
              <option>Reject</option>
            </select>
          </label>
          <label>
            Decision note
            <textarea
              name="reason"
              placeholder="Required if rejecting this skill"
            />
          </label>
          <button disabled={busy} className="primary">
            Record skill decision →
          </button>
        </form>
      )}
      {["SetupPortal", "CompleteTraining", "ConfirmTraining"].includes(
        t.activity,
      ) && (
        <form
          onSubmit={(e) =>
            form(
              e,
              () => service.completeParticipantTask(t.id),
              "Completion delivered. The workflow evaluated the next step.",
            )
          }
        >
          <label className="checkbox">
            <input type="checkbox" required />{" "}
            {t.activity === "SetupPortal"
              ? "I have configured the fictional portal profile."
              : t.activity === "CompleteTraining"
                ? "I have completed the demo safety, job acceptance and network induction."
                : "I confirm the contractor completed the initial induction."}
          </label>
          <button disabled={busy} className="primary">
            {t.activity === "ConfirmTraining"
              ? "Confirm training"
              : t.activity === "SetupPortal"
                ? "Complete portal setup"
                : "Complete initial training"}{" "}
            →
          </button>
        </form>
      )}
    </article>
  );
}
