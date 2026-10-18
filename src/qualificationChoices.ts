import { skillCatalog, type State } from "./domain";

/** Mirrors requestSkill's duplicate guard, including legitimate requalification. */
export function qualificationChoices(state: State, companyId: string) {
  return skillCatalog.map((skill) => {
    const blocking = state.qualifications.filter(
      (q) =>
        q.companyId === companyId &&
        q.skill === skill &&
        !["Rejected", "Invalidated"].includes(q.status),
    );
    return {
      skill,
      available: !blocking.length,
      reason: blocking.some((q) => q.status === "Approved")
        ? "already approved"
        : blocking.length
          ? "request in progress"
          : "",
    };
  });
}
