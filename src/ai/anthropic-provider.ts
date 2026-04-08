import type { AIProvider, GenerateTextInput, GenerateTextResult } from "./provider.js";
import { parseJsonResponse } from "./response-utils.js";

export interface AnthropicProviderOptions {
  /** Anthropic API Key。 */
  apiKey: string;
  /** 请求基础地址。 */
  baseUrl: string;
  /** 默认模型。 */
  model: string;
}

interface AnthropicMessageResponsePayload {
  id?: string;
  model?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
}

export class AnthropicProvider implements AIProvider {
  constructor(private readonly options: AnthropicProviderOptions) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const url = new URL("/v1/messages", this.options.baseUrl).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.options.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.options.model,
        system: input.systemPrompt,
        messages: [
          {
            role: "user",
            content: `${input.prompt}\n\n${input.contextText}`.trim()
          }
        ],
        temperature: input.temperature,
        max_tokens: input.maxOutputTokens
      })
    });

    const requestId = response.headers.get("request-id") ?? undefined;
    const payload = await parseJsonResponse<AnthropicMessageResponsePayload>(
      response,
      "Anthropic",
      requestId
    );

    if (!response.ok) {
      const message =
        payload.error?.message ?? `Anthropic request failed with status ${response.status}.`;
      throw new Error(requestId ? `${message} request_id=${requestId}` : message);
    }

    const text = this.extractOutputText(payload);
    if (!text) {
      throw new Error(
        requestId
          ? `Anthropic response did not contain text output. request_id=${requestId}`
          : "Anthropic response did not contain text output."
      );
    }

    return {
      provider: "anthropic",
      model: payload.model ?? this.options.model,
      text,
      requestId
    };
  }

  private extractOutputText(payload: AnthropicMessageResponsePayload): string {
    const textParts = (payload.content ?? [])
      .filter((item) => item.type === "text" && typeof item.text === "string")
      .map((item) => item.text?.trim() ?? "")
      .filter((item) => item.length > 0);

    return textParts.join("\n").trim();
  }
}
