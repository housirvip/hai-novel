import { resolveAISettings } from "../../ai/provider-factory.js";
import type { RuntimeContext } from "./context-service.js";

export interface AIDoctorResult {
  /** 当前 provider。 */
  provider: string;
  /** 当前模型。 */
  model: string;
  /** 当前基础地址。 */
  baseUrl: string;
  /** 当前是否检测到密钥。 */
  hasApiKey: boolean;
  /** 当前密钥环境变量名。 */
  apiKeyEnvName: string;
  /** 是否执行了网络检查。 */
  networkChecked: boolean;
  /** 网络检查是否成功。 */
  networkOk: boolean;
  /** 网络检查状态描述。 */
  networkMessage: string;
  /** HTTP 状态码，可为空。 */
  httpStatus?: number;
}

export class AIDoctorService {
  constructor(private readonly context: RuntimeContext) {}

  async diagnose(options?: { skipNetwork?: boolean }): Promise<AIDoctorResult> {
    const settings = resolveAISettings(this.context);
    const baseUrl = settings.baseUrl ?? "";
    const apiKeyEnvName = settings.apiKeyEnvName ?? "";

    if (settings.provider === "mock") {
      return {
        provider: settings.provider,
        model: settings.model,
        baseUrl,
        hasApiKey: settings.hasApiKey,
        apiKeyEnvName,
        networkChecked: false,
        networkOk: true,
        networkMessage: "mock provider 无需网络检查。"
      };
    }

    if (!settings.hasApiKey) {
      return {
        provider: settings.provider,
        model: settings.model,
        baseUrl,
        hasApiKey: false,
        apiKeyEnvName,
        networkChecked: false,
        networkOk: false,
        networkMessage: "未检测到 OPENAI_API_KEY，已跳过网络检查。"
      };
    }

    if (options?.skipNetwork === true) {
      return {
        provider: settings.provider,
        model: settings.model,
        baseUrl,
        hasApiKey: true,
        apiKeyEnvName,
        networkChecked: false,
        networkOk: true,
        networkMessage: "按参数要求跳过网络检查。"
      };
    }

    return this.checkOpenAINetwork({
      provider: settings.provider,
      model: settings.model,
      baseUrl,
      apiKeyEnvName
    });
  }

  private async checkOpenAINetwork(input: {
    provider: string;
    model: string;
    baseUrl: string;
    apiKeyEnvName: string;
  }): Promise<AIDoctorResult> {
    try {
      // 这里用 models 接口做最小连通性探测，比直接发生成请求更轻。
      const response = await fetch(new URL("/v1/models", input.baseUrl), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`
        }
      });

      if (response.ok) {
        return {
          provider: input.provider,
          model: input.model,
          baseUrl: input.baseUrl,
          hasApiKey: true,
          apiKeyEnvName: input.apiKeyEnvName,
          networkChecked: true,
          networkOk: true,
          networkMessage: "OpenAI 网络检查通过。",
          httpStatus: response.status
        };
      }

      const responseText = await response.text();
      return {
        provider: input.provider,
        model: input.model,
        baseUrl: input.baseUrl,
        hasApiKey: true,
        apiKeyEnvName: input.apiKeyEnvName,
        networkChecked: true,
        networkOk: false,
        networkMessage: `OpenAI 网络检查失败：${responseText.slice(0, 200)}`,
        httpStatus: response.status
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        provider: input.provider,
        model: input.model,
        baseUrl: input.baseUrl,
        hasApiKey: true,
        apiKeyEnvName: input.apiKeyEnvName,
        networkChecked: true,
        networkOk: false,
        networkMessage: `OpenAI 网络检查异常：${message}`
      };
    }
  }
}
