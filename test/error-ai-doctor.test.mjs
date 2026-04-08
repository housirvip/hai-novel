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
  runBuiltCli(workspace, [
    "project",
    "create",
    "--name",
    "联调测试小说",
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
    "主角踏入宗门，气氛压抑。"
  ]);

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
  const chapterPlanTaskResult = runBuiltCli(workspace, [
    "ai",
    "doctor",
    "--section",
    "all",
    "--test-generate",
    "--test-task",
    "chapter-plan",
    "--project",
    "1",
    "--chapter",
    "1",
    "--intent",
    "强调压迫感和悬念"
  ]);
  assert.match(chapterPlanTaskResult, /chapter_plan/);
  assert.match(chapterPlanTaskResult, /生成测试通过/);

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

  config.ai.provider = "anthropic";
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  const anthropicConfigResult = runBuiltCli(workspace, [
    "ai",
    "doctor",
    "--section",
    "config"
  ]);
  assert.match(anthropicConfigResult, /ANTHROPIC_API_KEY/);
  assert.match(anthropicConfigResult, /config: 当前 provider 为 anthropic/);

  const anthropicNetworkResult = runBuiltCli(workspace, [
    "ai",
    "doctor",
    "--section",
    "network"
  ]);
  assert.match(anthropicNetworkResult, /missing_api_key/);
  assert.match(anthropicNetworkResult, /network: 未检测到 ANTHROPIC_API_KEY/);
  assert.match(anthropicNetworkResult, /generation: 未检测到 ANTHROPIC_API_KEY/);
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

test("Markdown 回写版本冲突会返回明确错误提示", () => {
  const workspace = createWorkspace("hai-novel-import-conflict-");

  runBuiltCli(workspace, ["init"]);
  runBuiltCli(workspace, [
    "project",
    "create",
    "--name",
    "回写冲突测试",
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
  runBuiltCli(workspace, [
    "chapter",
    "plan",
    "--project",
    "1",
    "--chapter",
    "1"
  ]);

  const planPath = path.join(workspace, "exports", "chapter-001-plan.md");
  const firstPlanMarkdown = readFileSync(planPath, "utf8").replace(
    /## 规划正文\n[\s\S]*$/m,
    ["## 规划正文", "第一次手工回写后的计划正文。", ""].join("\n")
  );
  writeFileSync(planPath, firstPlanMarkdown, "utf8");

  runBuiltCli(workspace, [
    "plan",
    "import",
    "--chapter",
    "1",
    "--input",
    "exports/chapter-001-plan.md"
  ]);

  const conflictResult = runBuiltCliResult(workspace, [
    "plan",
    "import",
    "--chapter",
    "1",
    "--input",
    "exports/chapter-001-plan.md"
  ]);
  assert.equal(conflictResult.status, 1);
  assert.match(conflictResult.output, /\[VERSION_CONFLICT\]/);
  assert.match(conflictResult.output, /--force/);
});

test("核心命令帮助文本会展示示例", () => {
  const workspace = createWorkspace("hai-novel-help-");

  const chapterHelp = runBuiltCli(workspace, ["chapter", "plan", "--help"]);
  assert.match(chapterHelp, /Examples:/);
  assert.match(chapterHelp, /novel chapter plan --project 1 --chapter 1/);

  const aiDoctorHelp = runBuiltCli(workspace, ["ai", "doctor", "--help"]);
  assert.match(aiDoctorHelp, /Examples:/);
  assert.match(aiDoctorHelp, /novel ai doctor --section all --test-generate --test-task chapter-plan --project 1 --chapter 1/);

  const planImportHelp = runBuiltCli(workspace, ["plan", "import", "--help"]);
  assert.match(planImportHelp, /Examples:/);
  assert.match(planImportHelp, /novel plan import --chapter 1 --input exports\/chapter-001-plan.md/);

  const draftImportHelp = runBuiltCli(workspace, ["draft", "import", "--help"]);
  assert.match(draftImportHelp, /Examples:/);
  assert.match(draftImportHelp, /novel draft import --draft 1 --input exports\/chapter-001-draft.md/);

  const stateShowHelp = runBuiltCli(workspace, ["state", "show", "--help"]);
  assert.match(stateShowHelp, /Examples:/);
  assert.match(stateShowHelp, /novel state show --project 1 --chapter 1/);

  const runHelp = runBuiltCli(workspace, ["run", "export", "--help"]);
  assert.match(runHelp, /Examples:/);
  assert.match(runHelp, /novel run export --id 8 --section all --format md/);
});
