import { createAIProvider, resolveAISettings } from "../../ai/provider-factory.js";
import { runtimeEnv } from "../../config/runtime-env.js";
import { PromptService } from "./prompt-service.js";
import type { RuntimeContext } from "./context-service.js";

export type AIDoctorSection = "config" | "network" | "all";
export type AIDoctorTask = "ai_test" | "chapter-plan" | "draft-write" | "draft-fix";
type RemoteAIProviderType = "openai" | "anthropic";

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
  /** 配置检查是否通过。 */
  configOk: boolean;
  /** 配置检查说明。 */
  configMessage: string;
  /** 是否执行了网络检查。 */
  networkChecked: boolean;
  /** 网络检查是否成功。 */
  networkOk: boolean;
  /** 网络检查状态描述。 */
  networkMessage: string;
  /** 网络错误类型，可为空。 */
  networkErrorType?: string;
  /** HTTP 状态码，可为空。 */
  httpStatus?: number;
  /** 是否执行了最小生成测试。 */
  generationChecked: boolean;
  /** 最小生成测试是否成功。 */
  generationOk: boolean;
  /** 生成测试结果说明。 */
  generationMessage: string;
  /** 生成测试错误类型，可为空。 */
  generationErrorType?: string;
  /** 生成测试 request id，可为空。 */
  generationRequestId?: string;
}

export class AIDoctorService {
  constructor(private readonly context: RuntimeContext) {}

