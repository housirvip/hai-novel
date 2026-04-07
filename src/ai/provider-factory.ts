import type { RuntimeContext } from "../app/services/context-service.js";
import type { AIProviderType } from "../domain/types/index.js";
import { MockProvider } from "./mock-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import type { AIProvider } from "./provider.js";

export interface ResolvedAISettings {
  /** 当前解析出的 provider。 */
  provider: AIProviderType;
  /** 当前解析出的模型名。 */
  model: string;
  /** 当前解析出的基础地址。 */
  baseUrl?: string;
  /** 当前是否检测到密钥。 */
  hasApiKey: boolean;
  /** 实际使用的密钥环境变量名。 */
  apiKeyEnvName?: string;
}

export function resolveAISettings(context: RuntimeContext): ResolvedAISettings {
  const provider = (process.env.NOVEL_AI_PROVIDER ??
    context.config.ai.provider) as AIProviderType;
  const model = process.env.NOVEL_AI_MODEL ?? context.config.ai.model;
  const baseUrl =
    process.env.OPENAI_BASE_URL ??
    context.config.ai.baseUrl ??
    "https://api.openai.com";
  const apiKey = process.env.OPENAI_API_KEY;

  return {
    provider,
    model,
    baseUrl: provider === "openai" ? baseUrl : undefined,
    hasApiKey: Boolean(apiKey),
    apiKeyEnvName: provider === "openai" ? "OPENAI_API_KEY" : undefined
  };
}

export function createAIProvider(context: RuntimeContext): AIProvider {
  const settings = resolveAISettings(context);

  if (settings.provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI provider requires `OPENAI_API_KEY`. Set the environment variable or switch `ai.provider` to `mock`."
      );
    }

    return new OpenAIProvider({
      apiKey,
      baseUrl: settings.baseUrl ?? "https://api.openai.com",
      model: settings.model
    });
  }

  return new MockProvider();
}
