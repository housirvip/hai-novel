/**
 * 非 JSON 响应预览截断长度。
 * 这里只用于错误提示，避免把整页 HTML 或网关报错全文打到终端里。
 */
const NON_JSON_PREVIEW_LIMIT = 200;

/**
 * 读取 provider 响应并解析 JSON。
 * 如果上游返回的是 HTML、纯文本或损坏响应，就抛出更清晰的错误，而不是裸露的 SyntaxError。
 */
export async function parseJsonResponse<T>(
  response: Response,
  providerLabel: string,
  requestId?: string
): Promise<T> {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText) as T;
  } catch {
    const preview = rawText.replace(/\s+/g, " ").trim().slice(0, NON_JSON_PREVIEW_LIMIT);
    const parts = [
      `${providerLabel} provider returned a non-JSON response.`,
      `status=${response.status}`
    ];

    if (requestId) {
      parts.push(`request_id=${requestId}`);
    }

    if (preview.length > 0) {
      parts.push(`preview=${preview}`);
    }

    throw new Error(parts.join(" "));
  }
}
