import type Database from "better-sqlite3";
import type {
  ChapterDraftRecord,
  ContentUpdateSource,
  CreateChapterDraftInput
} from "../../domain/types/index.js";

export class ChapterDraftRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateChapterDraftInput): ChapterDraftRecord {
    const statement = this.database.prepare<
      [number, number, number | null, string, string],
      { id: number }
    >(
      `INSERT INTO chapter_drafts (
        project_id,
        chapter_id,
        plan_id,
        draft_text,
        status,
        source_version,
        updated_from
      ) VALUES (?, ?, ?, ?, ?, 1, 'ai_generate')`
    );

    const result = statement.run(
      input.projectId,
      input.chapterId,
      input.planId ?? null,
      input.draftText,
      input.status ?? "generated"
    );

    const draft = this.findById(Number(result.lastInsertRowid));
    if (!draft) {
      throw new Error("Failed to load chapter draft after creation.");
    }

    return draft;
  }

  findById(id: number): ChapterDraftRecord | undefined {
    const statement = this.database.prepare<[number], ChapterDraftRecord>(
      `SELECT
         id,
         project_id,
         chapter_id,
         plan_id,
         draft_text,
         status,
         source_version,
         last_export_path,
         last_exported_at,
         last_imported_at,
         updated_from,
         review_notes,
         review_report,
         created_at,
         updated_at
       FROM chapter_drafts
       WHERE id = ?`
    );
    return statement.get(id);
  }

  findLatestByChapterId(chapterId: number): ChapterDraftRecord | undefined {
    // 导出时优先拿最近的一版草稿，后续有正式 review 流时可再补更细筛选规则。
    const statement = this.database.prepare<[number], ChapterDraftRecord>(
      `SELECT
         id,
         project_id,
         chapter_id,
         plan_id,
         draft_text,
         status,
         source_version,
         last_export_path,
         last_exported_at,
         last_imported_at,
         updated_from,
         review_notes,
         review_report,
         created_at,
         updated_at
       FROM chapter_drafts
       WHERE chapter_id = ?
       ORDER BY id DESC
       LIMIT 1`
    );
    return statement.get(chapterId);
  }

  updateReview(
    draftId: number,
    input: {
      status?: string;
      draftText?: string;
      updatedFrom?: ContentUpdateSource;
      reviewNotes?: string | null;
      reviewReport?: string | null;
    }
  ): ChapterDraftRecord {
    const current = this.findById(draftId);
    if (!current) {
      throw new Error(`Chapter draft ${draftId} not found.`);
    }

    const hasDraftTextUpdate =
      input.draftText !== undefined && input.draftText !== current.draft_text;
    const nextSourceVersion = hasDraftTextUpdate
      ? current.source_version + 1
      : current.source_version;
    const nextUpdatedFrom = hasDraftTextUpdate
      ? input.updatedFrom ?? current.updated_from
      : current.updated_from;

    this.database
      .prepare<
        [string, string, number, string, string | null, string | null, number],
        Database.RunResult
      >(
        `UPDATE chapter_drafts
         SET status = ?,
             draft_text = ?,
             source_version = ?,
             updated_from = ?,
             review_notes = ?,
             review_report = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(
        input.status ?? current.status,
        input.draftText ?? current.draft_text,
        nextSourceVersion,
        nextUpdatedFrom,
        input.reviewNotes ?? current.review_notes,
        input.reviewReport ?? current.review_report,
        draftId
      );

    const updated = this.findById(draftId);
    if (!updated) {
      throw new Error(`Failed to reload chapter draft ${draftId} after update.`);
    }

    return updated;
  }

  markExported(draftId: number, exportPath: string): ChapterDraftRecord {
    this.database
      .prepare<[string, number], Database.RunResult>(
        `UPDATE chapter_drafts
         SET last_export_path = ?,
             last_exported_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(exportPath, draftId);

    const updated = this.findById(draftId);
    if (!updated) {
      throw new Error(`Failed to reload chapter draft ${draftId} after export mark.`);
    }

    return updated;
  }

  updateImportedContent(input: {
    draftId: number;
    draftText: string;
    expectedSourceVersion?: number;
    force?: boolean;
  }): ChapterDraftRecord {
    const current = this.findById(input.draftId);
    if (!current) {
      throw new Error(`Chapter draft ${input.draftId} not found.`);
    }

    if (
      input.force !== true &&
      input.expectedSourceVersion !== undefined &&
      current.source_version !== input.expectedSourceVersion
    ) {
      throw new Error(
        `Draft import version conflict: current=${current.source_version}, file=${input.expectedSourceVersion}.`
      );
    }

    this.database
      .prepare<[string, number], Database.RunResult>(
        `UPDATE chapter_drafts
         SET draft_text = ?,
             source_version = source_version + 1,
             last_imported_at = CURRENT_TIMESTAMP,
             updated_from = 'manual_import',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(input.draftText, input.draftId);

    const updated = this.findById(input.draftId);
    if (!updated) {
      throw new Error(`Failed to reload chapter draft ${input.draftId} after import.`);
    }

    return updated;
  }
}
