import { test, expect } from "bun:test";
import { createAiService } from "@modules/resume/services/ai-service";

function envelope(contentObj: unknown, wrapFence = false): string {
  const json = JSON.stringify(contentObj);
  const content = wrapFence ? "```json\n" + json + "\n```" : json;
  return JSON.stringify({ choices: [{ message: { content } }] });
}

test("structureSections: disabled service returns empty fallback without calling fetch", async () => {
  let called = false;
  const svc = createAiService({
    apiKey: "",
    fetchImpl: (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch,
  });
  const res = await svc.structureSections({
    experienceText: "Engineer at Analytical Co",
    educationText: "BSc at Uni",
    language: "en",
  });
  expect(called).toBe(false);
  expect(res.source).toBe("fallback");
  expect(res.workExperiences).toEqual([]);
  expect(res.educations).toEqual([]);
});

test("structureSections: both texts empty returns fallback without fetch", async () => {
  let called = false;
  const svc = createAiService({
    apiKey: "test-key",
    fetchImpl: (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch,
  });
  const res = await svc.structureSections({ experienceText: "  ", educationText: "", language: "en" });
  expect(called).toBe(false);
  expect(res.source).toBe("fallback");
});

test("structureSections: enabled maps a valid provider response to structured entries", async () => {
  const payload = {
    workExperiences: [
      {
        jobTitle: "Engineer",
        company: "Analytical Co",
        startYear: 2020,
        currentlyWorking: true,
        bullets: ["Led migration"],
      },
    ],
    educations: [{ institution: "Uni", degree: "BSc" }],
  };
  const fakeFetch = (async () =>
    new Response(envelope(payload, true), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.structureSections({
    experienceText: "Engineer at Analytical Co, 2020-present. Led migration.",
    educationText: "BSc, Uni",
    language: "en",
  });
  expect(res.source).toBe("ai");
  expect(res.workExperiences.length).toBe(1);
  const we = res.workExperiences[0]!;
  expect(we.jobTitle).toBe("Engineer");
  expect(we.company).toBe("Analytical Co");
  expect(we.startYear).toBe(2020);
  expect(we.startMonth).toBe(1); // structural default when only the year is stated
  expect(we.employmentType).toBe("full-time"); // structural default enum
  expect(we.currentlyWorking).toBe(true);
  expect(we.bullets).toEqual(["Led migration"]);
  expect(res.educations.length).toBe(1);
  expect(res.educations[0]!.institution).toBe("Uni");
  expect(res.educations[0]!.degree).toBe("BSc");
});

test("structureSections: coerces string years from the model (real router behaviour)", async () => {
  // The live model frequently returns years as strings, e.g. "2020".
  const payload = {
    workExperiences: [
      { jobTitle: "Senior Engineer", company: "Analytical Co", startYear: "2020", currentlyWorking: true, bullets: ["Led billing migration"] },
      { jobTitle: "Junior Developer", company: "Webworks", startYear: "2018", endYear: "2020", bullets: ["Shipped features"] },
    ],
    educations: [{ institution: "Meridian University", degree: "BSc", fieldOfStudy: "Computer Science", startYear: "2014", endYear: "2018" }],
  };
  const fakeFetch = (async () =>
    new Response(envelope(payload), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.structureSections({ experienceText: "x", educationText: "y", language: "en" });
  expect(res.source).toBe("ai");
  expect(res.workExperiences.length).toBe(2);
  expect(res.workExperiences[0]!.startYear).toBe(2020); // coerced from "2020"
  expect(res.workExperiences[1]!.endYear).toBe(2020);
  expect(res.educations.length).toBe(1);
  expect(res.educations[0]!.endYear).toBe(2018);
});

test("structureSections: garbage (non-JSON) provider output falls back, never throws", async () => {
  const fakeFetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "<html>nope</html>" } }] }), {
      status: 200,
    })) as unknown as typeof fetch;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.structureSections({ experienceText: "stuff", language: "en" });
  expect(res.source).toBe("fallback");
  expect(res.workExperiences).toEqual([]);
  expect(res.educations).toEqual([]);
});

test("structureSections: drops items missing required content fields, keeps valid ones", async () => {
  const payload = {
    workExperiences: [
      { jobTitle: "Engineer", startYear: 2019 }, // missing company -> dropped
      { jobTitle: "Analyst", company: "Data Co", startYear: 2021 }, // valid -> kept
      { jobTitle: "Ghost", company: "No Dates Inc" }, // no startYear anchor -> dropped
    ],
    educations: [{ degree: "BSc" }, { institution: "Real Uni" }], // first missing institution -> dropped
  };
  const fakeFetch = (async () =>
    new Response(envelope(payload), { status: 200 })) as unknown as typeof fetch;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.structureSections({ experienceText: "x", educationText: "y", language: "en" });
  expect(res.source).toBe("ai");
  expect(res.workExperiences.length).toBe(1);
  expect(res.workExperiences[0]!.company).toBe("Data Co");
  expect(res.educations.length).toBe(1);
  expect(res.educations[0]!.institution).toBe("Real Uni");
});
