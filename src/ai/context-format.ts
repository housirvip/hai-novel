import type { ChapterGenerationContext } from "../domain/types/index.js";
import { runtimeEnv } from "../config/runtime-env.js";

// 这些上限不是业务规则，而是 prompt 控长阈值。
// 真正决定“谁更应该被看见”的逻辑已经前移到 ChapterContextBuilder 的相关性排序里。
// 之所以允许用环境变量覆盖，是因为不同模型窗口、不同题材项目对上下文密度的容忍度不同。
const MAX_CHARACTER_CONTEXT_ITEMS = runtimeEnv.context.maxCharacterItems;
const MAX_FACTION_CONTEXT_ITEMS = runtimeEnv.context.maxFactionItems;
const MAX_LORE_CONTEXT_ITEMS = runtimeEnv.context.maxLoreItems;
const MAX_RELATION_CONTEXT_ITEMS = runtimeEnv.context.maxRelationItems;
const MAX_CHARACTER_FACTION_CONTEXT_ITEMS = runtimeEnv.context.maxCharacterFactionItems;
const MAX_HOOK_CONTEXT_ITEMS = runtimeEnv.context.maxHookItems;
const MAX_STATE_CONTEXT_ITEMS = runtimeEnv.context.maxStateItems;
const MAX_ITEM_CONTEXT_ITEMS = runtimeEnv.context.maxItemItems;
const MAX_TEXT_FIELD_LENGTH = runtimeEnv.context.textFieldMaxLength;
const MAX_LONG_TEXT_FIELD_LENGTH = runtimeEnv.context.longTextFieldMaxLength;
const MAX_SNAPSHOT_RAW_PAYLOAD_PREVIEW_LENGTH =
  runtimeEnv.context.snapshotRawPayloadPreviewLength;

