import type { ChapterGenerationContext, DraftReviewIssue } from "../../domain/types/index.js";

export function buildDraftReviewSystemPrompt(): string {
  return [
    "你是中文长篇小说的审稿编辑。",
    "你要根据章节上下文、章节摘要承诺和草稿正文，找出真正影响成稿质量的问题。",
    "只允许输出一个合法 JSON 对象，不要输出 Markdown、解释、前言、后记或代码围栏。"
  ].join("\n");
}

export function buildDraftReviewPrompt(input: {
  context: ChapterGenerationContext;
  draftText: string;
  notes?: string;
  ruleIssues: DraftReviewIssue[];
}): string {
  const protagonist =
    input.context.characters.find((character) => character.role === "protagonist")?.name ??
    input.context.characters[0]?.name ??
    "未识别";

  return [
    `项目：${input.context.project.name}`,
    `章节：${input.context.chapter.title}`,
    `章节摘要：${input.context.chapter.summary ?? "未设置"}`,
    `主角参考：${protagonist}`,
    `用户补充说明：${input.notes ?? "未提供"}`,
    "",
    "规则检查已发现的问题：",
    ...(input.ruleIssues.length > 0
      ? input.ruleIssues.map(
          (issue, index) => `${index + 1}. [${issue.level}] ${issue.title}：${issue.detail}`
        )
      : ["无"]),
    "",
    "待审草稿：",
    input.draftText,
    "",
    "请输出 JSON，对象结构必须严格如下：",
    "{",
    '  "issues": [',
    "    {",
    '      "level": "error 或 warning",',
    '      "title": "简短问题标题",',
    '      "detail": "明确指出问题为何影响成稿，并尽量落到具体段落表现"',
    "    }",
    "  ]",
    "}",
    "",
    "审查要求：",
    "1. 重点检查剧情承接、章节承诺兑现、人物动机清晰度、势力与世界观落地、钩子推进、语言风格稳定性。",
    "2. 只输出真正值得作者处理的问题，不要泛泛而谈，也不要重复同义问题。",
    "3. 若规则检查已经指出同类问题，可补充更具体的成因，但不要机械复述。",
    "4. 若没有明显问题，issues 返回空数组。",
    "5. 必须输出合法 JSON。"
  ].join("\n");
}
