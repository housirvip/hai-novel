import type { AIProvider, GenerateTextInput, GenerateTextResult } from "./provider.js";

export interface CustomProviderOptions {
  /** 自定义 provider 的 API Key，可为空。 */
  apiKey?: string;
  /** 自定义 provider 的基础地址。 */
  baseUrl: string;
  /** 自定义 provider 的 chat completions 路径。 */
  chatPath: string;
  /** 默认模型名。 */
  model: string;
  /** 认证头名称，例如 Authorization 或 x-api-key。 */
  authHeader: string;
  /** 认证头前缀，例如 Bearer；留空时直接发送 key 本体。 */
  authPrefix: string;
}

interface CustomChatCompletionPayload {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class CustomProvider implements AIProvider {
  constructor(private readonly options: CustomProviderOptions) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const url = new URL(this.options.chatPath, this.options.baseUrl).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.options.model,
        messages: [
          {
            role: "system",
            content: input.systemPrompt
          },
          {
            role: "user",
            content: `${input.prompt}\n\n${input.contextText}`.trim()
          }
        ],
        temperature: input.temperature,
        max_tokens: input.maxOutputTokens
      })
    });

    const requestId =
      response.headers.get("x-request-id") ??
      response.headers.get("request-id") ??
      undefined;
    const payload = (await response.json()) as CustomChatCompletionPayload;

    if (!response.ok) {
      const message =
        payload.error?.message ?? `Custom provider request failed with status ${response.status}.`;
      throw new Error(requestId ? `${message} request_id=${requestId}` : message);
    }

    const text = this.extractOutputText(payload);
    if (!text) {
      throw new Error(
        requestId
          ? `Custom provider response did not contain text output. request_id=${requestId}`
          : "Custom provider response did not contain text output."
      );
    }

    return {
      provider: "custom",
      model: payload.model ?? this.options.model,
      text,
      requestId
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.options.apiKey && this.options.authHeader.trim().length > 0) {
      const prefix = this.options.authPrefix.trim();
      headers[this.options.authHeader] =
        prefix.length > 0 ? `${prefix} ${this.options.apiKey}` : this.options.apiKey;
    }

    return headers;
  }

  private extractOutputText(payload: CustomChatCompletionPayload): string {
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content.trim();
    }

    if (Array.isArray(content)) {
      return content
        .filter((item) => item.type === "text" && typeof item.text === "string")
        .map((item) => item.text?.trim() ?? "")
        .filter((item) => item.length > 0)
        .join("\n")
        .trim();
    }

    return "";
  }
}
