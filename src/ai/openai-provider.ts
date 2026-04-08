import type { AIProvider, GenerateTextInput, GenerateTextResult } from "./provider.js";
import { parseJsonResponse } from "./response-utils.js";

export interface OpenAIProviderOptions {
  /** OpenAI API Key。 */
  apiKey: string;
  /** 请求基础地址。 */
  baseUrl: string;
  /** 默认模型。 */
  model: string;
}

interface OpenAIResponsePayload {
  id?: string;
  model?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

export class OpenAIProvider implements AIProvider {
  constructor(private readonly options: OpenAIProviderOptions) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const url = new URL("/v1/responses", this.options.baseUrl).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`
      },
      body: JSON.stringify({
        model: this.options.model,
        instructions: input.systemPrompt,
        input: `${input.prompt}\n\n${input.contextText}`,
        text: {
          format: {
            type: "text"
          }
        },
        temperature: input.temperature,
        max_output_tokens: input.maxOutputTokens
      })
    });

    const requestId = response.headers.get("x-request-id") ?? undefined;
    const payload = await parseJsonResponse<OpenAIResponsePayload>(response, "OpenAI", requestId);

    if (!response.ok) {
      const message = payload.error?.message ?? `OpenAI request failed with status ${response.status}.`;
      throw new Error(requestId ? `${message} request_id=${requestId}` : message);
    }

    const text = this.extractOutputText(payload);
    if (!text) {
      throw new Error(
        requestId
          ? `OpenAI response did not contain text output. request_id=${requestId}`
          : "OpenAI response did not contain text output."
      );
    }

    return {
      provider: "openai",
      model: payload.model ?? this.options.model,
      text,
      requestId
    };
  }

  private extractOutputText(payload: OpenAIResponsePayload): string {
    if (payload.output_text && payload.output_text.trim().length > 0) {
      return payload.output_text.trim();
    }

    const textParts: string[] = [];
    for (const outputItem of payload.output ?? []) {
      for (const contentItem of outputItem.content ?? []) {
        if (contentItem.type === "output_text" && contentItem.text) {
          textParts.push(contentItem.text);
        }
      }
    }

    return textParts.join("\n").trim();
  }
}
