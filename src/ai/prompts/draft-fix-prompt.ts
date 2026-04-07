import type { DraftReviewIssue } from "../../domain/types/index.js";

export function buildDraftFixSystemPrompt(): string {
  return [
    "你是中文网络小说编辑助手。",
    "你要根据问题清单和章节上下文，对草稿做一次可直接替换原文的修订。",
    "只输出修订后的正文，不要输出解释、标题、备注或上下文。"
  ].join("\n");
}

export function buildDraftFixPrompt(
  draftText: string,
  issues: DraftReviewIssue[],
  notes?: string
): string {
  return [
    "请修订以下章节草稿。",
    `用户补充说明：${notes ?? "未提供"}`,
    "",
    "必须解决的问题：",
    ...issues.map(
      (issue, index) => `${index + 1}. [${issue.level}] ${issue.title}：${issue.detail}`
    ),
    "",
    "修订要求：",
    "1. 输出修订后的完整中文草稿。",
    "2. 不要输出问题清单、说明文字、提示词回显。",
    "3. 保留原有剧情方向，但清理元信息泄露和不合适表达。",
    "4. 若需要补充内容，优先补人物动作、对白、情绪与情节承接。",
    "",
    "原始草稿：",
    draftText
  ].join("\n");
}
