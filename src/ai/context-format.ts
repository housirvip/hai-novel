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

export function formatChapterContextAsText(context: ChapterGenerationContext): string {
  const outlineSection =
    context.outline_chain.length > 0
      ? context.outline_chain
          .map(
            (outline, index) =>
              `${index + 1}. [${outline.node_type}] ${outline.title}${
                outline.summary ? `：${outline.summary}` : ""
              }`
          )
          .join("\n")
      : context.root_outlines.length > 0
        ? context.root_outlines
            .map(
              (outline, index) =>
                `${index + 1}. [${outline.node_type}] ${outline.title}${
                  outline.summary ? `：${outline.summary}` : ""
                }`
            )
            .join("\n")
        : "1. 当前项目尚未建立可用大纲。";

  const characterSection =
    context.characters.length > 0
      ? context.characters
          .slice(0, MAX_CHARACTER_CONTEXT_ITEMS)
          .map(
            (character, index) =>
              `${index + 1}. ${character.name}${character.role ? `（${character.role}）` : ""}${
                character.faction_name ? `，所属势力：${character.faction_name}` : ""
              }${character.goal ? `，目标：${character.goal}` : ""}${
                character.conflict ? `，冲突：${character.conflict}` : ""
              }`
          )
          .join("\n")
      : "1. 当前项目暂无人物设定。";

  const factionSection =
    context.factions.length > 0
      ? context.factions
          .slice(0, MAX_FACTION_CONTEXT_ITEMS)
          .map(
            (faction, index) =>
              `${index + 1}. ${faction.name}${faction.type ? `（${faction.type}）` : ""}${
                faction.stance ? `，立场：${faction.stance}` : ""
              }${faction.goal ? `，目标：${faction.goal}` : ""}`
          )
          .join("\n")
      : "1. 当前项目暂无势力设定。";

  const loreSection =
    context.lore_entries.length > 0
      ? context.lore_entries
          .slice(0, MAX_LORE_CONTEXT_ITEMS)
          .map(
            (entry, index) =>
              `${index + 1}. [${entry.type}] ${entry.title}${
                entry.summary ? `：${entry.summary}` : ""
              }${entry.details ? `；补充：${entry.details}` : ""}`
          )
          .join("\n")
      : "1. 当前项目暂无长期世界观设定。";

  const relationSection =
    context.character_relations.length > 0
      ? context.character_relations
          .slice(0, MAX_RELATION_CONTEXT_ITEMS)
          .map(
            (relation, index) =>
              `${index + 1}. ${relation.character_name} -> ${relation.related_character_name} / ${
                relation.relation_type
              }${relation.summary ? `：${relation.summary}` : ""}`
          )
          .join("\n")
      : "1. 当前项目暂无人物关系。";

  const characterFactionSection =
    context.character_faction_relations.length > 0
      ? context.character_faction_relations
          .slice(0, MAX_CHARACTER_FACTION_CONTEXT_ITEMS)
          .map(
            (relation, index) =>
              `${index + 1}. ${relation.character_name} -> ${relation.faction_name} / ${
                relation.relation_type
              }${relation.title ? ` / ${relation.title}` : ""}${
                relation.stance ? ` / ${relation.stance}` : ""
              }`
          )
          .join("\n")
      : "1. 当前项目暂无人物与势力关系。";

  const hookLines: string[] = [];
  if (context.hook_links.length > 0) {
    hookLines.push("已绑定到本章的钩子：");
    hookLines.push(
      ...context.hook_links.map(
        (link, index) =>
          `${index + 1}. ${link.hook_title}（${link.hook_type} / ${link.hook_status}）` +
          `，本章动作：${link.link_type}` +
          `${link.planned_note ? `，计划说明：${link.planned_note}` : ""}`
      )
    );
  }

  if (context.target_hooks.length > 0) {
    hookLines.push("本章目标回收钩子：");
    hookLines.push(
      ...context.target_hooks.map(
        (hook, index) =>
          `${index + 1}. ${hook.title}（${hook.hook_type} / ${hook.status}）${
            hook.payoff_text ? `，目标回收：${hook.payoff_text}` : ""
          }`
      )
    );
  }

  if (context.active_hooks.length > 0) {
    hookLines.push("当前仍活跃的钩子：");
    hookLines.push(
      ...context.active_hooks.slice(0, MAX_HOOK_CONTEXT_ITEMS).map(
        (hook, index) =>
          `${index + 1}. ${hook.title}（${hook.hook_type}）${
            hook.summary ? `：${hook.summary}` : ""
          }`
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
        `- 状态摘要：${context.latest_chapter_snapshot.summary ?? "未提供"}`
      ].join("\n")
    : "- 当前还没有可用的正式状态快照。";

  const latestCharacterStateSection =
    context.latest_character_states.length > 0
      ? context.latest_character_states
          .slice(0, MAX_STATE_CONTEXT_ITEMS)
          .map(
            (snapshot, index) =>
              `${index + 1}. character_id=${snapshot.character_id} / chapter=${
                snapshot.chapter_id
              }${snapshot.status_summary ? ` / ${snapshot.status_summary}` : ""}`
          )
          .join("\n")
      : "1. 当前没有可用的人物正式状态快照。";

  const latestFactionStateSection =
    context.latest_faction_states.length > 0
      ? context.latest_faction_states
          .slice(0, MAX_STATE_CONTEXT_ITEMS)
          .map(
            (snapshot, index) =>
              `${index + 1}. faction_id=${snapshot.faction_id} / chapter=${
                snapshot.chapter_id
              }${snapshot.status_summary ? ` / ${snapshot.status_summary}` : ""}`
          )
          .join("\n")
      : "1. 当前没有可用的势力正式状态快照。";

  const latestHookStateSection =
    context.latest_hook_states.length > 0
      ? context.latest_hook_states
          .slice(0, MAX_STATE_CONTEXT_ITEMS)
          .map(
            (snapshot, index) =>
              `${index + 1}. hook_id=${snapshot.hook_id} / chapter=${snapshot.chapter_id} / ${
                snapshot.progress_status
              }${snapshot.progress_note ? ` / ${snapshot.progress_note}` : ""}`
          )
          .join("\n")
      : "1. 当前没有可用的钩子正式状态快照。";

  return [
    "## 项目上下文",
    `- 项目：${context.project.name}`,
    `- 题材：${context.project.genre ?? "未设置"}`,
    `- 文风：${context.project.style ?? "未设置"}`,
    `- 故事前提：${context.project.premise ?? "未设置"}`,
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
