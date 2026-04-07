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
});
