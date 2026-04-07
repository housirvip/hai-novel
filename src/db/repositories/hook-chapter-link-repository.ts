import type Database from "better-sqlite3";
import type {
  ChapterHookLinkListItem,
  CreateHookChapterLinkInput,
  HookChapterLinkListItem,
  HookChapterLinkRecord
} from "../../domain/types/index.js";

export class HookChapterLinkRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateHookChapterLinkInput): HookChapterLinkRecord {
    const statement = this.database.prepare<
      [number, number, number, string, string | null, string | null, string],
      { id: number }
    >(
      `INSERT INTO hook_chapter_links (
        project_id, hook_id, chapter_id, link_type, planned_note, actual_note, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.hookId,
      input.chapterId,
      input.linkType,
      input.plannedNote ?? null,
      input.actualNote ?? null,
      input.status ?? "planned"
    );

    const link = this.findById(Number(result.lastInsertRowid));
    if (!link) {
      throw new Error("Failed to load hook-chapter link after creation.");
    }

    return link;
  }

  findById(id: number): HookChapterLinkRecord | undefined {
    const statement = this.database.prepare<[number], HookChapterLinkRecord>(
      `SELECT
         id,
         project_id,
         hook_id,
         chapter_id,
         link_type,
         planned_note,
         actual_note,
         status,
         created_at,
         updated_at
       FROM hook_chapter_links
       WHERE id = ?`
    );
    return statement.get(id);
  }

  findAllByHookId(hookId: number): HookChapterLinkListItem[] {
    const statement = this.database.prepare<[number], HookChapterLinkListItem>(
      `SELECT
         hcl.id,
         hcl.project_id,
         hcl.hook_id,
         hcl.chapter_id,
         hcl.link_type,
         hcl.planned_note,
         hcl.actual_note,
         hcl.status,
         hcl.created_at,
         hcl.updated_at,
         c.title AS chapter_title
       FROM hook_chapter_links hcl
       JOIN chapters c ON c.id = hcl.chapter_id
       WHERE hcl.hook_id = ?
       ORDER BY hcl.chapter_id ASC, hcl.id ASC`
    );
    return statement.all(hookId);
  }

  findAllByChapterId(chapterId: number): ChapterHookLinkListItem[] {
    const statement = this.database.prepare<[number], ChapterHookLinkListItem>(
      `SELECT
         hcl.id,
         hcl.project_id,
         hcl.hook_id,
         hcl.chapter_id,
         hcl.link_type,
         hcl.planned_note,
         hcl.actual_note,
         hcl.status,
         hcl.created_at,
         hcl.updated_at,
         h.title AS hook_title,
         h.hook_type AS hook_type,
         h.status AS hook_status
       FROM hook_chapter_links hcl
       JOIN story_hooks h ON h.id = hcl.hook_id
       WHERE hcl.chapter_id = ?
       ORDER BY hcl.id ASC`
    );
    return statement.all(chapterId);
  }
}
