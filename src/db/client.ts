import Database from "better-sqlite3";

export function createDatabase(dbPath: string): Database.Database {
  const database = new Database(dbPath);
  // SQLite 默认不启用外键约束，所以每次连接都要手动打开。
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  return database;
}
