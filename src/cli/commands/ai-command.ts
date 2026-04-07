import { Command } from "commander";
import { createAIProvider, resolveAISettings } from "../../ai/provider-factory.js";
import {
  AIDoctorService,
  type AIDoctorSection
} from "../../app/services/ai-doctor-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";

function parseDoctorSection(value: string): AIDoctorSection {
  if (value === "config" || value === "network" || value === "all") {
    return value;
  }

  throw new Error("`--section` must be one of: config, network, all.");
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
    });

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
    .action(async (options) => {
      const context = await loadRuntimeContext(process.cwd());
      const service = new AIDoctorService(context);
      const result = await service.diagnose({
        skipNetwork: options.skipNetwork === true,
        section: options.section,
        testGenerate: options.testGenerate === true
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
    });
}
