import type Database from "better-sqlite3";
import type {
  CreateFactionStateSnapshotInput,
  FactionStateSnapshotRecord
} from "../../domain/types/index.js";

export class FactionStateSnapshotRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateFactionStateSnapshotInput): FactionStateSnapshotRecord {
    const result = this.database
      .prepare<
        [number, number, number, number, string | null, string | null, string | null],
        { id: number }
      >(
        `INSERT INTO faction_state_snapshots (
          project_id,
          faction_id,
          chapter_id,
          chapter_snapshot_id,
          status_summary,
          power_shift,
          external_relation_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.projectId,
        input.factionId,
        input.chapterId,
        input.chapterSnapshotId,
        input.statusSummary ?? null,
        input.powerShift ?? null,
        input.externalRelationSummary ?? null
      );

    const snapshot = this.findById(Number(result.lastInsertRowid));
    if (!snapshot) {
      throw new Error("Failed to load faction state snapshot after creation.");
    }

    return snapshot;
  }

  findById(id: number): FactionStateSnapshotRecord | undefined {
    return this.database
      .prepare<[number], FactionStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           faction_id,
           chapter_id,
           chapter_snapshot_id,
           status_summary,
           power_shift,
           external_relation_summary,
           created_at
         FROM faction_state_snapshots
         WHERE id = ?`
      )
      .get(id);
  }

  findAllByProjectId(projectId: number): FactionStateSnapshotRecord[] {
    return this.database
      .prepare<[number], FactionStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           faction_id,
           chapter_id,
           chapter_snapshot_id,
           status_summary,
           power_shift,
           external_relation_summary,
           created_at
         FROM faction_state_snapshots
         WHERE project_id = ?
         ORDER BY id DESC`
      )
      .all(projectId);
  }

  findAllByChapterId(chapterId: number): FactionStateSnapshotRecord[] {
    return this.database
      .prepare<[number], FactionStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           faction_id,
           chapter_id,
           chapter_snapshot_id,
           status_summary,
           power_shift,
           external_relation_summary,
           created_at
         FROM faction_state_snapshots
         WHERE chapter_id = ?
         ORDER BY id DESC`
      )
      .all(chapterId);
  }
}
