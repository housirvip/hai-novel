import Database from "better-sqlite3";

export function createDatabase(dbPath: string): Database.Database {
  const database = new Database(dbPath);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  return database;
}
