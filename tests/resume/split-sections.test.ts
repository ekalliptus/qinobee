import { test, expect } from "bun:test";
import { splitExperienceBlocks, splitEducationBlocks } from "@modules/resume/import/split-sections";

const EXP = `Frontend Developer, PT Nusantara (Jan 2022 - Present)
- Built the e-commerce dashboard
- Improved load speed by 30%
Web Developer Intern, Startup Kreatif (2021 - 2021)
- Developed landing pages`;

test("splits two experience blocks with title/company/years/bullets", () => {
  const blocks = splitExperienceBlocks(EXP);
  expect(blocks.length).toBe(2);
  expect(blocks[0]!.jobTitle).toBe("Frontend Developer");
  expect(blocks[0]!.company).toBe("PT Nusantara");
  expect(blocks[0]!.startYear).toBe(2022);
  expect(blocks[0]!.currentlyWorking).toBe(true);
  expect(blocks[0]!.bullets).toContain("Built the e-commerce dashboard");
  expect(blocks[1]!.jobTitle).toBe("Web Developer Intern");
  expect(blocks[1]!.endYear).toBe(2021);
});

test("empty text -> no blocks", () => {
  expect(splitExperienceBlocks("")).toEqual([]);
  expect(splitExperienceBlocks("   \n ")).toEqual([]);
});

test("block with only bullets and no header is dropped (no fabrication)", () => {
  expect(splitExperienceBlocks("- did things\n- more things").length).toBe(0);
});

const EDU = `Bachelor of Informatics, Institut Teknologi Bandung (2018 - 2022)
GPA 3.7
Senior High School, SMAN 1 Bandung (2015 - 2018)`;

test("splits education blocks with institution/degree/years", () => {
  const blocks = splitEducationBlocks(EDU);
  expect(blocks.length).toBe(2);
  expect(blocks[0]!.institution).toContain("Institut Teknologi Bandung");
  expect(blocks[0]!.degree).toContain("Bachelor of Informatics");
  expect(blocks[0]!.startYear).toBe(2018);
  expect(blocks[0]!.endYear).toBe(2022);
});

test("education empty -> []", () => {
  expect(splitEducationBlocks("")).toEqual([]);
});
