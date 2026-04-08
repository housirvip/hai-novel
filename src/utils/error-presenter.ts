export interface PresentedCliError {
  /** 错误分类代码，方便命令行快速辨识问题类型。 */
  code: string;
  /** 面向用户的错误正文。 */
  message: string;
  /** 可选修复提示。 */
  hint?: string;
}

/**
 * 把运行时错误转成更适合 CLI 展示的结构。
 * V1 先用一套轻量规则做分类，优先覆盖最常见的失败场景。
 */
export function presentCliError(error: unknown): PresentedCliError {
  const message = error instanceof Error ? error.message : String(error);

  // Node 在文件不存在时通常会抛 `ENOENT`，这里统一转成更容易理解的文件错误。
  if (message.includes("ENOENT") || message.includes("no such file or directory")) {
    return {
      code: "FILESYSTEM",
      message,
      hint: "检查 `--input` 指向的文件路径是否存在，必要时先重新执行导出命令生成 Markdown 文件。"
    };
  }

  if (message.includes("Workspace is not initialized")) {
    return {
      code: "PRECONDITION",
      message,
      hint: "先在当前工作区执行 `novel init`，再继续其他数据命令。"
    };
  }

  if (message.includes("must be an integer")) {
    return {
      code: "ARGUMENT",
      message,
      hint: "检查对应选项是否传入了有效数字，例如 `--project 1`、`--chapter 3`。"
    };
  }

  // 多个命令都复用了“must be one of”风格的枚举参数校验，这里统一给出更泛化的修复提示。
  if (message.includes("must be one of:")) {
    return {
      code: "ARGUMENT",
      message,
      hint: "按提示检查枚举参数的可选值，并确认命令示例里的拼写和大小写是否一致。"
    };
  }

  if (message.includes("No plan found for chapter")) {
    return {
      code: "MISSING_PLAN",
      message,
      hint: "先执行 `novel chapter plan --project <id> --chapter <id>` 生成本章 plan。"
    };
  }

  if (message.includes("No draft found for chapter")) {
    return {
      code: "MISSING_DRAFT",
      message,
      hint: "先执行 `novel draft write --project <id> --chapter <id>` 生成草稿。"
    };
  }

  if (message.includes("Approve completed for draft") && message.includes("final export failed")) {
    return {
      code: "POST_APPROVE_EXPORT",
      message,
      hint: "本次 approve 已经成功写入 final 和状态快照；可先执行 `novel chapter export --chapter <id> --source final` 单独重导出。"
    };
  }

  if (message.includes("No final text found for chapter")) {
    return {
      code: "MISSING_FINAL",
      message,
      hint: "先对草稿执行 `novel draft review --draft <id> --action approve`，再导出 final。"
    };
  }

  if (message.includes("Markdown frontmatter is required")) {
    return {
      code: "MARKDOWN_FORMAT",
      message,
      hint: "请使用系统导出的 Markdown 模板回写，并保留文件头部的 frontmatter 元数据。"
    };
  }

  if (
    message.includes("Markdown metadata") ||
    message.includes("Markdown entity_type mismatch") ||
    message.includes("Markdown section")
  ) {
    return {
      code: "MARKDOWN_FORMAT",
      message,
      hint: "检查 Markdown 的 entity_type、entity_id、source_version 以及正文 section 标题是否仍然存在。"
    };
  }

  if (message.includes("Plan import chapter mismatch")) {
    return {
      code: "IMPORT_TARGET",
      message,
      hint: "确认 `--chapter` 与 Markdown 头部里的 `chapter_id` 指向同一章节，避免把规划回写到错误目标。"
    };
  }

  if (message.includes("Plan import target mismatch")) {
    return {
      code: "IMPORT_TARGET",
      message,
      hint: "确认 Markdown 里的 `entity_id / chapter_id` 与当前命令目标一致，避免把规划回写到别的章节。"
    };
  }

  if (message.includes("Draft import target mismatch")) {
    return {
      code: "IMPORT_TARGET",
      message,
      hint: "确认 `--draft` 与 Markdown 头部里的 `entity_id` 一致，避免把草稿回写到错误目标。"
    };
  }

  if (message.includes("Draft import chapter mismatch")) {
    return {
      code: "IMPORT_TARGET",
      message,
      hint: "确认这份草稿文件对应的 `chapter_id` 和当前 draft 的所属章节一致，避免串章回写。"
    };
  }

  if (message.includes("import version conflict")) {
    return {
      code: "VERSION_CONFLICT",
      message,
      hint: "先重新导出最新 Markdown，或确认无误后改用 `--force` 强制回写。"
    };
  }

  if (message.includes("OpenAI provider requires `OPENAI_API_KEY`")) {
    return {
      code: "AI_CONFIG",
      message,
      hint: "配置 `OPENAI_API_KEY`，或把 `novel.config.json` 里的 `ai.provider` 切回 `mock`。"
    };
  }

  if (message.includes("Anthropic provider requires `ANTHROPIC_API_KEY`")) {
    return {
      code: "AI_CONFIG",
      message,
      hint: "配置 `ANTHROPIC_API_KEY`，或把 `novel.config.json` 里的 `ai.provider` 切回 `mock`。"
    };
  }

  if (message.includes("Custom provider requires `CUSTOM_AI_API_KEY`")) {
    return {
      code: "AI_CONFIG",
      message,
      hint: "配置 `CUSTOM_AI_API_KEY`，或将 `CUSTOM_AI_REQUIRE_API_KEY=false` 用于无鉴权自定义网关。"
    };
  }

  if (message.includes("Custom provider requires `CUSTOM_AI_BASE_URL`")) {
    return {
      code: "AI_CONFIG",
      message,
      hint: "配置 `CUSTOM_AI_BASE_URL`，或在 `novel.config.json` 里填写 `ai.baseUrl`。"
    };
  }

  if (message.includes("No story outline found")) {
    return {
      code: "MISSING_OUTLINE",
      message,
      hint: "先执行 `novel outline set --project <id> ...` 设置整本小说总纲。"
    };
  }

  if (message.includes("Volume title is required")) {
    return {
      code: "ARGUMENT",
      message,
      hint: "手写分卷时传 `--title`，或改用 `--from-outline` 让系统依据总纲自动生成。"
    };
  }

  if (message.includes("does not belong to chapter")) {
    return {
      code: "DATA_MISMATCH",
      message,
      hint: "检查传入的 `--chapter` 与 `--draft` 是否属于同一章节，必要时先用 `show/list` 命令确认 ID。"
    };
  }

  if (
    message.includes("State extraction did not return a JSON object") ||
    message.includes("State extraction returned invalid JSON") ||
    message.includes("provider returned a non-JSON response")
  ) {
    return {
      code: "AI_OUTPUT",
      message,
      hint: "当前模型返回的不是可解析 JSON；可先切回 `mock` 验证流程，或调整 provider / prompt 后重试。"
    };
  }

  if (message.includes("not found")) {
    return {
      code: "NOT_FOUND",
      message,
      hint: "先用对应的 list/show 命令确认记录 ID 是否存在，再重新执行当前命令。"
    };
  }

  return {
    code: "RUNTIME",
    message
  };
}
