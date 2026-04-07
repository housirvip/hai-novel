import type { AIProviderType } from "../domain/types/index.js";

/**
 * 生成文本时的标准输入。
 * V1 先统一成轻量协议，后面切真实模型时可以复用这层抽象。
 */
export interface GenerateTextInput {
  /** 任务类型，例如 chapter_draft。 */
  taskType: string;
  /** 系统级提示词。 */
  systemPrompt: string;
  /** 主 prompt。 */
  prompt: string;
  /** 上下文摘要。 */
  contextText: string;
  /** 可选温度参数。 */
  temperature?: number;
  /** 可选输出 token 上限。 */
  maxOutputTokens?: number;
}

/**
 * 文本生成结果。
 */
export interface GenerateTextResult {
  /** 提供方类型。 */
  provider: AIProviderType;
  /** 使用的模型名。 */
  model: string;
  /** 生成出的正文。 */
  text: string;
  /** 可选请求 ID，便于排查线上问题。 */
  requestId?: string;
}

/**
 * AI provider 抽象。
 * 当前先接 mock，实现真实模型时只需要替换这里。
 */
export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}
