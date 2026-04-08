import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cliEntry = path.join(rootDir, "dist", "cli", "index.js");

function createWorkspace() {
  return mkdtempSync(path.join(os.tmpdir(), "hai-novel-test-"));
}

function runNovel(cwd, args) {
  return execFileSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env
    }
  });
}

test("可以完成总纲、分卷与章节规划主链路", () => {
  const workspace = createWorkspace();

  runNovel(workspace, ["init"]);
  runNovel(workspace, [
    "project",
    "create",
    "--name",
    "测试小说",
    "--genre",
    "仙侠",
    "--premise",
    "少年卷入宗门纷争",
    "--style",
    "热血克制"
  ]);
  runNovel(workspace, [
    "outline",
    "set",
    "--project",
    "1",
    "--title",
    "测试小说总纲",
    "--summary",
    "主角卷入宗门暗战，并逐步揭开黑玉佩秘密。",
    "--goal",
    "完成主线开篇铺陈"
  ]);
  const outlineShowOutput = runNovel(workspace, ["outline", "show", "--project", "1"]);
  assert.match(outlineShowOutput, /测试小说总纲/);

  runNovel(workspace, [
    "volume",
    "plan",
    "--project",
    "1",
    "--from-outline",
    "--instruction",
    "第一卷重点写入宗与立足。"
  ]);
  const volumeListOutput = runNovel(workspace, ["volume", "list", "--project", "1"]);
  assert.match(volumeListOutput, /第01卷|第01卷|第02卷/);

  runNovel(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章 雨夜入宗",
    "--summary",
    "主角带着异物进入宗门"
  ]);
  runNovel(workspace, [
    "chapter",
    "plan",
    "--project",
    "1",
    "--chapter",
    "1",
    "--intent",
    "突出悬念感"
  ]);

  const planShowOutput = runNovel(workspace, ["plan", "show", "--chapter", "1"]);
  assert.match(planShowOutput, /突出悬念感/);
  assert.equal(existsSync(path.join(workspace, "exports", "chapter-001-plan.md")), true);
});

test("可以完成草稿生成、修订和转正导出", () => {
  const workspace = createWorkspace();

  runNovel(workspace, ["init"]);
  runNovel(workspace, [
    "project",
    "create",
    "--name",
    "测试小说",
    "--genre",
    "仙侠",
    "--premise",
    "少年卷入宗门纷争",
    "--style",
    "热血克制"
  ]);
  runNovel(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章 雨夜入宗",
    "--summary",
    "主角带着异物进入宗门"
  ]);
  runNovel(workspace, [
    "chapter",
    "plan",
    "--project",
    "1",
    "--chapter",
    "1",
    "--intent",
    "突出悬念感"
  ]);
  runNovel(workspace, ["draft", "write", "--project", "1", "--chapter", "1"]);

  const reviewCheckOutput = runNovel(workspace, [
    "draft",
    "review",
    "--draft",
    "1",
    "--action",
    "check"
  ]);
  assert.match(reviewCheckOutput, /error|warning/);

  runNovel(workspace, ["draft", "review", "--draft", "1", "--action", "fix"]);
  runNovel(workspace, ["draft", "review", "--draft", "1", "--action", "approve"]);

  assert.equal(existsSync(path.join(workspace, "exports", "chapter-001-draft.md")), true);
  assert.equal(existsSync(path.join(workspace, "exports", "chapter-001-final.md")), true);
});

test("可以管理物品及其人物持有关系", () => {
  const workspace = createWorkspace();

  runNovel(workspace, ["init"]);
  runNovel(workspace, [
    "project",
    "create",
    "--name",
    "道具体系测试",
    "--genre",
    "仙侠"
  ]);
  runNovel(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章 初得异物",
    "--summary",
    "主角得到一件关键道具"
  ]);
  runNovel(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第002章 暂交保管",
    "--summary",
    "主角暂时交出道具"
  ]);
  runNovel(workspace, [
    "character",
    "add",
    "--project",
    "1",
    "--name",
    "林渡",
    "--role",
    "protagonist"
  ]);
  runNovel(workspace, [
    "item",
    "add",
    "--project",
    "1",
    "--name",
    "黑玉佩",
    "--category",
    "artifact",
    "--rarity",
    "rare",
    "--status",
    "sealed"
  ]);

  const itemListOutput = runNovel(workspace, ["item", "list", "--project", "1"]);
  assert.match(itemListOutput, /黑玉佩/);

  runNovel(workspace, [
    "character",
    "item:add",
    "--project",
    "1",
    "--character",
    "1",
    "--item",
    "1",
    "--type",
    "carry",
    "--equipped",
    "--start-chapter",
    "1",
    "--note",
    "入宗时贴身携带"
  ]);

  const characterItemListOutput = runNovel(workspace, [
    "character",
    "item:list",
    "--project",
    "1",
    "--character",
    "1",
    "--active-only"
  ]);
  assert.match(characterItemListOutput, /林渡/);
  assert.match(characterItemListOutput, /黑玉佩/);
  assert.match(characterItemListOutput, /yes/);

  const itemShowOutput = runNovel(workspace, ["item", "show", "--item", "1"]);
  assert.match(itemShowOutput, /黑玉佩/);
  assert.match(itemShowOutput, /林渡/);

  runNovel(workspace, [
    "character",
    "item:remove",
    "--link",
    "1",
    "--end-chapter",
    "2",
    "--note",
    "交由长老保管"
  ]);

  const allLinksOutput = runNovel(workspace, ["character", "item:list", "--project", "1"]);
  assert.match(allLinksOutput, /第002章 暂交保管/);
  assert.match(allLinksOutput, /交由长老保管/);
});

