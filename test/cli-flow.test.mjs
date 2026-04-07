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
