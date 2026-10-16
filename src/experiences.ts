import { useEffect, useState } from "react";
import type { Persona } from "./domain";

export type Experience = "contractor" | "operations" | "monitor";
export const experienceNames: Record<Experience, string> = {
  contractor: "Contractor Portal",
  operations: "Onboarding Operations",
  monitor: "Workflow Monitor",
};
export const internalPersonas = [
  "Recruitment",
  "Compliance",
  "Finance",
  "Contractor Relations",
  "Field Manager",
  "Training",
] as const satisfies readonly Persona[];
export type InternalPersona = (typeof internalPersonas)[number];
function readExperience(): Experience {
  const route = window.location.hash.slice(1);
  return route === "/operations"
    ? "operations"
    : route === "/monitor"
      ? "monitor"
      : "contractor";
}
export function useExperience() {
  const [experience, setExperience] = useState(readExperience);
  useEffect(() => {
    const changed = () => setExperience(readExperience());
    window.addEventListener("hashchange", changed);
    if (
      !["#/contractor", "#/operations", "#/monitor"].includes(
        window.location.hash,
      )
    )
      window.location.replace("#/contractor");
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    document.title = `${experienceNames[experience]} · Fieldwork`;
  }, [experience]);
  return experience;
}
