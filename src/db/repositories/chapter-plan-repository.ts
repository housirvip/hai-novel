import type Database from "better-sqlite3";
import type {
  ChapterPlanRecord,
  CreateChapterPlanInput
} from "../../domain/types/index.js";

export class ChapterPlanRepository {
  constructor(private readonly database: Database.Database) {}

  createActive(input: CreateChapterPlanInput): ChapterPlanRecord {
    // 同一章节只保留一条 active plan，旧版本统一归档，便于后续回溯。
    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE chapter_plans
           SET status = 'archived',
               updated_at = CURRENT_TIMESTAMP
           WHERE chapter_id = ? AND status = 'active'`
        )
        .run(input.chapterId);

      const result = this.database
        .prepare<
          [number, number, string, string | null, string],
          { id: number }
        >(
          `INSERT INTO chapter_plans (
            project_id, chapter_id, source_type, author_intent, plan_text
          ) VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          input.projectId,
          input.chapterId,
          input.sourceType,
          input.authorIntent ?? null,
          input.planText
        );

      return Number(result.lastInsertRowid);
    });

    const planId = transaction();
    const plan = this.findById(planId);
    if (!plan) {
      throw new Error("Failed to load chapter plan after creation.");
    }

    return plan;
  }

  findById(id: number): ChapterPlanRecord | undefined {
    const statement = this.database.prepare<[number], ChapterPlanRecord>(
      `SELECT
         id,
         project_id,
         chapter_id,
         source_type,
         author_intent,
         plan_text,
         status,
         created_at,
         updated_at
       FROM chapter_plans
       WHERE id = ?`
    );
    return statement.get(id);
  }

  findActiveByChapterId(chapterId: number): ChapterPlanRecord | undefined {
    const statement = this.database.prepare<[number], ChapterPlanRecord>(
      `SELECT
         id,
         project_id,
         chapter_id,
         source_type,
         author_intent,
         plan_text,
         status,
         created_at,
         updated_at
       FROM chapter_plans
       WHERE chapter_id = ? AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`
    );
    return statement.get(chapterId);
  }
}