test("state show 会展示章节快照里的轻量物品状态", () => {
  const workspace = createWorkspace();

  runNovel(workspace, ["init"]);
  runNovel(workspace, [
    "project",
    "create",
    "--name",
    "状态物品展示测试",
    "--genre",
    "仙侠"
  ]);
  runNovel(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章 雨夜入宗",
    "--summary",
    "林渡夜入青岚宗，黑玉佩出现异动"
  ]);
  runNovel(workspace, [
    "faction",
    "add",
    "--project",
    "1",
    "--name",
    "青岚宗",
    "--type",
    "宗门"
  ]);
  runNovel(workspace, [
    "character",
    "add",
    "--project",
    "1",
    "--name",
    "林渡",
    "--role",
    "protagonist",
    "--faction",
    "1"
  ]);
  runNovel(workspace, [
    "hook",
    "add",
    "--project",
    "1",
    "--title",
    "黑玉佩的来历",
    "--type",
    "mystery",
    "--summary",
    "黑玉佩忽然发热",
    "--target-chapter",
    "1"
  ]);
  runNovel(workspace, [
    "hook",
    "bind",
    "--project",
    "1",
    "--hook",
    "1",
    "--chapter",
    "1",
    "--type",
    "setup",
    "--planned-note",
    "通过玉佩异动埋下疑团"
  ]);
  runNovel(workspace, [
    "item",
    "add",
    "--project",
    "1",
    "--name",
    "黑玉佩",
    "--category",
    "artifact"
  ]);
  runNovel(workspace, [
    "character",
    "item:add",
    "--project",
    "1",
    "--character",
    "1",
    "--item",
    "1",
    "--type",
    "carry",
    "--note",
    "林渡一直贴身携带"
  ]);
  runNovel(workspace, [
    "chapter",
    "plan",
    "--project",
    "1",
    "--chapter",
    "1",
    "--intent",
    "突出黑玉佩的异动"
  ]);
  runNovel(workspace, [
    "draft",
    "write",
    "--project",
    "1",
    "--chapter",
    "1"
  ]);
  runNovel(workspace, ["draft", "review", "--draft", "1", "--action", "fix"]);
  runNovel(workspace, ["draft", "review", "--draft", "1", "--action", "approve"]);

  const stateOutput = runNovel(workspace, ["state", "show", "--project", "1", "--chapter", "1"]);
  assert.match(stateOutput, /黑玉佩/);
  assert.match(stateOutput, /林渡/);
  assert.match(stateOutput, /artifact/);
});

