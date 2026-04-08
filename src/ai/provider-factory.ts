import type { RuntimeContext } from "../app/services/context-service.js";
import { ensureRuntimeEnvLoaded } from "../config/runtime-env.js";
import type { AIProviderType } from "../domain/types/index.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import { CustomProvider } from "./custom-provider.js";
import { MockProvider } from "./mock-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import type { AIProvider } from "./provider.js";

type RemoteAIProviderType = Exclude<AIProviderType, "mock">;

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
  /** 便于日志与 doctor 展示的 provider 名称。 */
  providerLabel: string;
  /** doctor 网络探测使用的请求路径。 */
  networkPath?: string;
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

export interface ResolvedProviderRuntime {
  /** provider 类型。 */
  provider: RemoteAIProviderType;
  /** 展示名称。 */
  label: string;
  /** 最终使用的基础地址。 */
  baseUrl?: string;
  /** 最终使用的 API Key。 */
  apiKey?: string;
  /** API Key 对应环境变量名。 */
  apiKeyEnvName?: string;
  /** 是否强制要求 API Key。 */
  requiresApiKey: boolean;
  /** doctor 网络探测路径。 */
  networkPath: string;
  /** doctor 网络探测头。 */
  networkHeaders: Record<string, string>;
  /** 缺少 baseUrl 时的报错文案。 */
  missingBaseUrlMessage?: string;
  /** 缺少 api key 时的报错文案。 */
  missingApiKeyMessage?: string;
  /** 实际创建 provider 实例。 */
  createProvider(model: string): AIProvider;
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

type ProviderRuntimeResolver = (context: RuntimeContext) => ResolvedProviderRuntime;

const PROVIDER_RUNTIME_RESOLVERS: Record<RemoteAIProviderType, ProviderRuntimeResolver> = {
  openai: (context) => {
    const baseUrl =
      process.env.OPENAI_BASE_URL ?? context.config.ai.baseUrl ?? "https://api.openai.com";
    const apiKey = process.env.OPENAI_API_KEY;

    return {
      provider: "openai",
      label: "OpenAI",
      baseUrl,
      apiKey,
      apiKeyEnvName: "OPENAI_API_KEY",
      requiresApiKey: true,
      networkPath: "/v1/models",
      networkHeaders: {
        Authorization: `Bearer ${apiKey ?? ""}`
      },
      missingApiKeyMessage:
        "OpenAI provider requires `OPENAI_API_KEY`. Set the environment variable or switch `ai.provider` to `mock`.",
      createProvider(model) {
        return new OpenAIProvider({
          apiKey: apiKey ?? "",
          baseUrl,
          model
        });
      }
    };
  },
  anthropic: (context) => {
    const baseUrl =
      process.env.ANTHROPIC_BASE_URL ?? context.config.ai.baseUrl ?? "https://api.anthropic.com";
    const apiKey = process.env.ANTHROPIC_API_KEY;

    return {
      provider: "anthropic",
      label: "Anthropic",
      baseUrl,
      apiKey,
      apiKeyEnvName: "ANTHROPIC_API_KEY",
      requiresApiKey: true,
      networkPath: "/v1/models",
      networkHeaders: {
        "x-api-key": apiKey ?? "",
        "anthropic-version": "2023-06-01"
      },
      missingApiKeyMessage:
        "Anthropic provider requires `ANTHROPIC_API_KEY`. Set the environment variable or switch `ai.provider` to `mock`.",
      createProvider(model) {
        return new AnthropicProvider({
          apiKey: apiKey ?? "",
          baseUrl,
          model
        });
      }
    };
  },
  custom: (context) => {
    const customSettings = resolveCustomProviderSettings(context);

    return {
      provider: "custom",
      label: "Custom",
      baseUrl: customSettings.baseUrl,
      apiKey: customSettings.apiKey,
      apiKeyEnvName: "CUSTOM_AI_API_KEY",
      requiresApiKey: customSettings.requiresApiKey,
      networkPath: customSettings.modelsPath,
      networkHeaders:
        customSettings.apiKey && customSettings.authHeader.trim().length > 0
          ? {
              [customSettings.authHeader]:
                customSettings.authPrefix.trim().length > 0
                  ? `${customSettings.authPrefix.trim()} ${customSettings.apiKey}`
                  : customSettings.apiKey
            }
          : {},
      missingBaseUrlMessage:
        "Custom provider requires `CUSTOM_AI_BASE_URL` or `ai.baseUrl` in `novel.config.json`.",
      missingApiKeyMessage:
        "Custom provider requires `CUSTOM_AI_API_KEY`. Set the environment variable, or disable `CUSTOM_AI_REQUIRE_API_KEY` for unauthenticated endpoints.",
      createProvider(model) {
        return new CustomProvider({
          apiKey: customSettings.apiKey,
          baseUrl: customSettings.baseUrl ?? "",
          chatPath: customSettings.chatPath,
          model,
          authHeader: customSettings.authHeader,
          authPrefix: customSettings.authPrefix
        });
      }
    };
  }
};

export function resolveProviderRuntime(
  context: RuntimeContext,
  provider: RemoteAIProviderType
): ResolvedProviderRuntime {
  ensureRuntimeEnvLoaded();
  return PROVIDER_RUNTIME_RESOLVERS[provider](context);
}

export function resolveAISettings(context: RuntimeContext): ResolvedAISettings {
  // provider 相关环境变量既可能来自系统环境，也可能来自项目根目录的 `.env`。
  ensureRuntimeEnvLoaded();

  const provider = (process.env.NOVEL_AI_PROVIDER ??
    context.config.ai.provider) as AIProviderType;
  const model = process.env.NOVEL_AI_MODEL ?? context.config.ai.model;

  if (provider === "mock") {
    return {
      provider,
      model,
      hasBaseUrl: true,
      hasApiKey: false,
      requiresApiKey: false,
      providerLabel: "Mock"
    };
  }

  const runtime = resolveProviderRuntime(context, provider);

  return {
    provider,
    model,
    baseUrl: runtime.baseUrl,
    hasBaseUrl: typeof runtime.baseUrl === "string" && runtime.baseUrl.length > 0,
    hasApiKey: Boolean(runtime.apiKey),
    requiresApiKey: runtime.requiresApiKey,
    apiKeyEnvName: runtime.apiKeyEnvName,
    providerLabel: runtime.label,
    networkPath: runtime.networkPath
  };
}

export function createAIProvider(context: RuntimeContext): AIProvider {
  const settings = resolveAISettings(context);

  if (settings.provider === "mock") {
    return new MockProvider();
  }

  const runtime = resolveProviderRuntime(context, settings.provider);

  if (!runtime.baseUrl && runtime.missingBaseUrlMessage) {
    throw new Error(runtime.missingBaseUrlMessage);
  }

  if (runtime.requiresApiKey && !runtime.apiKey && runtime.missingApiKeyMessage) {
    throw new Error(runtime.missingApiKeyMessage);
  }

  return runtime.createProvider(settings.model);
}
