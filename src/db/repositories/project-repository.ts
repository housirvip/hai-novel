import type Database from "better-sqlite3";
import type { CreateProjectInput, ProjectRecord } from "../../domain/types/index.js";

export class ProjectRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateProjectInput): ProjectRecord {
    const statement = this.database.prepare<
      [string, string | null, string | null, string | null, number | null],
      { id: number }
    >(
      `INSERT INTO projects (name, genre, premise, style, target_word_count)
       VALUES (?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.name,
      input.genre ?? null,
      input.premise ?? null,
      input.style ?? null,
      input.targetWordCount ?? null
    );

    const project = this.findById(Number(result.lastInsertRowid));
    if (!project) {
      throw new Error("Failed to load project after creation.");
    }

    return project;
  }

  findAll(): ProjectRecord[] {
    const statement = this.database.prepare<[], ProjectRecord>(
      `SELECT id, name, genre, premise, style, target_word_count, status, created_at, updated_at
       FROM projects
       ORDER BY id ASC`
    );
    return statement.all();
  }

  findById(id: number): ProjectRecord | undefined {
    const statement = this.database.prepare<[number], ProjectRecord>(
      `SELECT id, name, genre, premise, style, target_word_count, status, created_at, updated_at
       FROM projects
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
