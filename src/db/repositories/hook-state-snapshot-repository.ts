import type Database from "better-sqlite3";
import type {
  CreateHookStateSnapshotInput,
  HookStateSnapshotRecord
} from "../../domain/types/index.js";

export class HookStateSnapshotRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateHookStateSnapshotInput): HookStateSnapshotRecord {
    const result = this.database
      .prepare<[number, number, number, number, string, string | null], { id: number }>(
        `INSERT INTO hook_state_snapshots (
          project_id,
          hook_id,
          chapter_id,
          chapter_snapshot_id,
          progress_status,
          progress_note
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.projectId,
        input.hookId,
        input.chapterId,
        input.chapterSnapshotId,
        input.progressStatus,
        input.progressNote ?? null
      );

    const snapshot = this.findById(Number(result.lastInsertRowid));
    if (!snapshot) {
      throw new Error("Failed to load hook state snapshot after creation.");
    }

    return snapshot;
  }

  findById(id: number): HookStateSnapshotRecord | undefined {
    return this.database
      .prepare<[number], HookStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           hook_id,
           chapter_id,
           chapter_snapshot_id,
           progress_status,
           progress_note,
           created_at
         FROM hook_state_snapshots
         WHERE id = ?`
      )
      .get(id);
  }

  findAllByProjectId(projectId: number): HookStateSnapshotRecord[] {
    return this.database
      .prepare<[number], HookStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           hook_id,
           chapter_id,
           chapter_snapshot_id,
           progress_status,
           progress_note,
           created_at
         FROM hook_state_snapshots
         WHERE project_id = ?
         ORDER BY id DESC`
      )
      .all(projectId);
  }

  findRecentByProjectBeforeChapter(
    projectId: number,
    chapterId: number,
    limit: number
  ): HookStateSnapshotRecord[] {
    return this.database
      .prepare<[number, number, number], HookStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           hook_id,
           chapter_id,
           chapter_snapshot_id,
           progress_status,
           progress_note,
           created_at
         FROM hook_state_snapshots
         WHERE project_id = ? AND chapter_id < ?
         ORDER BY chapter_id DESC, id DESC
         LIMIT ?`
      )
      .all(projectId, chapterId, limit);
  }

  findAllByChapterId(chapterId: number): HookStateSnapshotRecord[] {
    return this.database
      .prepare<[number], HookStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           hook_id,
           chapter_id,
           chapter_snapshot_id,
           progress_status,
           progress_note,
           created_at
         FROM hook_state_snapshots
         WHERE chapter_id = ?
         ORDER BY id DESC`
      )
      .all(chapterId);
  }
}
