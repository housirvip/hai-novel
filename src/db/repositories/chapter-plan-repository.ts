import type Database from "better-sqlite3";
import type {
  ChapterPlanRecord,
  ContentUpdateSource,
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
            project_id,
            chapter_id,
            source_type,
            author_intent,
            plan_text,
            source_version,
            updated_from
          ) VALUES (?, ?, ?, ?, ?, 1, 'ai_generate')`
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
         source_version,
         last_export_path,
         last_exported_at,
         last_imported_at,
         updated_from,
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
         source_version,
         last_export_path,
         last_exported_at,
         last_imported_at,
         updated_from,
         created_at,
         updated_at
       FROM chapter_plans
       WHERE chapter_id = ? AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`
    );
    return statement.get(chapterId);
  }

  findLatestByChapterId(chapterId: number): ChapterPlanRecord | undefined {
    const statement = this.database.prepare<[number], ChapterPlanRecord>(
      `SELECT
         id,
         project_id,
         chapter_id,
         source_type,
         author_intent,
         plan_text,
         status,
         source_version,
         last_export_path,
         last_exported_at,
         last_imported_at,
         updated_from,
         created_at,
         updated_at
       FROM chapter_plans
       WHERE chapter_id = ?
       ORDER BY id DESC
       LIMIT 1`
    );
    return statement.get(chapterId);
  }

  markExported(planId: number, exportPath: string): ChapterPlanRecord {
    this.database
      .prepare<[string, number], Database.RunResult>(
        `UPDATE chapter_plans
         SET last_export_path = ?,
             last_exported_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(exportPath, planId);

    const updated = this.findById(planId);
    if (!updated) {
      throw new Error(`Failed to reload chapter plan ${planId} after export mark.`);
    }

    return updated;
  }

  updateImportedContent(input: {
    planId: number;
    planText: string;
    authorIntent?: string | null;
    expectedSourceVersion?: number;
    force?: boolean;
    updatedFrom?: ContentUpdateSource;
  }): ChapterPlanRecord {
    const current = this.findById(input.planId);
    if (!current) {
      throw new Error(`Chapter plan ${input.planId} not found.`);
    }

    if (
      input.force !== true &&
      input.expectedSourceVersion !== undefined &&
      current.source_version !== input.expectedSourceVersion
    ) {
      throw new Error(
        `Plan import version conflict: current=${current.source_version}, file=${input.expectedSourceVersion}.`
      );
    }

    const nextAuthorIntent =
      input.authorIntent !== undefined ? input.authorIntent : current.author_intent;

    this.database
      .prepare<
        [string, string | null, string, number],
        Database.RunResult
      >(
        `UPDATE chapter_plans
         SET plan_text = ?,
             author_intent = ?,
             source_version = source_version + 1,
             last_imported_at = CURRENT_TIMESTAMP,
             updated_from = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(
        input.planText,
        nextAuthorIntent ?? null,
        input.updatedFrom ?? "manual_import",
        input.planId
      );

    const updated = this.findById(input.planId);
    if (!updated) {
      throw new Error(`Failed to reload chapter plan ${input.planId} after import.`);
    }

    return updated;
  }
}
