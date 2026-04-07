import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspace, initWorkspace, openWorkspaceDatabase } from "./helpers.mjs";

test("初始化可重复执行，且 generation_runs 包含模板快照字段", async () => {
  const workspace = createWorkspace("hai-novel-migration-");
  const firstContext = await initWorkspace(workspace);
  const secondContext = await initWorkspace(workspace);

  assert.equal(firstContext.dbPath, secondContext.dbPath);

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const migrations = database
      .prepare("SELECT id FROM migrations ORDER BY id ASC")
      .all()
      .map((item) => item.id);

    assert.deepEqual(migrations, [
      "001_initial_schema",
      "002_generation_runs_template_metadata"
    ]);

    const columns = database
      .prepare("PRAGMA table_info(generation_runs)")
      .all()
      .map((column) => column.name);

    assert.equal(columns.includes("template_key"), true);
    assert.equal(columns.includes("template_label"), true);
    assert.equal(columns.includes("template_version"), true);
    assert.equal(columns.includes("template_summary"), true);
  } finally {
    database.close();
  }
});