  async diagnose(options?: {
    skipNetwork?: boolean;
    section?: AIDoctorSection;
    testGenerate?: boolean;
    testTask?: AIDoctorTask;
    projectId?: number;
    chapterId?: number;
    draftId?: number;
    planId?: number;
    intent?: string;
    instruction?: string;
    notes?: string;
    testPrompt?: string;
    testContext?: string;
  }): Promise<AIDoctorResult> {
    const settings = resolveAISettings(this.context);
    const baseUrl = settings.baseUrl ?? "";
    const apiKeyEnvName = settings.apiKeyEnvName ?? "";
    const section = options?.section ?? "all";
    const configDiagnosis = this.diagnoseConfig();

    if (settings.provider === "mock") {
      if (options?.testGenerate === true) {
        const generationResult = await this.runGenerateTest("mock", {
          task: options.testTask,
          projectId: options.projectId,
          chapterId: options.chapterId,
          draftId: options.draftId,
          planId: options.planId,
          intent: options.intent,
          instruction: options.instruction,
          notes: options.notes,
          prompt: options.testPrompt,
          contextText: options.testContext
        });
        return {
          provider: settings.provider,
          model: settings.model,
          baseUrl,
          hasApiKey: settings.hasApiKey,
          apiKeyEnvName,
          configOk: configDiagnosis.configOk,
          configMessage: configDiagnosis.configMessage,
          networkChecked: false,
          networkOk: true,
          networkMessage:
            section === "network" || section === "all"
              ? "mock provider 无需网络检查。"
              : "当前只执行配置检查，未进行网络探测。",
          networkErrorType: "skipped",
          generationChecked: true,
          generationOk: generationResult.generationOk,
          generationMessage: generationResult.generationMessage,
          generationErrorType: generationResult.generationErrorType,
          generationRequestId: generationResult.generationRequestId
        };
      }

      return {
        provider: settings.provider,
        model: settings.model,
        baseUrl,
        hasApiKey: settings.hasApiKey,
        apiKeyEnvName,
        configOk: configDiagnosis.configOk,
        configMessage: configDiagnosis.configMessage,
        networkChecked: false,
        networkOk: true,
        networkMessage:
          section === "network" || section === "all"
            ? "mock provider 无需网络检查。"
            : "当前只执行配置检查，未进行网络探测。",
        networkErrorType: "skipped",
        generationChecked: false,
        generationOk: true,
        generationMessage: "未执行生成测试。",
        generationErrorType: "skipped"
      };
    }

    if (!settings.hasApiKey) {
      return {
        provider: settings.provider,
        model: settings.model,
        baseUrl,
        hasApiKey: false,
        apiKeyEnvName,
        configOk: configDiagnosis.configOk,
        configMessage: configDiagnosis.configMessage,
        networkChecked: false,
        networkOk: false,
        networkMessage: `未检测到 ${apiKeyEnvName}，已跳过网络检查。`,
        networkErrorType: "missing_api_key",
        generationChecked: false,
        generationOk: false,
        generationMessage: `未检测到 ${apiKeyEnvName}，已跳过生成测试。`,
        generationErrorType: "missing_api_key"
      };
    }

    if (section === "config") {
      return {
        provider: settings.provider,
        model: settings.model,
        baseUrl,
        hasApiKey: true,
        apiKeyEnvName,
        configOk: configDiagnosis.configOk,
        configMessage: configDiagnosis.configMessage,
        networkChecked: false,
        networkOk: true,
        networkMessage: "当前只执行配置检查，未进行网络探测。",
        networkErrorType: "skipped",
        generationChecked: false,
        generationOk: true,
        generationMessage: "当前只执行配置检查，未进行生成测试。",
        generationErrorType: "skipped"
      };
    }

    if (options?.skipNetwork === true) {
      return {
        provider: settings.provider,
        model: settings.model,
        baseUrl,
        hasApiKey: true,
        apiKeyEnvName,
        configOk: configDiagnosis.configOk,
        configMessage: configDiagnosis.configMessage,
        networkChecked: false,
        networkOk: true,
        networkMessage: "按参数要求跳过网络检查。",
        networkErrorType: "skipped",
        generationChecked: false,
        generationOk: true,
        generationMessage: "当前未执行生成测试。",
        generationErrorType: "skipped"
      };
    }

    const networkResult = await this.checkProviderNetwork({
      provider: settings.provider,
      model: settings.model,
      baseUrl,
      apiKeyEnvName,
      configDiagnosis
    });

    if (options?.testGenerate !== true) {
      return {
        ...networkResult,
        generationChecked: false,
        generationOk: networkResult.networkOk,
        generationMessage: "未执行生成测试。",
        generationErrorType: "skipped"
      };
    }

    if (!networkResult.networkOk) {
      return {
        ...networkResult,
        generationChecked: false,
        generationOk: false,
        generationMessage: "网络检查未通过，已跳过生成测试。",
        generationErrorType: "skipped_due_to_network"
      };
    }

    const generationResult = await this.runGenerateTest(settings.provider as RemoteAIProviderType, {
      task: options.testTask,
      projectId: options.projectId,
      chapterId: options.chapterId,
      draftId: options.draftId,
      planId: options.planId,
      intent: options.intent,
      instruction: options.instruction,
      notes: options.notes,
      prompt: options.testPrompt,
      contextText: options.testContext
    });
    return {
      ...networkResult,
      generationChecked: true,
      generationOk: generationResult.generationOk,
      generationMessage: generationResult.generationMessage,
      generationErrorType: generationResult.generationErrorType,
      generationRequestId: generationResult.generationRequestId
    };
  }

  private diagnoseConfig(): { configOk: boolean; configMessage: string } {
    const settings = resolveAISettings(this.context);

    if (settings.provider === "mock") {
      return {
        configOk: true,
        configMessage: "当前使用 mock provider，适合本地流程验证。"
      };
    }

    if (!settings.hasApiKey) {
      return {
        configOk: false,
        configMessage: `当前 provider 为 ${settings.provider}，但未检测到 \`${settings.apiKeyEnvName}\`。`
      };
    }

    return {
      configOk: true,
      configMessage: `${settings.provider} 配置基本完整，可继续执行网络连通性检查。`
    };
  }

