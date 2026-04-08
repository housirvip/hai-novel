import type { ChapterGenerationContext } from "../../domain/types/index.js";

/**
 * 状态提取的系统提示词。
 * 强制模型只输出 JSON，避免把说明文字混进正式解析链路。
 */
export function buildStateExtractSystemPrompt(): string {
  return [
    "你是长篇中文小说的正式状态提取助手。",
    "你的任务是根据章节正式文稿和章节上下文，提取本章已经生效的正式状态变化。",
    "只允许输出一个合法 JSON 对象。",
    "不要输出 Markdown、解释、前言、后记或代码围栏。"
  ].join("\n");
}

/**
 * 构造状态提取 prompt。
 * 这里显式带上候选对象 ID，方便模型直接返回结构化主键映射结果。
 */
export function buildStateExtractPrompt(input: {
  context: ChapterGenerationContext;
  finalText: string;
}): string {
  const characterLines =
    input.context.characters.length > 0
      ? input.context.characters
          .map(
            (character) =>
              `CHARACTER|id=${character.id}|name=${character.name}|goal=${character.goal ?? ""}`
          )
          .join("\n")
      : "CHARACTER|none";

  const factionLines =
    input.context.factions.length > 0
      ? input.context.factions
          .map(
            (faction) =>
              `FACTION|id=${faction.id}|name=${faction.name}|stance=${faction.stance ?? ""}`
          )
          .join("\n")
      : "FACTION|none";

  const hookMap = new Map<number, string>();
  for (const hook of input.context.active_hooks) {
    hookMap.set(
      hook.id,
      `HOOK|id=${hook.id}|title=${hook.title}|summary=${hook.summary ?? ""}|status=${hook.status}`
    );
  }
  for (const hook of input.context.target_hooks) {
    hookMap.set(
      hook.id,
      `HOOK|id=${hook.id}|title=${hook.title}|summary=${hook.summary ?? ""}|status=${hook.status}`
    );
  }
  for (const link of input.context.hook_links) {
    if (!hookMap.has(link.hook_id)) {
      hookMap.set(
        link.hook_id,
        `HOOK|id=${link.hook_id}|title=${link.hook_title}|summary=${link.planned_note ?? ""}|status=${link.hook_status}`
      );
    }
  }
  const hookLines = hookMap.size > 0 ? Array.from(hookMap.values()).join("\n") : "HOOK|none";

  const itemLines =
    input.context.active_character_items.length > 0
      ? input.context.active_character_items
          .map(
            (link) =>
              `ITEM|id=${link.item_id}|name=${link.item_name}|owner_character_id=${link.character_id}|owner_name=${link.character_name}|note=${link.note ?? ""}`
          )
          .join("\n")
      : input.context.items.length > 0
        ? input.context.items
            .map(
              (item) =>
                `ITEM|id=${item.id}|name=${item.name}|owner_character_id=|owner_name=|note=${item.description ?? item.origin ?? ""}`
            )
            .join("\n")
        : "ITEM|none";

  return [
    `项目：${input.context.project.name}`,
    `章节：${input.context.chapter.title}`,
    `章节摘要：${input.context.chapter.summary ?? "未设置"}`,
    "",
    "候选人物：",
    characterLines,
    "",
    "候选势力：",
    factionLines,
    "",
    "候选钩子：",
    hookLines,
    "",
    "候选物品：",
    itemLines,
    "",
    "正式文稿：",
    input.finalText,
    "",
    "请输出 JSON，对象结构必须严格如下：",
    "{",
    '  "chapter_summary": "字符串，概括本章正式生效的状态变化",',
    '  "characters": [',
    "    {",
    '      "character_id": 1,',
    '      "status_summary": "字符串",',
    '      "location": "字符串或空字符串",',
    '      "goal": "字符串或空字符串",',
    '      "public_impression": "字符串或空字符串",',
    '      "internal_state": "字符串或空字符串"',
    "    }",
    "  ],",
    '  "factions": [',
    "    {",
    '      "faction_id": 1,',
    '      "status_summary": "字符串",',
    '      "power_shift": "字符串或空字符串",',
    '      "external_relation_summary": "字符串或空字符串"',
    "    }",
    "  ],",
    '  "hooks": [',
    "    {",
    '      "hook_id": 1,',
    '      "progress_status": "pending 或 started 或 advanced 或 resolved",',
    '      "progress_note": "字符串"',
    "    }",
    "  ],",
    '  "items": [',
    "    {",
    '      "item_id": 1,',
    '      "owner_character_id": 1,',
    '      "status_summary": "字符串",',
    '      "location": "字符串或空字符串"',
    "    }",
    "  ]",
    "}",
    "",
    "提取要求：",
    "1. 只能使用候选列表中已有的 ID，不要杜撰新对象。",
    "2. 只提取已经在正式文稿中真正落地的状态，不要把 plan 或推测当事实。",
    "3. 若某对象没有明确变化，可以不输出它。",
    "4. 钩子若文稿已有推进或回收迹象，progress_status 应为 started / advanced / resolved。",
    "5. 物品只需要提取本章明确写到的关键道具，不需要穷举全部库存。",
    "6. 必须输出合法 JSON。"
  ].join("\n");
}
