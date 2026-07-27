import type { PersonalInformation } from "@modules/resume/types";

export function fullName(pi: PersonalInformation): string {
  return [pi.firstName, pi.middleName, pi.lastName]
    .filter((p) => p && p.trim())
    .join(" ");
}
