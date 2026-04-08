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
      "003_markdown_roundtrip_metadata",
      "004_state_snapshot_tables",
      "005_item_tables"
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

    const chapterSnapshotColumns = database
      .prepare("PRAGMA table_info(chapter_state_snapshots)")
      .all()
      .map((column) => column.name);
    assert.equal(chapterSnapshotColumns.includes("source_draft_id"), true);
    assert.equal(chapterSnapshotColumns.includes("raw_payload"), true);

    const characterSnapshotColumns = database
      .prepare("PRAGMA table_info(character_state_snapshots)")
      .all()
      .map((column) => column.name);
    assert.equal(characterSnapshotColumns.includes("chapter_snapshot_id"), true);

    const factionSnapshotColumns = database
      .prepare("PRAGMA table_info(faction_state_snapshots)")
      .all()
      .map((column) => column.name);
    assert.equal(factionSnapshotColumns.includes("chapter_snapshot_id"), true);

    const hookSnapshotColumns = database
      .prepare("PRAGMA table_info(hook_state_snapshots)")
      .all()
      .map((column) => column.name);
    assert.equal(hookSnapshotColumns.includes("chapter_snapshot_id"), true);

    const itemColumns = database
      .prepare("PRAGMA table_info(items)")
      .all()
      .map((column) => column.name);
    assert.equal(itemColumns.includes("name"), true);
    assert.equal(itemColumns.includes("category"), true);
    assert.equal(itemColumns.includes("rarity"), true);
    assert.equal(itemColumns.includes("description"), true);
    assert.equal(itemColumns.includes("origin"), true);
    assert.equal(itemColumns.includes("status"), true);

    const characterItemColumns = database
      .prepare("PRAGMA table_info(character_items)")
      .all()
      .map((column) => column.name);
    assert.equal(characterItemColumns.includes("character_id"), true);
    assert.equal(characterItemColumns.includes("item_id"), true);
    assert.equal(characterItemColumns.includes("ownership_type"), true);
    assert.equal(characterItemColumns.includes("quantity"), true);
    assert.equal(characterItemColumns.includes("is_equipped"), true);
    assert.equal(characterItemColumns.includes("note"), true);
    assert.equal(characterItemColumns.includes("start_chapter_id"), true);
    assert.equal(characterItemColumns.includes("end_chapter_id"), true);
  } finally {
    database.close();
  }
});