test("state chapter-preview 会预览本章最新草稿的状态变化", () => {
  const workspace = createWorkspace();

  runNovel(workspace, ["init"]);
  runNovel(workspace, [
    "project",
    "create",
    "--name",
    "状态预览测试",
    "--genre",
    "仙侠"
  ]);
  runNovel(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章 雨夜入宗",
    "--summary",
    "林渡夜入青岚宗，黑玉佩出现异动"
  ]);
  runNovel(workspace, [
    "faction",
    "add",
    "--project",
    "1",
    "--name",
    "青岚宗",
    "--type",
    "宗门"
  ]);
  runNovel(workspace, [
    "character",
    "add",
    "--project",
    "1",
    "--name",
    "林渡",
    "--role",
    "protagonist",
    "--faction",
    "1"
  ]);
  runNovel(workspace, [
    "hook",
    "add",
    "--project",
    "1",
    "--title",
    "黑玉佩的来历",
    "--type",
    "mystery",
    "--summary",
    "黑玉佩忽然发热",
    "--target-chapter",
    "1"
  ]);
  runNovel(workspace, [
    "hook",
    "bind",
    "--project",
    "1",
    "--hook",
    "1",
    "--chapter",
    "1",
    "--type",
    "setup",
    "--planned-note",
    "通过玉佩异动埋下疑团"
  ]);
  runNovel(workspace, [
    "item",
    "add",
    "--project",
    "1",
    "--name",
    "黑玉佩",
    "--category",
    "artifact"
  ]);
  runNovel(workspace, [
    "character",
    "item:add",
    "--project",
    "1",
    "--character",
    "1",
    "--item",
    "1",
    "--type",
    "carry",
    "--note",
    "林渡一直贴身携带"
  ]);
  runNovel(workspace, [
    "chapter",
    "plan",
    "--project",
    "1",
    "--chapter",
    "1",
    "--intent",
    "突出黑玉佩异动和山门压迫感"
  ]);
  runNovel(workspace, [
    "draft",
    "write",
    "--project",
    "1",
    "--chapter",
    "1"
  ]);
  runNovel(workspace, ["draft", "review", "--draft", "1", "--action", "fix"]);

  const previewOutput = runNovel(workspace, ["state", "chapter-preview", "--chapter", "1"]);
  assert.match(previewOutput, /chapter_summary/);
  assert.match(previewOutput, /hook_id/);
  assert.match(previewOutput, /item_id/);
});

test("state approve-sync 会覆盖重建历史章节状态快照", () => {
  const workspace = createWorkspace();

  runNovel(workspace, ["init"]);
  runNovel(workspace, [
    "project",
    "create",
    "--name",
    "状态补同步测试",
    "--genre",
    "仙侠"
  ]);
  runNovel(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章 雨夜入宗",
    "--summary",
    "林渡夜入青岚宗，黑玉佩出现异动"
  ]);
  runNovel(workspace, [
    "faction",
    "add",
    "--project",
    "1",
    "--name",
    "青岚宗",
    "--type",
    "宗门"
  ]);
  runNovel(workspace, [
    "character",
    "add",
    "--project",
    "1",
    "--name",
    "林渡",
    "--role",
    "protagonist",
    "--faction",
    "1"
  ]);
  runNovel(workspace, [
    "hook",
    "add",
    "--project",
    "1",
    "--title",
    "黑玉佩的来历",
    "--type",
    "mystery",
    "--summary",
    "黑玉佩忽然发热",
    "--target-chapter",
    "1"
  ]);
  runNovel(workspace, [
    "hook",
    "bind",
    "--project",
    "1",
    "--hook",
    "1",
    "--chapter",
    "1",
    "--type",
    "setup",
    "--planned-note",
    "通过玉佩异动埋下疑团"
  ]);
  runNovel(workspace, [
    "item",
    "add",
    "--project",
    "1",
    "--name",
    "黑玉佩",
    "--category",
    "artifact"
  ]);
  runNovel(workspace, [
    "character",
    "item:add",
    "--project",
    "1",
    "--character",
    "1",
    "--item",
    "1",
    "--type",
    "carry",
    "--note",
    "林渡一直贴身携带"
  ]);
  runNovel(workspace, [
    "chapter",
    "plan",
    "--project",
    "1",
    "--chapter",
    "1",
    "--intent",
    "突出黑玉佩异动和山门压迫感"
  ]);
  runNovel(workspace, [
    "draft",
    "write",
    "--project",
    "1",
    "--chapter",
    "1"
  ]);
  runNovel(workspace, ["draft", "review", "--draft", "1", "--action", "fix"]);
  runNovel(workspace, ["draft", "review", "--draft", "1", "--action", "approve"]);

  const beforeSyncState = runNovel(workspace, ["state", "show", "--project", "1", "--chapter", "1"]);
  const beforeChapterSnapshotMatches = beforeSyncState.match(/source_draft_id/g) ?? [];
  assert.equal(beforeChapterSnapshotMatches.length, 1);

  const syncOutput = runNovel(workspace, ["state", "approve-sync", "--chapter", "1"]);
  assert.match(syncOutput, /replaced_snapshot_count/);
  assert.match(syncOutput, /item_state_count/);

  const afterSyncState = runNovel(workspace, ["state", "show", "--project", "1", "--chapter", "1"]);
  const afterChapterSnapshotMatches = afterSyncState.match(/source_draft_id/g) ?? [];
  assert.equal(afterChapterSnapshotMatches.length, 1);
  assert.match(afterSyncState, /黑玉佩/);
});
