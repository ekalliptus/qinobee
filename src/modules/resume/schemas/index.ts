import { z } from "zod";
import { httpUrl, nonEmpty, boundedText } from "@lib/validation/primitives";

// ---- Core building blocks -------------------------------------------------

export const linkSchema = z.object({
  type: z.enum([
    "linkedin",
    "github",
    "portfolio",
    "behance",
    "dribbble",
    "website",
    "other",
  ]),
  url: httpUrl,
  label: boundedText(80).optional(),
});

export const personalInformationSchema = z.object({
  firstName: nonEmpty(80),
  middleName: boundedText(80).optional(),
  lastName: boundedText(80).optional(),
  headline: boundedText(160).optional(),
  email: z.email(),
  phone: boundedText(40).optional(),
  city: boundedText(120).optional(),
  country: boundedText(80).optional(),
  address: boundedText(200).optional(),
  photoUrl: httpUrl.optional(),
  links: z.array(linkSchema).default([]),
});

const month = z.number().int().min(1).max(12);
const year = z.number().int().min(1950).max(2100);

export const workExperienceSchema = z.object({
  jobTitle: boundedText(120),
  company: boundedText(160),
  employmentType: z.enum([
    "full-time",
    "part-time",
    "internship",
    "contract",
    "freelance",
    "apprenticeship",
    "volunteer",
  ]),
  city: boundedText(120).optional(),
  country: boundedText(80).optional(),
  remote: z.boolean().optional(),
  startMonth: month,
  startYear: year,
  endMonth: month.optional(),
  endYear: year.optional(),
  currentlyWorking: z.boolean().default(false),
  bullets: z.array(boundedText(500)).default([]),
  skillsUsed: z.array(boundedText(60)).default([]),
  companyWebsite: httpUrl.optional(),
});

export const educationSchema = z.object({
  institution: boundedText(160),
  degree: boundedText(120).optional(),
  fieldOfStudy: boundedText(120).optional(),
  level: boundedText(80).optional(),
  city: boundedText(120).optional(),
  country: boundedText(80).optional(),
  startYear: year.optional(),
  endYear: year.optional(),
  currentlyStudying: z.boolean().default(false),
  gpa: z.number().optional(),
  maxGpa: z.number().optional(),
  activities: boundedText(1000).optional(),
  coursework: z.array(boundedText(120)).default([]),
  achievements: z.array(boundedText(300)).default([]),
  description: boundedText(2000).optional(),
});

export const projectSchema = z.object({
  name: boundedText(160),
  role: boundedText(120).optional(),
  projectUrl: httpUrl.optional(),
  repositoryUrl: httpUrl.optional(),
  startDate: boundedText(1000).optional(),
  endDate: boundedText(1000).optional(),
  description: boundedText(2000).optional(),
  technologies: z.array(boundedText(60)).default([]),
});

// ---- Deferred sections (declared, permissive, default-empty) --------------

export const organisationSchema = z.object({
  name: boundedText(160),
  role: boundedText(120).optional(),
  city: boundedText(120).optional(),
  country: boundedText(80).optional(),
  startYear: year.optional(),
  endYear: year.optional(),
  currentlyActive: z.boolean().default(false),
  description: boundedText(2000).optional(),
});

export const volunteerExperienceSchema = z.object({
  organisation: boundedText(160),
  role: boundedText(120).optional(),
  city: boundedText(120).optional(),
  country: boundedText(80).optional(),
  startYear: year.optional(),
  endYear: year.optional(),
  currentlyActive: z.boolean().default(false),
  description: boundedText(2000).optional(),
});

export const certificationSchema = z.object({
  name: boundedText(160),
  issuer: boundedText(160).optional(),
  issueDate: boundedText(40).optional(),
  expiryDate: boundedText(40).optional(),
  credentialId: boundedText(120).optional(),
  credentialUrl: httpUrl.optional(),
});

export const awardSchema = z.object({
  title: boundedText(160),
  issuer: boundedText(160).optional(),
  date: boundedText(40).optional(),
  description: boundedText(1000).optional(),
});

export const languageSchema = z.object({
  name: boundedText(80),
  proficiency: boundedText(60).optional(),
});

// ---- Skills ---------------------------------------------------------------

export const skillGroupSchema = z.object({
  category: z.enum([
    "technical",
    "tools",
    "soft",
    "industry",
    "languages",
    "custom",
  ]),
  label: boundedText(80).optional(),
  skills: z.array(boundedText(60)).default([]),
});

// ---- Custom sections & section ordering -----------------------------------

export const customSectionSchema = z.object({
  title: boundedText(160),
  items: z
    .array(
      z.object({
        heading: boundedText(160).optional(),
        subheading: boundedText(160).optional(),
        description: boundedText(2000).optional(),
        bullets: z.array(boundedText(500)).default([]),
      }),
    )
    .default([]),
});

export const resumeSectionReferenceSchema = z.object({
  key: boundedText(80),
  label: boundedText(120).optional(),
});

// ---- Scoring --------------------------------------------------------------

export const resumeScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  label: boundedText(80).optional(),
  severity: z.enum(["critical", "important", "suggestion", "passed"]).optional(),
  issues: z
    .array(
      z.object({
        code: boundedText(80),
        message: boundedText(500),
        severity: z
          .enum(["critical", "important", "suggestion", "passed"])
          .optional(),
      }),
    )
    .default([]),
});

// ---- Root document --------------------------------------------------------

export const resumeDocumentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: nonEmpty(160),
  language: z.enum(["id", "en"]),
  templateId: z.string(),
  status: z.enum(["draft", "complete", "archived"]).default("draft"),
  personalInformation: personalInformationSchema,
  professionalSummary: boundedText(3000).optional(),
  workExperiences: z.array(workExperienceSchema).default([]),
  educations: z.array(educationSchema).default([]),
  projects: z.array(projectSchema).default([]),
  organisations: z.array(organisationSchema).default([]),
  volunteerExperiences: z.array(volunteerExperienceSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  awards: z.array(awardSchema).default([]),
  skillGroups: z.array(skillGroupSchema).default([]),
  languages: z.array(languageSchema).default([]),
  customSections: z.array(customSectionSchema).default([]),
  sectionOrder: z.array(resumeSectionReferenceSchema).default([]),
  hiddenSections: z.array(z.string()).default([]),
  templateSettings: z.record(z.string(), z.unknown()).default({}),
  latestScore: resumeScoreSchema.optional(),
  revision: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---- Input DTOs -----------------------------------------------------------

export const createResumeInputSchema = z.object({
  title: nonEmpty(160),
  language: z.enum(["id", "en"]),
  templateId: z.string().min(1),
  startingPoint: z
    .enum(["scratch", "profile", "duplicate", "import"])
    .optional(),
});

export const updateResumeInputSchema = resumeDocumentSchema
  .pick({
    title: true,
    language: true,
    templateId: true,
    status: true,
    personalInformation: true,
    professionalSummary: true,
    workExperiences: true,
    educations: true,
    projects: true,
    organisations: true,
    volunteerExperiences: true,
    certifications: true,
    awards: true,
    skillGroups: true,
    languages: true,
    customSections: true,
    sectionOrder: true,
    hiddenSections: true,
    templateSettings: true,
  })
  .partial();
