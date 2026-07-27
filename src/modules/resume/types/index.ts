import type { z } from "zod";
import type * as S from "@modules/resume/schemas";

export type Link = z.infer<typeof S.linkSchema>;
export type PersonalInformation = z.infer<typeof S.personalInformationSchema>;
export type WorkExperience = z.infer<typeof S.workExperienceSchema>;
export type Education = z.infer<typeof S.educationSchema>;
export type Project = z.infer<typeof S.projectSchema>;
export type Organisation = z.infer<typeof S.organisationSchema>;
export type VolunteerExperience = z.infer<
  typeof S.volunteerExperienceSchema
>;
export type Certification = z.infer<typeof S.certificationSchema>;
export type Award = z.infer<typeof S.awardSchema>;
export type Language = z.infer<typeof S.languageSchema>;
export type SkillGroup = z.infer<typeof S.skillGroupSchema>;
export type CustomSection = z.infer<typeof S.customSectionSchema>;
export type ResumeSectionReference = z.infer<
  typeof S.resumeSectionReferenceSchema
>;
export type ResumeScore = z.infer<typeof S.resumeScoreSchema>;
export type ResumeDocument = z.infer<typeof S.resumeDocumentSchema>;
export type CreateResumeInput = z.infer<typeof S.createResumeInputSchema>;
export type UpdateResumeInput = z.infer<typeof S.updateResumeInputSchema>;
