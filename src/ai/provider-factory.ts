import type { RuntimeContext } from "../app/services/context-service.js";
import { ensureRuntimeEnvLoaded } from "../config/runtime-env.js";
import type { AIProviderType } from "../domain/types/index.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import { CustomProvider } from "./custom-provider.js";
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
  /** 当前基础地址是否已就绪。 */
  hasBaseUrl: boolean;
  /** 当前是否检测到密钥。 */
  hasApiKey: boolean;
  /** 当前 provider 是否要求 API Key。 */
  requiresApiKey: boolean;
  /** 实际使用的密钥环境变量名。 */
  apiKeyEnvName?: string;
}

export interface ResolvedCustomProviderSettings {
  /** 自定义 provider 的基础地址。 */
  baseUrl?: string;
  /** chat completions 请求路径。 */
  chatPath: string;
  /** doctor 网络探测使用的 models 路径。 */
  modelsPath: string;
  /** API Key，可为空。 */
  apiKey?: string;
  /** API Key 头名称。 */
  authHeader: string;
  /** API Key 头前缀。 */
  authPrefix: string;
  /** 是否要求必须提供 API Key。 */
  requiresApiKey: boolean;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function resolveCustomProviderSettings(
  context: RuntimeContext
): ResolvedCustomProviderSettings {
  return {
    baseUrl: process.env.CUSTOM_AI_BASE_URL ?? context.config.ai.baseUrl,
    chatPath: process.env.CUSTOM_AI_CHAT_PATH ?? "/v1/chat/completions",
    modelsPath: process.env.CUSTOM_AI_MODELS_PATH ?? "/v1/models",
    apiKey: process.env.CUSTOM_AI_API_KEY,
    authHeader: process.env.CUSTOM_AI_AUTH_HEADER ?? "Authorization",
    authPrefix: process.env.CUSTOM_AI_AUTH_PREFIX ?? "Bearer",
    requiresApiKey: readBooleanEnv("CUSTOM_AI_REQUIRE_API_KEY", false)
  };
}

export function resolveAISettings(context: RuntimeContext): ResolvedAISettings {
  // provider 相关环境变量既可能来自系统环境，也可能来自项目根目录的 `.env`。
  ensureRuntimeEnvLoaded();

  const provider = (process.env.NOVEL_AI_PROVIDER ??
    context.config.ai.provider) as AIProviderType;
  const model = process.env.NOVEL_AI_MODEL ?? context.config.ai.model;
  const openAIBaseUrl =
    process.env.OPENAI_BASE_URL ?? context.config.ai.baseUrl ?? "https://api.openai.com";
  const anthropicBaseUrl =
    process.env.ANTHROPIC_BASE_URL ?? context.config.ai.baseUrl ?? "https://api.anthropic.com";
  const customSettings = resolveCustomProviderSettings(context);
  const apiKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "custom"
        ? customSettings.apiKey
        : process.env.OPENAI_API_KEY;
  const baseUrl =
    provider === "openai"
      ? openAIBaseUrl
      : provider === "anthropic"
        ? anthropicBaseUrl
        : provider === "custom"
          ? customSettings.baseUrl
          : undefined;
  const requiresApiKey =
    provider === "openai"
      ? true
      : provider === "anthropic"
        ? true
        : provider === "custom"
          ? customSettings.requiresApiKey
          : false;

  return {
    provider,
    model,
    baseUrl,
    hasBaseUrl: provider === "mock" ? true : typeof baseUrl === "string" && baseUrl.length > 0,
    hasApiKey: Boolean(apiKey),
    requiresApiKey,
    apiKeyEnvName:
      provider === "openai"
        ? "OPENAI_API_KEY"
        : provider === "anthropic"
          ? "ANTHROPIC_API_KEY"
          : provider === "custom"
            ? "CUSTOM_AI_API_KEY"
          : undefined
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

  if (settings.provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Anthropic provider requires `ANTHROPIC_API_KEY`. Set the environment variable or switch `ai.provider` to `mock`."
      );
    }

    return new AnthropicProvider({
      apiKey,
      baseUrl: settings.baseUrl ?? "https://api.anthropic.com",
      model: settings.model
    });
  }

  if (settings.provider === "custom") {
    const customSettings = resolveCustomProviderSettings(context);
    if (!customSettings.baseUrl) {
      throw new Error(
        "Custom provider requires `CUSTOM_AI_BASE_URL` or `ai.baseUrl` in `novel.config.json`."
      );
    }

    if (customSettings.requiresApiKey && !customSettings.apiKey) {
      throw new Error(
        "Custom provider requires `CUSTOM_AI_API_KEY`. Set the environment variable, or disable `CUSTOM_AI_REQUIRE_API_KEY` for unauthenticated endpoints."
      );
    }

    return new CustomProvider({
      apiKey: customSettings.apiKey,
      baseUrl: customSettings.baseUrl,
      chatPath: customSettings.chatPath,
      model: settings.model,
      authHeader: customSettings.authHeader,
      authPrefix: customSettings.authPrefix
    });
  }

  return new MockProvider();
}
