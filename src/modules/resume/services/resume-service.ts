import type { Database } from "bun:sqlite";
import { getDb } from "@lib/db/client";
import type { ResumeDocument } from "@modules/resume/types";
import type { ResumeRepository, CreateArgs, UpdateArgs } from "@modules/resume/repository/interface";
import { SqliteResumeRepository } from "@modules/resume/repository/sqlite";
import { NotFoundError } from "@modules/resume/repository/errors";

export class ResumeService {
  constructor(private repo: ResumeRepository) {}

  list(userId: string): Promise<ResumeDocument[]> {
    return this.repo.list(userId);
  }

  get(userId: string, resumeId: string): Promise<ResumeDocument | null> {
    return this.repo.findById(userId, resumeId);
  }

  async getOrThrow(userId: string, resumeId: string): Promise<ResumeDocument> {
    const doc = await this.repo.findById(userId, resumeId);
    if (!doc) throw new NotFoundError();
    return doc;
  }

  create(args: CreateArgs): Promise<ResumeDocument> {
    return this.repo.create(args);
  }

  update(userId: string, resumeId: string, args: UpdateArgs): Promise<ResumeDocument> {
    return this.repo.update(userId, resumeId, args);
  }

  duplicate(userId: string, resumeId: string): Promise<ResumeDocument> {
    return this.repo.duplicate(userId, resumeId);
  }

  remove(userId: string, resumeId: string): Promise<void> {
    return this.repo.softDelete(userId, resumeId);
  }
}

export function createResumeService(db: Database = getDb()): ResumeService {
  return new ResumeService(new SqliteResumeRepository(db));
}
