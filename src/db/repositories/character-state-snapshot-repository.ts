import type Database from "better-sqlite3";
import type {
  CharacterStateSnapshotRecord,
  CreateCharacterStateSnapshotInput
} from "../../domain/types/index.js";

export class CharacterStateSnapshotRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateCharacterStateSnapshotInput): CharacterStateSnapshotRecord {
    const result = this.database
      .prepare<
        [
          number,
          number,
          number,
          number,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null
        ],
        { id: number }
      >(
        `INSERT INTO character_state_snapshots (
          project_id,
          character_id,
          chapter_id,
          chapter_snapshot_id,
          status_summary,
          location,
          goal,
          public_impression,
          internal_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.projectId,
        input.characterId,
        input.chapterId,
        input.chapterSnapshotId,
        input.statusSummary ?? null,
        input.location ?? null,
        input.goal ?? null,
        input.publicImpression ?? null,
        input.internalState ?? null
      );

    const snapshot = this.findById(Number(result.lastInsertRowid));
    if (!snapshot) {
      throw new Error("Failed to load character state snapshot after creation.");
    }

    return snapshot;
  }

  findById(id: number): CharacterStateSnapshotRecord | undefined {
    return this.database
      .prepare<[number], CharacterStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           character_id,
           chapter_id,
           chapter_snapshot_id,
           status_summary,
           location,
           goal,
           public_impression,
           internal_state,
           created_at
         FROM character_state_snapshots
         WHERE id = ?`
      )
      .get(id);
  }

  findAllByProjectId(projectId: number): CharacterStateSnapshotRecord[] {
    return this.database
      .prepare<[number], CharacterStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           character_id,
           chapter_id,
           chapter_snapshot_id,
           status_summary,
           location,
           goal,
           public_impression,
           internal_state,
           created_at
         FROM character_state_snapshots
         WHERE project_id = ?
         ORDER BY id DESC`
      )
      .all(projectId);
  }

  findAllByChapterId(chapterId: number): CharacterStateSnapshotRecord[] {
    return this.database
      .prepare<[number], CharacterStateSnapshotRecord>(
        `SELECT
           id,
           project_id,
           character_id,
           chapter_id,
           chapter_snapshot_id,
           status_summary,
           location,
           goal,
           public_impression,
           internal_state,
           created_at
         FROM character_state_snapshots
         WHERE chapter_id = ?
         ORDER BY id DESC`
      )
      .all(chapterId);
  }
}