export function formatChapterContextAsText(context: ChapterGenerationContext): string {
  const outlineSection =
    context.outline_chain.length > 0
      ? context.outline_chain
          .map(
            (outline, index) =>
              [
                `${index + 1}. [${outline.node_type}] ${outline.title}`,
                formatLabeledSegment("摘要", outline.summary),
                formatLabeledSegment("目标", outline.goal),
                formatLabeledSegment("冲突", outline.conflict),
                formatLabeledSegment("结果", outline.outcome)
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : context.root_outlines.length > 0
        ? context.root_outlines
            .map(
              (outline, index) =>
                [
                  `${index + 1}. [${outline.node_type}] ${outline.title}`,
                  formatLabeledSegment("摘要", outline.summary)
                ]
                  .filter(Boolean)
                  .join("；")
            )
            .join("\n")
        : "1. 当前项目尚未建立可用大纲。";

  const characterSection =
    context.characters.length > 0
      ? context.characters
          .slice(0, MAX_CHARACTER_CONTEXT_ITEMS)
          .map(
            (character, index) => {
              const segments = [
                `${index + 1}. ${character.name}${character.role ? `（${character.role}）` : ""}`,
                character.faction_name ? `所属势力：${character.faction_name}` : "",
                character.profession
                  ? `职业：${truncateText(
                      [character.profession, character.profession_detail]
                        .filter(Boolean)
                        .join(" / "),
                      MAX_TEXT_FIELD_LENGTH
                    )}`
                  : "",
                character.age ? `年龄：${character.age}` : "",
                formatLabeledSegment("简介", character.profile),
                formatLabeledSegment("性格", character.personality),
                formatLabeledSegment("目标", character.goal),
                formatLabeledSegment("冲突", character.conflict),
                formatLabeledSegment("秘密", character.secret),
                formatLabeledSegment("备注", character.notes)
              ].filter(Boolean);

              return segments.join("；");
            }
          )
          .join("\n")
      : "1. 当前项目暂无人物设定。";

  const factionSection =
    context.factions.length > 0
      ? context.factions
          .slice(0, MAX_FACTION_CONTEXT_ITEMS)
          .map(
            (faction, index) =>
              [
                `${index + 1}. ${faction.name}${faction.type ? `（${faction.type}）` : ""}`,
                faction.leader ? `领袖：${truncateText(faction.leader, MAX_TEXT_FIELD_LENGTH)}` : "",
                formatLabeledSegment("立场", faction.stance),
                formatLabeledSegment("目标", faction.goal),
                formatLabeledSegment("摘要", faction.summary),
                formatLabeledSegment("详情", faction.details, MAX_LONG_TEXT_FIELD_LENGTH)
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : "1. 当前项目暂无势力设定。";

  const loreSection =
    context.lore_entries.length > 0
      ? context.lore_entries
          .slice(0, MAX_LORE_CONTEXT_ITEMS)
          .map(
            (entry, index) =>
              [
                `${index + 1}. [${entry.type}] ${entry.title}`,
                formatLabeledSegment("摘要", entry.summary),
                formatLabeledSegment("补充", entry.details, MAX_LONG_TEXT_FIELD_LENGTH),
                formatLabeledSegment("标签", entry.tags)
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : "1. 当前项目暂无长期世界观设定。";

  const relationSection =
    context.character_relations.length > 0
      ? context.character_relations
          .slice(0, MAX_RELATION_CONTEXT_ITEMS)
          .map(
            (relation, index) =>
              [
                `${index + 1}. ${relation.character_name} -> ${relation.related_character_name} / ${relation.relation_type}`,
                formatLabeledSegment("摘要", relation.summary),
                formatLabeledSegment("细节", relation.details, MAX_LONG_TEXT_FIELD_LENGTH),
                relation.intensity !== null ? `强度：${relation.intensity}` : "",
                relation.visibility ? `可见性：${relation.visibility}` : ""
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : "1. 当前项目暂无人物关系。";

  const characterFactionSection =
    context.character_faction_relations.length > 0
      ? context.character_faction_relations
          .slice(0, MAX_CHARACTER_FACTION_CONTEXT_ITEMS)
          .map(
            (relation, index) =>
              [
                `${index + 1}. ${relation.character_name} -> ${relation.faction_name} / ${relation.relation_type}`,
                relation.title ? `头衔：${truncateText(relation.title, MAX_TEXT_FIELD_LENGTH)}` : "",
                relation.stance ? `立场：${truncateText(relation.stance, MAX_TEXT_FIELD_LENGTH)}` : "",
                formatLabeledSegment("摘要", relation.summary),
                formatLabeledSegment("细节", relation.details, MAX_LONG_TEXT_FIELD_LENGTH),
                relation.is_primary === 1 ? "主归属：是" : ""
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : "1. 当前项目暂无人物与势力关系。";

  const itemSection =
    context.active_character_items.length > 0
      ? context.active_character_items
          .slice(0, MAX_ITEM_CONTEXT_ITEMS)
          .map(
            (link, index) =>
              [
                `${index + 1}. ${link.item_name}`,
                `持有人：${link.character_name}`,
                `持有方式：${link.ownership_type}`,
                formatLabeledSegment("说明", link.note)
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
        : context.items.length > 0
        ? context.items
            .slice(0, MAX_ITEM_CONTEXT_ITEMS)
            .map(
              (item, index) =>
                [
                  `${index + 1}. ${item.name}${item.category ? `（${item.category}）` : ""}`,
                  item.rarity ? `稀有度：${item.rarity}` : "",
                  item.status ? `状态：${item.status}` : "",
                  formatLabeledSegment("描述", item.description),
                  formatLabeledSegment("来源", item.origin)
                ]
                  .filter(Boolean)
                  .join("；")
            )
            .join("\n")
        : "1. 当前项目暂无关键物品设定。";

  const hookLines: string[] = [];
  if (context.hook_links.length > 0) {
    hookLines.push("已绑定到本章的钩子：");
    hookLines.push(
      ...context.hook_links.map(
        (link, index) =>
          [
            `${index + 1}. ${link.hook_title}（${link.hook_type} / ${link.hook_status}）`,
            `本章动作：${link.link_type}`,
            formatLabeledSegment("计划说明", link.planned_note),
            formatLabeledSegment("实际落地", link.actual_note)
          ]
            .filter(Boolean)
            .join("；")
      )
    );
  }

  if (context.target_hooks.length > 0) {
    hookLines.push("本章目标回收钩子：");
    hookLines.push(
      ...context.target_hooks.map(
        (hook, index) =>
          [
            `${index + 1}. ${hook.title}（${hook.hook_type} / ${hook.status}）`,
            hook.priority !== null ? `优先级：${hook.priority}` : "",
            hook.target_chapter_title ? `目标章节：${hook.target_chapter_title}` : "",
            formatLabeledSegment("摘要", hook.summary),
            formatLabeledSegment("目标回收", hook.payoff_text)
          ]
            .filter(Boolean)
            .join("；")
      )
    );
  }

  if (context.active_hooks.length > 0) {
    hookLines.push("当前仍活跃的钩子：");
    hookLines.push(
      ...context.active_hooks.slice(0, MAX_HOOK_CONTEXT_ITEMS).map(
        (hook, index) =>
          [
            `${index + 1}. ${hook.title}（${hook.hook_type} / ${hook.status}）`,
            hook.priority !== null ? `优先级：${hook.priority}` : "",
            hook.start_chapter_title ? `起始章节：${hook.start_chapter_title}` : "",
            hook.target_chapter_title ? `目标章节：${hook.target_chapter_title}` : "",
            formatLabeledSegment("摘要", hook.summary),
            formatLabeledSegment("设钩", hook.setup_text),
            formatLabeledSegment("回收", hook.payoff_text)
          ]
            .filter(Boolean)
            .join("；")
      )
    );
  }

  const hookSection =
    hookLines.length > 0
      ? hookLines.join("\n")
      : "当前没有与本章直接关联或仍在活跃的钩子。";

  const latestChapterSnapshotSection = context.latest_chapter_snapshot
    ? [
        `- 最近正式状态章节：${context.latest_chapter_snapshot.chapter_id}`,
        `- 状态摘要：${truncateText(context.latest_chapter_snapshot.summary ?? "未提供", MAX_LONG_TEXT_FIELD_LENGTH)}`,
        context.latest_chapter_snapshot.raw_payload
          ? `- 原始快照：${truncateText(context.latest_chapter_snapshot.raw_payload, MAX_SNAPSHOT_RAW_PAYLOAD_PREVIEW_LENGTH)}`
          : "- 原始快照：未提供"
      ].join("\n")
    : "- 当前还没有可用的正式状态快照。";

  const characterNameMap = new Map(context.characters.map((item) => [item.id, item.name]));
  const factionNameMap = new Map(context.factions.map((item) => [item.id, item.name]));
  const hookNameMap = new Map([
    ...context.active_hooks.map((item) => [item.id, item.title] as const),
    ...context.target_hooks.map((item) => [item.id, item.title] as const),
    ...context.hook_links.map((item) => [item.hook_id, item.hook_title] as const)
  ]);

  const latestCharacterStateSection =
    context.latest_character_states.length > 0
      ? context.latest_character_states
          .slice(0, MAX_STATE_CONTEXT_ITEMS)
          .map(
            (snapshot, index) =>
              [
                `${index + 1}. ${
                  characterNameMap.get(snapshot.character_id) ?? `character_id=${snapshot.character_id}`
                } / chapter=${snapshot.chapter_id}`,
                formatLabeledSegment("状态", snapshot.status_summary),
                formatLabeledSegment("地点", snapshot.location),
                formatLabeledSegment("目标", snapshot.goal),
                formatLabeledSegment("外显", snapshot.public_impression),
                formatLabeledSegment("内在", snapshot.internal_state)
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : "1. 当前没有可用的人物正式状态快照。";

  const latestFactionStateSection =
    context.latest_faction_states.length > 0
      ? context.latest_faction_states
          .slice(0, MAX_STATE_CONTEXT_ITEMS)
          .map(
            (snapshot, index) =>
              [
                `${index + 1}. ${
                  factionNameMap.get(snapshot.faction_id) ?? `faction_id=${snapshot.faction_id}`
                } / chapter=${snapshot.chapter_id}`,
                formatLabeledSegment("状态", snapshot.status_summary),
                formatLabeledSegment("权力变化", snapshot.power_shift),
                formatLabeledSegment("对外关系", snapshot.external_relation_summary)
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : "1. 当前没有可用的势力正式状态快照。";

  const latestHookStateSection =
    context.latest_hook_states.length > 0
      ? context.latest_hook_states
          .slice(0, MAX_STATE_CONTEXT_ITEMS)
          .map(
            (snapshot, index) =>
              [
                `${index + 1}. ${hookNameMap.get(snapshot.hook_id) ?? `hook_id=${snapshot.hook_id}`} / chapter=${snapshot.chapter_id}`,
                `进度：${snapshot.progress_status}`,
                formatLabeledSegment("说明", snapshot.progress_note)
              ]
                .filter(Boolean)
                .join("；")
          )
          .join("\n")
      : "1. 当前没有可用的钩子正式状态快照。";

  return [
    "## 项目上下文",
    `- 项目：${context.project.name}`,
    `- 题材：${context.project.genre ?? "未设置"}`,
    `- 文风：${context.project.style ?? "未设置"}`,
    `- 故事前提：${context.project.premise ?? "未设置"}`,
    `- 目标字数：${context.project.target_word_count ?? "未设置"}`,
    `- 项目状态：${context.project.status}`,
    "",
    "## 章节上下文",
    `- 章节：${context.chapter.title}`,
    `- 章节摘要：${context.chapter.summary ?? "未设置"}`,
    `- 关联大纲：${context.chapter.outline_title ?? "未关联"}`,
    "",
    "## 大纲上下文",
    outlineSection,
    "",
    "## 人物上下文",
    characterSection,
    "",
    "## 势力上下文",
    factionSection,
    "",
    "## 世界观上下文",
    loreSection,
    "",
    "## 人物关系上下文",
    relationSection,
    "",
    "## 人物阵营上下文",
    characterFactionSection,
    "",
    "## 物品上下文",
    itemSection,
    "",
    "## 钩子上下文",
    hookSection,
    "",
    "## 最近正式状态",
    latestChapterSnapshotSection,
    "",
    "## 最近人物状态",
    latestCharacterStateSection,
    "",
    "## 最近势力状态",
    latestFactionStateSection,
    "",
    "## 最近钩子状态",
    latestHookStateSection
  ].join("\n");
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(1, maxLength - 1))}...`;
}

function formatLabeledSegment(
  label: string,
  value: string | null | undefined,
  maxLength: number = MAX_TEXT_FIELD_LENGTH
): string {
  if (!value || !value.trim()) {
    return "";
  }

  return `${label}：${truncateText(value, maxLength)}`;
}
