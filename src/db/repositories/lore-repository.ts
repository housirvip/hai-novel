import type Database from "better-sqlite3";
import type {
  CreateLoreEntryInput,
  LoreEntryRecord
} from "../../domain/types/index.js";

export class LoreRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateLoreEntryInput): LoreEntryRecord {
    const statement = this.database.prepare<
      [number, string, string, string | null, string | null, string | null],
      { id: number }
    >(
      `INSERT INTO lore_entries (
        project_id, type, title, summary, details, tags
      ) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.type,
      input.title,
      input.summary ?? null,
      input.details ?? null,
      input.tags ?? null
    );

    const lore = this.findById(Number(result.lastInsertRowid));
    if (!lore) {
      throw new Error("Failed to load lore entry after creation.");
    }

    return lore;
  }

  findById(id: number): LoreEntryRecord | undefined {
    const statement = this.database.prepare<[number], LoreEntryRecord>(
      `SELECT
         id,
         project_id,
         type,
         title,
         summary,
         details,
         tags,
         created_at,
         updated_at
       FROM lore_entries
       WHERE id = ?`
    );
    return statement.get(id);
  }

  findAllByProjectId(projectId: number, type?: string): LoreEntryRecord[] {
    if (type === undefined) {
      const statement = this.database.prepare<[number], LoreEntryRecord>(
        `SELECT
           id,
           project_id,
           type,
           title,
           summary,
           details,
           tags,
           created_at,
           updated_at
         FROM lore_entries
         WHERE project_id = ?
         ORDER BY id ASC`
      );
      return statement.all(projectId);
    }

    const statement = this.database.prepare<[number, string], LoreEntryRecord>(
      `SELECT
         id,
         project_id,
         type,
         title,
         summary,
         details,
         tags,
         created_at,
         updated_at
       FROM lore_entries
       WHERE project_id = ? AND type = ?
       ORDER BY id ASC`
    );
    return statement.all(projectId, type);
  }
}
