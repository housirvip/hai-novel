import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createWorkspace, runBuiltCli, runBuiltCliResult } from "./helpers.mjs";

test("CLI 会为常见失败场景输出更明确的错误类型和 hint", () => {
  const workspace = createWorkspace("hai-novel-error-");

  const uninitializedResult = runBuiltCliResult(workspace, ["project", "list"]);
  assert.equal(uninitializedResult.status, 1);
  assert.match(uninitializedResult.output, /\[PRECONDITION\]/);
  assert.match(uninitializedResult.output, /novel init/);

  runBuiltCli(workspace, ["init"]);
  runBuiltCli(workspace, [
    "project",
    "create",
    "--name",
    "测试小说",
    "--genre",
    "仙侠"
  ]);
  runBuiltCli(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章",
    "--summary",
    "章节摘要"
  ]);

  const exportFinalResult = runBuiltCliResult(workspace, [
    "chapter",
    "export",
    "--chapter",
    "1",
    "--source",
    "final"
  ]);
  assert.equal(exportFinalResult.status, 1);
  assert.match(exportFinalResult.output, /\[MISSING_FINAL\]/);
  assert.match(exportFinalResult.output, /draft review --draft <id> --action approve/);
});

test("ai doctor 支持 config 和 network 分区诊断", () => {
  const workspace = createWorkspace("hai-novel-ai-doctor-");

  runBuiltCli(workspace, ["init"]);

  const configResult = runBuiltCli(workspace, ["ai", "doctor", "--section", "config"]);
  assert.match(configResult, /config_ok/);
  assert.match(configResult, /mock provider/);
  const mockGenerateResult = runBuiltCli(workspace, [
    "ai",
    "doctor",
    "--section",
    "all",
    "--test-generate"
  ]);
  assert.match(mockGenerateResult, /generation_checked/);
  assert.match(mockGenerateResult, /生成测试通过/);
  const customPromptGenerateResult = runBuiltCli(workspace, [
    "ai",
    "doctor",
    "--section",
    "all",
    "--test-generate",
    "--test-prompt",
    "请只回复：自定义联调"
  ]);
  assert.match(customPromptGenerateResult, /自定义联调/);

  const configPath = path.join(workspace, "novel.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.ai.provider = "openai";
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  const openaiConfigResult = runBuiltCli(workspace, [
    "ai",
    "doctor",
    "--section",
    "config"
  ]);
  assert.match(openaiConfigResult, /OPENAI_API_KEY/);
  assert.match(openaiConfigResult, /config: 当前 provider 为 openai/);

  const networkResult = runBuiltCli(workspace, [
    "ai",
    "doctor",
    "--section",
    "network"
  ]);
  assert.match(networkResult, /missing_api_key/);
  assert.match(networkResult, /network: 未检测到 OPENAI_API_KEY/);
  assert.match(networkResult, /generation: 未检测到 OPENAI_API_KEY/);
});

test("边界异常场景会返回更明确的错误提示", () => {
  const workspace = createWorkspace("hai-novel-boundary-");

  runBuiltCli(workspace, ["init"]);
  runBuiltCli(workspace, [
    "project",
    "create",
    "--name",
    "测试小说",
    "--genre",
    "仙侠"
  ]);
  runBuiltCli(workspace, [
    "chapter",
    "create",
    "--project",
    "1",
    "--title",
    "第001章",
    "--summary",
    "章节摘要"
  ]);

  const invalidIntegerResult = runBuiltCliResult(workspace, [
    "chapter",
    "show",
    "--id",
    "abc"
  ]);
  assert.equal(invalidIntegerResult.status, 1);
  assert.match(invalidIntegerResult.output, /\[ARGUMENT\]/);

  const missingPlanResult = runBuiltCliResult(workspace, [
    "draft",
    "write",
    "--project",
    "1",
    "--chapter",
    "1"
  ]);
  assert.equal(missingPlanResult.status, 1);
  assert.match(missingPlanResult.output, /\[MISSING_PLAN\]/);
  assert.match(missingPlanResult.output, /chapter plan/);

  const missingOutlineResult = runBuiltCliResult(workspace, [
    "volume",
    "plan",
    "--project",
    "1",
    "--from-outline"
  ]);
  assert.equal(missingOutlineResult.status, 1);
  assert.match(missingOutlineResult.output, /\[MISSING_OUTLINE\]/);
  assert.match(missingOutlineResult.output, /outline set/);
});

test("核心命令帮助文本会展示示例", () => {
  const workspace = createWorkspace("hai-novel-help-");

  const chapterHelp = runBuiltCli(workspace, ["chapter", "plan", "--help"]);
  assert.match(chapterHelp, /Examples:/);
  assert.match(chapterHelp, /novel chapter plan --project 1 --chapter 1/);

  const runHelp = runBuiltCli(workspace, ["run", "export", "--help"]);
  assert.match(runHelp, /Examples:/);
  assert.match(runHelp, /novel run export --id 8 --section all --format md/);
});
