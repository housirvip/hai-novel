import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createWorkspace, hasWorkspaceFile, runBuiltCli } from "./helpers.mjs";

test("run export 可以导出 Markdown 与 JSON 历史文件", () => {
  const workspace = createWorkspace("hai-novel-run-export-");

  runBuiltCli(workspace, ["init"]);
  runBuiltCli(workspace, [
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
  runBuiltCli(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章 雨夜入宗",
    "--summary",
    "主角带着异物进入宗门"
  ]);
  runBuiltCli(workspace, [
    "chapter",
    "plan",
    "--project",
    "1",
    "--chapter",
    "1",
    "--intent",
    "突出悬念感"
  ]);

  runBuiltCli(workspace, [
    "run",
    "export",
    "--id",
    "1",
    "--section",
    "all",
    "--format",
    "md"
  ]);
  runBuiltCli(workspace, [
    "run",
    "export",
    "--id",
    "1",
    "--section",
    "meta",
    "--format",
    "json",
    "--output",
    "exports/custom-run-meta.json"
  ]);

  const markdownPath = path.join(workspace, "exports", "runs", "run-001-all.md");
  const jsonPath = path.join(workspace, "exports", "custom-run-meta.json");

  assert.equal(hasWorkspaceFile(workspace, "exports", "runs", "run-001-all.md"), true);
  assert.equal(hasWorkspaceFile(workspace, "exports", "custom-run-meta.json"), true);

  const markdown = readFileSync(markdownPath, "utf8");
  const json = JSON.parse(readFileSync(jsonPath, "utf8"));

  assert.match(markdown, /# Run 1/);
  assert.match(markdown, /## meta/);
  assert.match(markdown, /## prompt_text/);
  assert.equal(json.meta.run_type, "chapter_plan");
  assert.equal(json.meta.template_key, "chapter-plan");
});
