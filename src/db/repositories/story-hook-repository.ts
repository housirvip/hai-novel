import type Database from "better-sqlite3";
import type {
  CreateStoryHookInput,
  StoryHookListItem,
  StoryHookRecord,
  UpdateStoryHookInput
} from "../../domain/types/index.js";

export class StoryHookRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateStoryHookInput): StoryHookRecord {
    const statement = this.database.prepare<
      [number, string, string, string | null, string | null, string | null, number | null, number | null],
      { id: number }
    >(
      `INSERT INTO story_hooks (
        project_id, title, hook_type, summary, setup_text, payoff_text, priority, target_chapter_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.title,
      input.hookType,
      input.summary ?? null,
      input.setupText ?? null,
      input.payoffText ?? null,
      input.priority ?? null,
      input.targetChapterId ?? null
    );

    const hook = this.findById(Number(result.lastInsertRowid));
    if (!hook) {
      throw new Error("Failed to load story hook after creation.");
    }

    return hook;
  }

  update(input: UpdateStoryHookInput): StoryHookRecord {
    const current = this.findById(input.hookId);
    if (!current) {
      throw new Error(`Story hook ${input.hookId} not found.`);
    }

    const statement = this.database.prepare<
      [string, number | null, number | null, number | null, number],
      Database.RunResult
    >(
      `UPDATE story_hooks
       SET status = ?,
           start_chapter_id = ?,
           target_chapter_id = ?,
           end_chapter_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );

    statement.run(
      input.status ?? current.status,
      input.startChapterId ?? current.start_chapter_id,
      input.targetChapterId ?? current.target_chapter_id,
      input.endChapterId ?? current.end_chapter_id,
      input.hookId
    );

    const updated = this.findById(input.hookId);
    if (!updated) {
      throw new Error(`Failed to reload story hook ${input.hookId} after update.`);
    }

    return updated;
  }

  findById(id: number): StoryHookRecord | undefined {
    const statement = this.database.prepare<[number], StoryHookRecord>(
      `SELECT
         id,
         project_id,
         title,
         hook_type,
         summary,
         setup_text,
         payoff_text,
         status,
         priority,
         start_chapter_id,
         target_chapter_id,
         end_chapter_id,
         created_at,
         updated_at
       FROM story_hooks
       WHERE id = ?`
    );
    return statement.get(id);
  }

  findListItemById(id: number): StoryHookListItem | undefined {
    const statement = this.database.prepare<[number], StoryHookListItem>(
      `SELECT
         h.id,
         h.project_id,
         h.title,
         h.hook_type,
         h.summary,
         h.setup_text,
         h.payoff_text,
         h.status,
         h.priority,
         h.start_chapter_id,
         h.target_chapter_id,
         h.end_chapter_id,
         h.created_at,
         h.updated_at,
         start_chapter.title AS start_chapter_title,
         target_chapter.title AS target_chapter_title,
         end_chapter.title AS end_chapter_title
       FROM story_hooks h
       LEFT JOIN chapters start_chapter ON start_chapter.id = h.start_chapter_id
       LEFT JOIN chapters target_chapter ON target_chapter.id = h.target_chapter_id
       LEFT JOIN chapters end_chapter ON end_chapter.id = h.end_chapter_id
       WHERE h.id = ?`
    );
    return statement.get(id);
  }

  findAllByProjectId(projectId: number, status?: string, limit?: number): StoryHookListItem[] {
    if (!status) {
      if (limit === undefined) {
        const statement = this.database.prepare<[number], StoryHookListItem>(
          `SELECT
             h.id,
             h.project_id,
             h.title,
             h.hook_type,
             h.summary,
             h.setup_text,
             h.payoff_text,
             h.status,
             h.priority,
             h.start_chapter_id,
             h.target_chapter_id,
             h.end_chapter_id,
             h.created_at,
             h.updated_at,
             start_chapter.title AS start_chapter_title,
             target_chapter.title AS target_chapter_title,
             end_chapter.title AS end_chapter_title
           FROM story_hooks h
           LEFT JOIN chapters start_chapter ON start_chapter.id = h.start_chapter_id
           LEFT JOIN chapters target_chapter ON target_chapter.id = h.target_chapter_id
           LEFT JOIN chapters end_chapter ON end_chapter.id = h.end_chapter_id
           WHERE h.project_id = ?
           ORDER BY h.id ASC`
        );
        return statement.all(projectId);
      }

      const statement = this.database.prepare<[number, number], StoryHookListItem>(
        `SELECT
           h.id,
           h.project_id,
           h.title,
           h.hook_type,
           h.summary,
           h.setup_text,
           h.payoff_text,
           h.status,
           h.priority,
           h.start_chapter_id,
           h.target_chapter_id,
           h.end_chapter_id,
           h.created_at,
           h.updated_at,
           start_chapter.title AS start_chapter_title,
           target_chapter.title AS target_chapter_title,
           end_chapter.title AS end_chapter_title
         FROM story_hooks h
         LEFT JOIN chapters start_chapter ON start_chapter.id = h.start_chapter_id
         LEFT JOIN chapters target_chapter ON target_chapter.id = h.target_chapter_id
         LEFT JOIN chapters end_chapter ON end_chapter.id = h.end_chapter_id
         WHERE h.project_id = ?
         ORDER BY h.updated_at DESC, h.id DESC
         LIMIT ?`
      );
      return statement.all(projectId, limit);
    }

    if (limit === undefined) {
      const statement = this.database.prepare<[number, string], StoryHookListItem>(
        `SELECT
           h.id,
           h.project_id,
           h.title,
           h.hook_type,
           h.summary,
           h.setup_text,
           h.payoff_text,
           h.status,
           h.priority,
           h.start_chapter_id,
           h.target_chapter_id,
           h.end_chapter_id,
           h.created_at,
           h.updated_at,
           start_chapter.title AS start_chapter_title,
           target_chapter.title AS target_chapter_title,
           end_chapter.title AS end_chapter_title
         FROM story_hooks h
         LEFT JOIN chapters start_chapter ON start_chapter.id = h.start_chapter_id
         LEFT JOIN chapters target_chapter ON target_chapter.id = h.target_chapter_id
         LEFT JOIN chapters end_chapter ON end_chapter.id = h.end_chapter_id
         WHERE h.project_id = ? AND h.status = ?
         ORDER BY h.id ASC`
      );
      return statement.all(projectId, status);
    }

    const statement = this.database.prepare<[number, string, number], StoryHookListItem>(
      `SELECT
         h.id,
         h.project_id,
         h.title,
         h.hook_type,
         h.summary,
         h.setup_text,
         h.payoff_text,
         h.status,
         h.priority,
         h.start_chapter_id,
         h.target_chapter_id,
         h.end_chapter_id,
         h.created_at,
         h.updated_at,
         start_chapter.title AS start_chapter_title,
         target_chapter.title AS target_chapter_title,
         end_chapter.title AS end_chapter_title
       FROM story_hooks h
       LEFT JOIN chapters start_chapter ON start_chapter.id = h.start_chapter_id
       LEFT JOIN chapters target_chapter ON target_chapter.id = h.target_chapter_id
       LEFT JOIN chapters end_chapter ON end_chapter.id = h.end_chapter_id
       WHERE h.project_id = ? AND h.status = ?
       ORDER BY h.updated_at DESC, h.id DESC
       LIMIT ?`
    );
    return statement.all(projectId, status, limit);
  }
}
