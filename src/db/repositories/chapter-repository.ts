import type Database from "better-sqlite3";
import type {
  ChapterDetail,
  ChapterRecord,
  CreateChapterInput
} from "../../domain/types/index.js";

export class ChapterRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateChapterInput): ChapterRecord {
    const statement = this.database.prepare<
      [number, number | null, string, string | null],
      { id: number }
    >(
      `INSERT INTO chapters (project_id, outline_id, title, summary)
       VALUES (?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.outlineId ?? null,
      input.title,
      input.summary ?? null
    );

    // 创建后重新查询，保持返回字段完整。
    const chapter = this.findById(Number(result.lastInsertRowid));
    if (!chapter) {
      throw new Error("Failed to load chapter after creation.");
    }

    return chapter;
  }

  findById(id: number): ChapterRecord | undefined {
    const statement = this.database.prepare<[number], ChapterRecord>(
      `SELECT
         id,
         project_id,
         outline_id,
         title,
         summary,
         status,
         final_text,
         approved_draft_id,
         created_at,
         updated_at
       FROM chapters
       WHERE id = ?`
    );
    return statement.get(id);
  }

  findDetailById(id: number): ChapterDetail | undefined {
    const statement = this.database.prepare<[number], ChapterDetail>(
      `SELECT
         c.id,
         c.project_id,
         c.outline_id,
         c.title,
         c.summary,
         c.status,
         c.final_text,
         c.approved_draft_id,
         c.created_at,
         c.updated_at,
         o.title AS outline_title
       FROM chapters c
       LEFT JOIN outlines o ON o.id = c.outline_id
       WHERE c.id = ?`
    );
    return statement.get(id);
  }
}
