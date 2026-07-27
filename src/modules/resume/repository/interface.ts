import type { ResumeDocument, CreateResumeInput, UpdateResumeInput } from "@modules/resume/types";

export interface CreateArgs { userId: string; input: CreateResumeInput; }
export interface UpdateArgs { revision: number; patch: UpdateResumeInput; reason?: string; }

export interface ResumeRepository {
  list(userId: string): Promise<ResumeDocument[]>;
  findById(userId: string, resumeId: string): Promise<ResumeDocument | null>;
  create(args: CreateArgs): Promise<ResumeDocument>;
  update(userId: string, resumeId: string, args: UpdateArgs): Promise<ResumeDocument>;
  duplicate(userId: string, resumeId: string): Promise<ResumeDocument>;
  softDelete(userId: string, resumeId: string): Promise<void>;
}
