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
      "002_generation_runs_template_metadata",
      "003_markdown_roundtrip_metadata"
    ]);

    const columns = database
      .prepare("PRAGMA table_info(generation_runs)")
      .all()
      .map((column) => column.name);

    assert.equal(columns.includes("template_key"), true);
    assert.equal(columns.includes("template_label"), true);
    assert.equal(columns.includes("template_version"), true);
    assert.equal(columns.includes("template_summary"), true);

    const planColumns = database
      .prepare("PRAGMA table_info(chapter_plans)")
      .all()
      .map((column) => column.name);
    assert.equal(planColumns.includes("source_version"), true);
    assert.equal(planColumns.includes("last_export_path"), true);
    assert.equal(planColumns.includes("last_exported_at"), true);
    assert.equal(planColumns.includes("last_imported_at"), true);
    assert.equal(planColumns.includes("updated_from"), true);

    const draftColumns = database
      .prepare("PRAGMA table_info(chapter_drafts)")
      .all()
      .map((column) => column.name);
    assert.equal(draftColumns.includes("source_version"), true);
    assert.equal(draftColumns.includes("last_export_path"), true);
    assert.equal(draftColumns.includes("last_exported_at"), true);
    assert.equal(draftColumns.includes("last_imported_at"), true);
    assert.equal(draftColumns.includes("updated_from"), true);
  } finally {
    database.close();
  }
});