  private async checkProviderNetwork(input: {
    provider: RemoteAIProviderType;
    model: string;
    baseUrl: string;
    apiKeyEnvName: string;
    configDiagnosis: {
      configOk: boolean;
      configMessage: string;
    };
  }): Promise<AIDoctorResult> {
    try {
      // OpenAI 和 Anthropic 都支持 models 接口，用它做最小探测比直接发生成请求更轻。
      const response = await fetch(new URL("/v1/models", input.baseUrl), {
        method: "GET",
        headers: this.buildNetworkHeaders(input.provider)
      });

      if (response.ok) {
        const providerLabel = this.formatProviderLabel(input.provider);
        return {
          provider: input.provider,
          model: input.model,
          baseUrl: input.baseUrl,
          hasApiKey: true,
          apiKeyEnvName: input.apiKeyEnvName,
          configOk: input.configDiagnosis.configOk,
          configMessage: input.configDiagnosis.configMessage,
          networkChecked: true,
          networkOk: true,
          networkMessage: `${providerLabel} 网络检查通过。`,
          networkErrorType: "none",
          httpStatus: response.status,
          generationChecked: false,
          generationOk: true,
          generationMessage: "未执行生成测试。",
          generationErrorType: "skipped"
        };
      }

      const responseText = await response.text();
      const networkErrorType = this.classifyHttpStatus(response.status);
      const providerLabel = this.formatProviderLabel(input.provider);
      return {
        provider: input.provider,
        model: input.model,
        baseUrl: input.baseUrl,
        hasApiKey: true,
        apiKeyEnvName: input.apiKeyEnvName,
        configOk: input.configDiagnosis.configOk,
        configMessage: input.configDiagnosis.configMessage,
        networkChecked: true,
        networkOk: false,
        networkMessage: `${providerLabel} 网络检查失败：${responseText.slice(
          0,
          runtimeEnv.display.networkErrorPreviewLength
        )}`,
        networkErrorType,
        httpStatus: response.status,
        generationChecked: false,
        generationOk: false,
        generationMessage: "网络检查失败，未执行生成测试。",
        generationErrorType: "skipped_due_to_network"
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const providerLabel = this.formatProviderLabel(input.provider);
      return {
        provider: input.provider,
        model: input.model,
        baseUrl: input.baseUrl,
        hasApiKey: true,
        apiKeyEnvName: input.apiKeyEnvName,
        configOk: input.configDiagnosis.configOk,
        configMessage: input.configDiagnosis.configMessage,
        networkChecked: true,
        networkOk: false,
        networkMessage: `${providerLabel} 网络检查异常：${message}`,
        networkErrorType: "network_error",
        generationChecked: false,
        generationOk: false,
        generationMessage: "网络检查异常，未执行生成测试。",
        generationErrorType: "skipped_due_to_network"
      };
    }
  }

  private async runGenerateTest(
    provider: "mock" | RemoteAIProviderType,
    input?: {
      task?: AIDoctorTask;
      projectId?: number;
      chapterId?: number;
      draftId?: number;
      planId?: number;
      intent?: string;
      instruction?: string;
      notes?: string;
      prompt?: string;
      contextText?: string;
    }
  ): Promise<{
    generationOk: boolean;
    generationMessage: string;
    generationErrorType: string;
    generationRequestId?: string;
  }> {
    try {
      const aiProvider = createAIProvider(this.context);
      const testTask = input?.task ?? "ai_test";
      const payload = this.buildGeneratePayload(testTask, input);
      const result = await aiProvider.generateText({
        taskType: payload.taskType,
        systemPrompt: payload.systemPrompt,
        prompt: payload.prompt,
        contextText: payload.contextText,
        maxOutputTokens: payload.maxOutputTokens
      });

      return {
        generationOk: true,
        generationMessage: `${provider} ${payload.taskType} 生成测试通过：${result.text.slice(
          0,
          runtimeEnv.display.generationPreviewLength
        )}`,
        generationErrorType: "none",
        generationRequestId: result.requestId
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        generationOk: false,
        generationMessage: `生成测试失败：${message}`,
        generationErrorType: "generation_error"
      };
    }
  }

  private buildNetworkHeaders(provider: RemoteAIProviderType): Record<string, string> {
    if (provider === "anthropic") {
      return {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01"
      };
    }

    return {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`
    };
  }

  private formatProviderLabel(provider: RemoteAIProviderType): string {
    return provider === "anthropic" ? "Anthropic" : "OpenAI";
  }

  private buildGeneratePayload(
    task: AIDoctorTask,
    input?: {
      projectId?: number;
      chapterId?: number;
      draftId?: number;
      planId?: number;
      intent?: string;
      instruction?: string;
      notes?: string;
      prompt?: string;
      contextText?: string;
    }
  ): {
    taskType: string;
    systemPrompt: string;
    prompt: string;
    contextText: string;
    maxOutputTokens: number;
  } {
    if (task === "ai_test") {
      return {
        taskType: "ai_test",
        systemPrompt: "你是中文助手，请用一句话回复。",
        prompt: input?.prompt ?? "请回复：连通性测试通过。",
        contextText: input?.contextText ?? "",
        // 连通性测试只验证 provider 是否能正常返回，没必要消耗过多输出预算。
        maxOutputTokens: runtimeEnv.ai.doctor.testMaxOutputTokens
      };
    }

    const promptService = new PromptService(this.context);

    if (task === "chapter-plan") {
      if (input?.projectId === undefined || input.chapterId === undefined) {
        throw new Error(
          "AI doctor task `chapter-plan` requires `--project` and `--chapter`."
        );
      }

      const bundle = promptService.buildChapterPlanPrompt({
        projectId: input.projectId,
        chapterId: input.chapterId,
        intent: input.intent
      });
      return {
        taskType: "chapter_plan",
        systemPrompt: bundle.systemPrompt,
        prompt: bundle.prompt,
        contextText: bundle.contextText,
        // doctor 的 plan 任务只做联调，不追求产出完整章节规划，所以预算低于正式生成。
        maxOutputTokens: runtimeEnv.ai.doctor.chapterPlanMaxOutputTokens
      };
    }

    if (task === "draft-write") {
      if (input?.projectId === undefined || input.chapterId === undefined) {
        throw new Error(
          "AI doctor task `draft-write` requires `--project` and `--chapter`."
        );
      }

      const bundle = promptService.buildDraftWritePrompt({
        projectId: input.projectId,
        chapterId: input.chapterId,
        planId: input.planId,
        instruction: input.instruction
      });
      return {
        taskType: "chapter_draft",
        systemPrompt: bundle.systemPrompt,
        prompt: bundle.prompt,
        contextText: bundle.contextText,
        // doctor 的写稿联调只需确认整条 prompt 链路通畅，预算保持中等即可。
        maxOutputTokens: runtimeEnv.ai.doctor.draftWriteMaxOutputTokens
      };
    }

    if (input?.draftId === undefined) {
      throw new Error("AI doctor task `draft-fix` requires `--draft`.");
    }

    const bundle = promptService.buildDraftFixPrompt({
      draftId: input.draftId,
      notes: input.notes
    });
    return {
      taskType: "draft_review_fix",
      systemPrompt: bundle.systemPrompt,
      prompt: bundle.prompt,
      contextText: bundle.contextText,
      // 修稿联调通常比普通写稿更容易需要补充改写空间，因此给略高一点的上限。
      maxOutputTokens: runtimeEnv.ai.doctor.draftFixMaxOutputTokens
    };
  }

  private classifyHttpStatus(status: number): string {
    if (status === 401) {
      return "unauthorized";
    }

    if (status === 403) {
      return "forbidden";
    }

    if (status === 429) {
      return "rate_limited";
    }

    if (status >= 400 && status < 500) {
      return "client_error";
    }

    if (status >= 500) {
      return "server_error";
    }

    return "unknown";
  }
}
