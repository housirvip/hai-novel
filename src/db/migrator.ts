import type Database from "better-sqlite3";
import type { MigrationDefinition } from "./migrations/index.js";

function ensureMigrationsTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function runMigrations(
  database: Database.Database,
  migrationDefinitions: MigrationDefinition[]
): number {
  ensureMigrationsTable(database);

  const selectMigration = database.prepare<[string], { id: string } | undefined>(
    "SELECT id FROM migrations WHERE id = ?"
  );
  const insertMigration = database.prepare<[string]>(
    "INSERT INTO migrations (id) VALUES (?)"
  );

  let appliedCount = 0;
  const transaction = database.transaction(() => {
    for (const migration of migrationDefinitions) {
      const exists = selectMigration.get(migration.id);
      if (exists) {
        continue;
      }

      database.exec(migration.sql);
      insertMigration.run(migration.id);
      appliedCount += 1;
    }
  });

  transaction();
  return appliedCount;
}
