import type Database from "better-sqlite3";
import type {
  ChapterDraftRecord,
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
        project_id, chapter_id, plan_id, draft_text, status
      ) VALUES (?, ?, ?, ?, ?)`
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
}
