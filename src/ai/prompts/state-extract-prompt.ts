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
 * 这里显式带上候选对象 ID，方便模型优先复用既有对象；
 * 若正式文稿明确引入新人物 / 新势力 / 新钩子，也允许模型返回最小建档信息。
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

  const characterRelationLines =
    input.context.character_relations.length > 0
      ? input.context.character_relations
          .map(
            (relation) =>
              `CHAR_REL|id=${relation.id}|from_id=${relation.character_id}|from_name=${relation.character_name}|to_id=${relation.related_character_id}|to_name=${relation.related_character_name}|type=${relation.relation_type}|summary=${relation.summary ?? ""}`
          )
          .join("\n")
      : "CHAR_REL|none";

  const characterFactionRelationLines =
    input.context.character_faction_relations.length > 0
      ? input.context.character_faction_relations
          .map(
            (relation) =>
              `CHAR_FACTION_REL|id=${relation.id}|character_id=${relation.character_id}|character_name=${relation.character_name}|faction_id=${relation.faction_id}|faction_name=${relation.faction_name}|type=${relation.relation_type}|summary=${relation.summary ?? ""}`
          )
          .join("\n")
      : "CHAR_FACTION_REL|none";

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
    "已有人物关系：",
    characterRelationLines,
    "",
    "已有人物-势力关系：",
    characterFactionRelationLines,
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
    '      "name": "若是新角色则填写名字，否则可省略",',
    '      "role": "新角色可选：protagonist / antagonist / supporting / cameo 等",',
    '      "faction_id": 1,',
    '      "faction_name": "若角色属于新势力，可填势力名",',
    '      "profession": "字符串或空字符串",',
    '      "profile": "一句话角色简介或空字符串",',
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
    '      "name": "若是新势力则填写名称，否则可省略",',
    '      "type": "字符串或空字符串",',
    '      "leader": "字符串或空字符串",',
    '      "goal": "字符串或空字符串",',
    '      "stance": "字符串或空字符串",',
    '      "summary": "一句话势力摘要或空字符串",',
    '      "details": "补充设定或空字符串",',
    '      "status_summary": "字符串",',
    '      "power_shift": "字符串或空字符串",',
    '      "external_relation_summary": "字符串或空字符串"',
    "    }",
    "  ],",
    '  "hooks": [',
    "    {",
    '      "hook_id": 1,',
    '      "title": "若是新钩子则填写标题，否则可省略",',
    '      "hook_type": "mystery / threat / promise / relationship / item / secret 等，若新钩子请尽量填写",',
    '      "summary": "一句话钩子摘要或空字符串",',
    '      "setup_text": "本章如何埋下或暴露该钩子，可空",',
    '      "payoff_text": "未来回收方向，可空",',
    '      "priority": 1,',
    '      "target_chapter_id": 12,',
    '      "link_type": "setup / advance / reveal / close",',
    '      "progress_status": "pending 或 started 或 advanced 或 resolved",',
    '      "progress_note": "字符串"',
    "    }",
    "  ],",
    '  "character_relations": [',
    "    {",
    '      "character_id": 1,',
    '      "character_name": "若是新角色可填名字，否则可省略",',
    '      "related_character_id": 2,',
    '      "related_character_name": "若是新角色可填名字，否则可省略",',
    '      "relation_type": "enemy / mentor / ally / family 等",',
    '      "summary": "字符串或空字符串",',
    '      "details": "字符串或空字符串",',
    '      "intensity": 70,',
    '      "visibility": "public / private / secret 或空字符串"',
    "    }",
    "  ],",
    '  "character_faction_relations": [',
    "    {",
    '      "character_id": 1,',
    '      "character_name": "若是新角色可填名字，否则可省略",',
    '      "faction_id": 1,',
    '      "faction_name": "若是新势力可填名称，否则可省略",',
    '      "relation_type": "member / leader / undercover / observer 等",',
    '      "title": "字符串或空字符串",',
    '      "stance": "字符串或空字符串",',
    '      "summary": "字符串或空字符串",',
    '      "details": "字符串或空字符串",',
    '      "is_primary": true',
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
    "1. 候选列表里已经存在的人物 / 势力 / 钩子，优先返回对应 ID，不要重复新建。",
    "2. 若正式文稿明确出现上下文中不存在的新人物、新势力或新钩子，可以返回 name / title 等最小建档信息。",
    "3. 只提取已经在正式文稿中真正落地的状态，不要把 plan 或推测当事实。",
    "4. 若某对象没有明确变化，可以不输出它。",
    "5. 钩子若文稿已有推进或回收迹象，progress_status 应为 started / advanced / resolved；link_type 要与本章动作匹配。",
    "6. 若本章明确改变了人物之间的关系，或确认了人物与势力的归属/立场变化，请写入对应 relations 数组。",
    "7. 关系若能命中已有对象，优先返回 ID；若关系一端是新角色或新势力，可配合名称返回。",
    "8. 物品只需要提取本章明确写到的关键道具，不需要穷举全部库存。",
    "9. 必须输出合法 JSON。"
  ].join("\n");
}
