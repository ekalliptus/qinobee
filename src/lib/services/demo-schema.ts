import { z } from "zod";

export const SOLUTIONS = [
  "Career Management",
  "Internship Management",
  "Mentoring",
  "Student Life",
  "Scholarships",
  "International Exchange",
  "Resume Builder",
  "Analytics",
  "Custom Solution",
] as const;

export const demoSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  workEmail: z.string().trim().toLowerCase().pipe(z.email()),
  institution: z.string().trim().min(1).max(160),
  jobTitle: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(80),
  institutionSize: z.string().trim().min(1).max(40),
  solutions: z.array(z.string().max(60)).min(1).max(20),
  challenge: z.string().trim().max(2000).optional().default(""),
  preferredContact: z.enum(["email", "phone", "either"]).default("email"),
  consent: z.literal(true),
});

export type DemoInput = z.infer<typeof demoSchema>;
