import type Database from "better-sqlite3";
import type {
  ChapterStateSnapshotRecord,
  CreateChapterStateSnapshotInput
} from "../../domain/types/index.js";

export class ChapterStateSnapshotRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateChapterStateSnapshotInput): ChapterStateSnapshotRecord {
    const result = this.database
      .prepare<
        [number, number, number | null, string, string | null, string | null, string | null],
        { id: number }
      >(
        `INSERT INTO chapter_state_snapshots (
          project_id,
          chapter_id,
          source_draft_id,
          status,
          summary,
          raw_payload,
          applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.projectId,
        input.chapterId,
        input.sourceDraftId ?? null,
        input.status,
        input.summary ?? null,
        input.rawPayload ?? null,
        input.applied === true ? new Date().toISOString() : null
      );

    const snapshot = this.findById(Number(result.lastInsertRowid));
    if (!snapshot) {
      throw new Error("Failed to load chapter state snapshot after creation.");
    }

    return snapshot;
  }

  findById(id: number): ChapterStateSnapshotRecord | undefined {
    return this.database
      .prepare<[number], ChapterStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           chapter_id,
           source_draft_id,
           status,
           summary,
           raw_payload,
           applied_at,
           created_at
         FROM chapter_state_snapshots
         WHERE id = ?`
      )
      .get(id);
  }

  findAllByProjectId(projectId: number): ChapterStateSnapshotRecord[] {
    return this.database
      .prepare<[number], ChapterStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           chapter_id,
           source_draft_id,
           status,
           summary,
           raw_payload,
           applied_at,
           created_at
         FROM chapter_state_snapshots
         WHERE project_id = ?
         ORDER BY id DESC`
      )
      .all(projectId);
  }

  findAllByChapterId(chapterId: number): ChapterStateSnapshotRecord[] {
    return this.database
      .prepare<[number], ChapterStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           chapter_id,
           source_draft_id,
           status,
           summary,
           raw_payload,
           applied_at,
           created_at
         FROM chapter_state_snapshots
         WHERE chapter_id = ?
         ORDER BY id DESC`
      )
      .all(chapterId);
  }

  // 按章节删除已有章节快照；由于对象快照对章节快照建了级联外键，这里删除主表即可一并清空附属快照。
  deleteByChapterId(chapterId: number): number {
    const result = this.database
      .prepare<[number], Database.RunResult>(
        `DELETE FROM chapter_state_snapshots
         WHERE chapter_id = ?`
      )
      .run(chapterId);

    return result.changes;
  }
}
