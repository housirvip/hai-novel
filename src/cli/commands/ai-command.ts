import { Command } from "commander";
import { createAIProvider, resolveAISettings } from "../../ai/provider-factory.js";
import { AIDoctorService } from "../../app/services/ai-doctor-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";

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
    .option("--skip-network", "Skip network connectivity check")
    .action(async (options) => {
      const context = await loadRuntimeContext(process.cwd());
      const service = new AIDoctorService(context);
      const result = await service.diagnose({
        skipNetwork: options.skipNetwork === true
      });

      console.table([
        {
          provider: result.provider,
          model: result.model,
          base_url: result.baseUrl,
          api_key_env: result.apiKeyEnvName,
          api_key_ready: result.hasApiKey ? "yes" : "no",
          network_checked: result.networkChecked ? "yes" : "no",
          network_ok: result.networkOk ? "yes" : "no",
          http_status: result.httpStatus ?? ""
        }
      ]);

      console.log(result.networkMessage);
    });
}
