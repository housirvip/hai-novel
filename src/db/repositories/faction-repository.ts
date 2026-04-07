import type Database from "better-sqlite3";
import type { CreateFactionInput, FactionRecord } from "../../domain/types/index.js";

export class FactionRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateFactionInput): FactionRecord {
    const statement = this.database.prepare<
      [number, string, string | null, string | null, string | null, string | null, string | null, string | null],
      { id: number }
    >(
      `INSERT INTO factions (project_id, name, type, leader, goal, stance, summary, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.name,
      input.type ?? null,
      input.leader ?? null,
      input.goal ?? null,
      input.stance ?? null,
      input.summary ?? null,
      input.details ?? null
    );

    const faction = this.findById(Number(result.lastInsertRowid));
    if (!faction) {
      throw new Error("Failed to load faction after creation.");
    }

    return faction;
  }

  findAllByProjectId(projectId: number): FactionRecord[] {
    const statement = this.database.prepare<[number], FactionRecord>(
      `SELECT id, project_id, name, type, leader, goal, stance, summary, details, created_at, updated_at
       FROM factions
       WHERE project_id = ?
       ORDER BY id ASC`
    );
    return statement.all(projectId);
  }

  findById(id: number): FactionRecord | undefined {
    const statement = this.database.prepare<[number], FactionRecord>(
      `SELECT id, project_id, name, type, leader, goal, stance, summary, details, created_at, updated_at
       FROM factions
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
