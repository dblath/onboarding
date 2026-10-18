import { useState, type FormEvent } from "react";
import type { OnboardingService } from "./application";
import {
  latestEvidence,
  type Decision,
  type EvidenceFixture,
  type State,
  type WorkItem,
} from "./domain";
import {
  businessActivityLabel,
  businessMessage,
  businessText,
  automationLink,
} from "./presentation";
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
  run: invoke,
  busy,
  automationExecution = false,
  contractorView = false,
  operationsView = false,
}: {
  task: WorkItem;
  state: State;
  service: OnboardingService;
  run: Run;
  busy: boolean;
  automationExecution?: boolean;
  contractorView?: boolean;
  operationsView?: boolean;
}) {
  const run: Run = (action, message) =>
    invoke(
      action,
      operationsView
        ? message.includes("Timeout")
          ? automationExecution
            ? "The verification service did not respond. Retry this action here or in Workflow Monitor."
            : "The verification service did not respond. Retry is available in Workflow Monitor."
          : t.activity === "ScreenApplication"
            ? "Application decision saved. Your work list has been updated."
            : t.activity === "ConfirmTraining"
              ? "Training confirmation saved. Current readiness has been updated."
              : "Action completed. Company progress and next ownership have been updated."
        : contractorView
          ? [
              "SubmitLicense",
              "SubmitInsurance",
              "SubmitFinancial",
              "SubmitAgreement",
            ].includes(t.activity)
            ? "Documents submitted. The responsible team will review them."
            : t.activity === "ProvideInformation"
              ? "Response sent to Recruitment."
              : t.activity === "SetupPortal"
                ? "Company profile complete. Your training is ready."
                : "Training submitted for confirmation."
          : message,
    );
  const [fail, setFail] = useState(false),
    [fixture, setFixture] = useState<EvidenceFixture>("Valid demo document");
  const q = s.qualifications.find((q) => q.id === t.qualificationId),
    evidence = latestEvidence(s, t),
    attempts = s.attempts.filter((a) => a.workItemId === t.id),
    failed = attempts.at(-1)?.status === "Failed";
  const timeoutControl = (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={fail}
        onChange={(event) => setFail(event.target.checked)}
      />{" "}
      Test a timeout on this attempt
    </label>
  );
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
    <article
      data-work-item={t.id}
      className={"task-card " + (failed ? "failed" : "")}
    >
      <div className="task-top">
        <span className="task-kind">
          {q ? `${q.skill} qualification` : "Company onboarding"}
        </span>
        <span className="pill neutral">
          {t.owner === "Simulation" ? "Automations & Integrations" : t.owner}
        </span>
      </div>
      <h3>{businessActivityLabel(t.activity)}</h3>
      <p className="task-instructions">{businessMessage(t.instructions)}</p>
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
          ▤ {businessText(evidence.fixture)}{" "}
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
              <option value="Valid demo document">Valid sample document</option>
              <option value="Expired demo document">
                Expired sample document
              </option>
              <option value="Incomplete demo document">
                Incomplete sample document
              </option>
            </select>
          </label>
          <p className="muted">
            Sample document submission. No files or real financial details are
            collected.
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
            Submit evidence →
          </button>
        </div>
      )}
      {integrationActivities.includes(t.activity) && (
        <div>
          {failed ? (
            <div className="failure-box" role="status">
              {operationsView ? (
                <>
                  <strong>Verification failed — retry available</strong>
                  <p>
                    {automationExecution
                      ? "The test service did not respond. Retry the same action here or in Workflow Monitor; completed work is preserved."
                      : "Waiting for external service. Review the attempt and retry in Workflow Monitor."}
                  </p>
                </>
              ) : (
                <>
                  <strong>
                    Technical failure · attempt {attempts.at(-1)!.attempt}
                  </strong>
                  <p>
                    {businessMessage(attempts.at(-1)!.technicalError ?? "")}
                  </p>
                  <p>
                    The work item remains open. Completed work is preserved.
                  </p>
                </>
              )}
            </div>
          ) : operationsView ? (
            <details className="ops-simulation-options">
              <summary>Test outcomes</summary>
              {timeoutControl}
            </details>
          ) : (
            timeoutControl
          )}
          {(failed || t.owner === "Simulation") && !automationExecution ? (
            <a href={automationLink(t.companyId, t.id)}>
              Open Automations & Integrations
            </a>
          ) : (
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
                      : "Test outcome recorded. See the result and next action.",
                )
              }
            >
              {failed
                ? "↻ Retry activity"
                : t.activity === "CreateVendor"
                  ? "Create vendor record"
                  : t.activity === "PublishActivation"
                    ? "Publish contractor activation"
                    : "Run test verification"}{" "}
              →
            </button>
          )}
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
