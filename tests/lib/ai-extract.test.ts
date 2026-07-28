import { test, expect } from "bun:test";
import { createAiService } from "@modules/resume/services/ai-service";

function envelope(contentObj: unknown, wrapFence = false): string {
  const json = JSON.stringify(contentObj);
  const content = wrapFence ? "```json\n" + json + "\n```" : json;
  return JSON.stringify({ choices: [{ message: { content } }] });
}

test("extractResume: disabled service returns empty fallback without calling fetch", async () => {
  let called = false;
  const svc = createAiService({
    apiKey: "",
    fetchImpl: (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch,
  });
  const res = await svc.extractResume({ text: "Ada Lovelace, engineer", language: "en" });
  expect(called).toBe(false);
  expect(res.source).toBe("fallback");
  expect(res.skills).toEqual([]);
  expect(res.workExperiences).toEqual([]);
  expect(res.educations).toEqual([]);
  expect(res.projects).toEqual([]);
  expect(res.personalInformation).toBeUndefined();
  expect(res.professionalSummary).toBeUndefined();
});

test("extractResume: blank text returns fallback without fetch", async () => {
  let called = false;
  const svc = createAiService({
    apiKey: "test-key",
    fetchImpl: (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch,
  });
  const res = await svc.extractResume({ text: "   \n  ", language: "en" });
  expect(called).toBe(false);
  expect(res.source).toBe("fallback");
});

test("extractResume: enabled maps a full envelope (personal+summary+skills+WE+EDU+project), coerces string years", async () => {
  const payload = {
    firstName: "Ada",
    lastName: "Lovelace",
    headline: "Software Engineer",
    email: "ada@example.com",
    phone: "+1 555 0100",
    city: "London",
    country: "UK",
    links: [
      { type: "linkedin", url: "https://linkedin.com/in/ada" },
      { url: "https://github.com/ada" },
      { url: "not a url" },
    ],
    professionalSummary: "Engineer with a decade of experience.",
    skills: ["TypeScript", "typescript", "  React  ", ""],
    workExperiences: [
      { jobTitle: "Senior Engineer", company: "Analytical Co", startYear: "2020", currentlyWorking: true, bullets: ["Led migration"] },
      { jobTitle: "Junior Developer", company: "Webworks", startYear: "2018", endYear: "2020" },
    ],
    educations: [
      { institution: "Meridian University", degree: "BSc", fieldOfStudy: "Computer Science", startYear: "2014", endYear: "2018" },
    ],
    projects: [
      { name: "Difference Engine", role: "Lead", description: "A machine.", technologies: ["gears", "steam"], url: "https://example.com/de" },
    ],
  };
  const fakeFetch = (async () =>
    new Response(envelope(payload, true), { status: 200 })) as unknown as typeof fetch;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.extractResume({ text: "full cv text", language: "en" });

  expect(res.source).toBe("ai");
  expect(res.personalInformation?.firstName).toBe("Ada");
  expect(res.personalInformation?.lastName).toBe("Lovelace");
  expect(res.personalInformation?.email).toBe("ada@example.com");
  expect(res.personalInformation?.city).toBe("London");
  // invalid url dropped, valid kept + classified
  expect(res.personalInformation?.links?.length).toBe(2);
  expect(res.personalInformation?.links?.some((l) => l.type === "linkedin")).toBe(true);
  expect(res.personalInformation?.links?.some((l) => l.type === "github")).toBe(true);

  expect(res.professionalSummary).toBe("Engineer with a decade of experience.");
  // deduped (case-insensitive), trimmed, blanks removed
  expect(res.skills).toEqual(["TypeScript", "React"]);

  expect(res.workExperiences.length).toBe(2);
  expect(res.workExperiences[0]!.startYear).toBe(2020); // coerced from "2020"
  expect(res.workExperiences[0]!.currentlyWorking).toBe(true);
  expect(res.workExperiences[1]!.endYear).toBe(2020);

  expect(res.educations.length).toBe(1);
  expect(res.educations[0]!.endYear).toBe(2018);

  expect(res.projects.length).toBe(1);
  expect(res.projects[0]!.name).toBe("Difference Engine");
  expect(res.projects[0]!.projectUrl).toBe("https://example.com/de");
  expect(res.projects[0]!.technologies).toEqual(["gears", "steam"]);
});

test("extractResume: garbage (non-JSON) provider output falls back, never throws", async () => {
  const fakeFetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "<html>nope</html>" } }] }), { status: 200 })) as unknown as typeof fetch;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.extractResume({ text: "stuff", language: "en" });
  expect(res.source).toBe("fallback");
  expect(res.workExperiences).toEqual([]);
  expect(res.projects).toEqual([]);
});

test("extractResume: drops items/fields missing required content, invalid email omitted", async () => {
  const payload = {
    firstName: "Grace",
    email: "not-an-email",
    workExperiences: [
      { jobTitle: "Engineer", startYear: 2019 }, // missing company -> dropped
      { jobTitle: "Analyst", company: "Data Co", startYear: 2021 }, // kept
      { jobTitle: "Ghost", company: "No Dates Inc" }, // no year anchor -> dropped
    ],
    educations: [{ degree: "BSc" }], // missing institution -> dropped
    projects: [{ role: "Lead" }, { name: "Real Project" }], // first missing name -> dropped
  };
  const fakeFetch = (async () =>
    new Response(envelope(payload), { status: 200 })) as unknown as typeof fetch;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.extractResume({ text: "x", language: "en" });
  expect(res.source).toBe("ai");
  expect(res.personalInformation?.firstName).toBe("Grace");
  expect(res.personalInformation?.email).toBeUndefined(); // invalid email dropped
  expect(res.workExperiences.length).toBe(1);
  expect(res.workExperiences[0]!.company).toBe("Data Co");
  expect(res.educations.length).toBe(0);
  expect(res.projects.length).toBe(1);
  expect(res.projects[0]!.name).toBe("Real Project");
});
