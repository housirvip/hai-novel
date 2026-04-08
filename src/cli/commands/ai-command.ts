import { Command } from "commander";
import { createAIProvider, resolveAISettings } from "../../ai/provider-factory.js";
import {
  AIDoctorService,
  type AIDoctorTask,
  type AIDoctorSection
} from "../../app/services/ai-doctor-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { parseOptionalIntegerOption } from "../command-helpers.js";

function parseDoctorSection(value: string): AIDoctorSection {
  if (value === "config" || value === "network" || value === "all") {
    return value;
  }

  throw new Error("`--section` must be one of: config, network, all.");
}

function parseDoctorTask(value: string): AIDoctorTask {
  if (
    value === "ai_test" ||
    value === "chapter-plan" ||
    value === "draft-write" ||
    value === "draft-fix"
  ) {
    return value;
  }

  throw new Error(
    "`--test-task` must be one of: ai_test, chapter-plan, draft-write, draft-fix."
  );
}

export function registerAICommands(program: Command): void {
  const ai = program.command("ai").description("AI provider inspection commands.");

  ai
    .command("status")
    .description("Show resolved AI provider settings.")
    .action(async () => {
      const context = await loadRuntimeContext(process.cwd());
      const settings = resolveAISettings(context);

      console.table([
        {
          provider: settings.provider,
          model: settings.model,
          base_url: settings.baseUrl ?? "",
          api_key_env: settings.apiKeyEnvName ?? "",
          api_key_ready: settings.hasApiKey ? "yes" : "no"
        }
      ]);
    });

  ai
    .command("test")
    .description("Run a minimal generation request against the current AI provider.")
    .requiredOption("--prompt <text>", "Prompt text")
    .option("--context <text>", "Optional context text")
    .action(async (options) => {
      const context = await loadRuntimeContext(process.cwd());
      const provider = createAIProvider(context);
      const result = await provider.generateText({
        taskType: "ai_test",
        systemPrompt: "你是中文写作助手，请直接回答用户请求。",
        prompt: options.prompt,
        contextText: options.context ?? "",
        maxOutputTokens: 300
      });

      console.table([
        {
          provider: result.provider,
          model: result.model,
          request_id: result.requestId ?? ""
        }
      ]);

      console.log(result.text);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel ai test --prompt "请用一句话介绍这部小说"
  novel ai test --prompt "给我一个悬念开头" --context "题材：仙侠"`
    );

  ai
    .command("doctor")
    .description("Diagnose current AI provider configuration and connectivity.")
    .option(
      "--section <section>",
      "Section to inspect: config|network|all",
      parseDoctorSection,
      "all"
    )
    .option("--skip-network", "Skip network connectivity check")
    .option("--test-generate", "Run a minimal generation test when possible")
    .option(
      "--test-task <task>",
      "Generation self-check task: ai_test|chapter-plan|draft-write|draft-fix",
      parseDoctorTask,
      "ai_test"
    )
    .option("--project <id>", "Project id used by task self-check", (value: string) =>
      parseOptionalIntegerOption(value, "--project")
    )
    .option("--chapter <id>", "Chapter id used by task self-check", (value: string) =>
      parseOptionalIntegerOption(value, "--chapter")
    )
    .option("--draft <id>", "Draft id used by task self-check", (value: string) =>
      parseOptionalIntegerOption(value, "--draft")
    )
    .option("--plan <id>", "Plan id used by task self-check", (value: string) =>
      parseOptionalIntegerOption(value, "--plan")
    )
    .option("--intent <text>", "Author intent used by chapter-plan self-check")
    .option("--instruction <text>", "Extra instruction used by draft-write self-check")
    .option("--notes <text>", "Extra notes used by draft-fix self-check")
    .option("--test-prompt <text>", "Custom prompt used by generation self-check")
    .option("--test-context <text>", "Optional context used by generation self-check")
    .action(async (options) => {
      const context = await loadRuntimeContext(process.cwd());
      const service = new AIDoctorService(context);
      const result = await service.diagnose({
        skipNetwork: options.skipNetwork === true,
        section: options.section,
        testGenerate: options.testGenerate === true,
        testTask: options.testTask,
        projectId: options.project,
        chapterId: options.chapter,
        draftId: options.draft,
        planId: options.plan,
        intent: options.intent,
        instruction: options.instruction,
        notes: options.notes,
        testPrompt: options.testPrompt,
        testContext: options.testContext
      });

      console.table([
        {
          provider: result.provider,
          model: result.model,
          base_url: result.baseUrl,
          api_key_env: result.apiKeyEnvName,
          api_key_ready: result.hasApiKey ? "yes" : "no",
          config_ok: result.configOk ? "yes" : "no",
          network_checked: result.networkChecked ? "yes" : "no",
          network_ok: result.networkOk ? "yes" : "no",
          network_error_type: result.networkErrorType ?? "",
          generation_checked: result.generationChecked ? "yes" : "no",
          generation_ok: result.generationOk ? "yes" : "no",
          generation_error_type: result.generationErrorType ?? "",
          request_id: result.generationRequestId ?? "",
          http_status: result.httpStatus ?? ""
        }
      ]);

      console.log(`config: ${result.configMessage}`);
      console.log(`network: ${result.networkMessage}`);
      console.log(`generation: ${result.generationMessage}`);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel ai doctor
  novel ai doctor --section config
  novel ai doctor --section all --test-generate
  novel ai doctor --section config   # 可配合 anthropic / openai 检查 provider 配置
  novel ai doctor --section all --test-generate --test-prompt "请只回复：联调通过"
  novel ai doctor --section all --test-generate --test-task chapter-plan --project 1 --chapter 1
  novel ai doctor --section all --test-generate --test-task draft-write --project 1 --chapter 1
  novel ai doctor --section all --test-generate --test-task draft-fix --draft 1 --notes "重点收紧节奏"`
    );
}
