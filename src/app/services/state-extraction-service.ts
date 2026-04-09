import type Database from "better-sqlite3";
import { formatChapterContextAsText } from "../../ai/context-format.js";
import {
  buildStateExtractPrompt,
  buildStateExtractSystemPrompt
} from "../../ai/prompts/state-extract-prompt.js";
import { createAIProvider } from "../../ai/provider-factory.js";
import { runtimeEnv } from "../../config/runtime-env.js";
import type {
  ChapterGenerationContext,
  ExtractedChapterStatePayload,
  HookProgressStatus
} from "../../domain/types/index.js";
import { ChapterContextBuilder } from "./chapter-context-builder.js";
import type { RuntimeContext } from "./context-service.js";

/**
 * 正式状态提取服务。
 * 只负责组织状态提取 prompt、调用模型，并把结果校验为稳定结构。
 */
export class StateExtractionService {
  constructor(
    private readonly context: RuntimeContext,
    private readonly database: Database.Database
  ) {}

  async extractChapterState(input: {
    projectId: number;
    chapterId: number;
    finalText: string;
  }): Promise<{
    payload: ExtractedChapterStatePayload;
    rawOutput: string;
    prompt: string;
    model: string;
  }> {
    const contextBuilder = new ChapterContextBuilder(this.database);
    const chapterContext = contextBuilder.build({
      projectId: input.projectId,
      chapterId: input.chapterId
    });

    const prompt = buildStateExtractPrompt({
      context: chapterContext,
      finalText: input.finalText
    });
    const provider = createAIProvider(this.context);
    const result = await provider.generateText({
      taskType: "state_snapshot_extract",
      systemPrompt: buildStateExtractSystemPrompt(),
      prompt,
      contextText: formatChapterContextAsText(chapterContext),
      temperature: runtimeEnv.ai.stateExtract.temperature,
      maxOutputTokens: runtimeEnv.ai.stateExtract.maxOutputTokens
    });

    return {
      payload: this.parseExtractionPayload(result.text, chapterContext),
      rawOutput: result.text,
      prompt,
      model: result.model
    };
  }

  private parseExtractionPayload(
    rawOutput: string,
    context: ChapterGenerationContext
  ): ExtractedChapterStatePayload {
    let parsed: Partial<ExtractedChapterStatePayload>;
    try {
      parsed = JSON.parse(this.unwrapJson(rawOutput)) as Partial<ExtractedChapterStatePayload>;
    } catch {
      throw new Error("State extraction returned invalid JSON.");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("State extraction did not return a JSON object.");
    }

    const validCharacterIds = new Set(context.characters.map((character) => character.id));
    const validFactionIds = new Set(context.factions.map((faction) => faction.id));
    const validHookIds = new Set([
      ...context.hook_links.map((item) => item.hook_id),
      ...context.target_hooks.map((item) => item.id),
      ...context.active_hooks.map((item) => item.id)
    ]);
    const validItemIds = new Set(context.items.map((item) => item.id));
    const validOwnerCharacterIds = new Set(context.characters.map((character) => character.id));
    const characterNameMap = new Map(
      context.characters.map((character) => [this.normalizeName(character.name), character.id])
    );
    const factionNameMap = new Map(
      context.factions.map((faction) => [this.normalizeName(faction.name), faction.id])
    );
    const hookTitleMap = new Map<number, string>();
    for (const hook of context.active_hooks) {
      hookTitleMap.set(hook.id, hook.title);
    }
    for (const hook of context.target_hooks) {
      hookTitleMap.set(hook.id, hook.title);
    }
    for (const link of context.hook_links) {
      if (!hookTitleMap.has(link.hook_id)) {
        hookTitleMap.set(link.hook_id, link.hook_title);
      }
    }
    const hookNameMap = new Map(
      [...hookTitleMap.entries()].map(([id, title]) => [this.normalizeName(title), id])
    );

    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const rawCharacterId =
            typeof item.character_id === "number" && validCharacterIds.has(item.character_id)
              ? item.character_id
              : undefined;
          const fallbackCharacterId = this.resolveMappedId(item.name, characterNameMap);
          const rawFactionId =
            typeof item.faction_id === "number" && validFactionIds.has(item.faction_id)
              ? item.faction_id
              : undefined;
          const fallbackFactionId = this.resolveMappedId(item.faction_name, factionNameMap);
          const characterId = rawCharacterId ?? fallbackCharacterId;
          const factionId = rawFactionId ?? fallbackFactionId;
          const name = this.normalizeOptionalText(item.name);

          if (!characterId && !name) {
            return [];
          }

          return [
            {
              character_id: characterId,
              name: characterId ? undefined : name,
              role: this.normalizeOptionalText(item.role),
              faction_id: factionId,
              faction_name: factionId ? undefined : this.normalizeOptionalText(item.faction_name),
              profession: this.normalizeOptionalText(item.profession),
              profile: this.normalizeOptionalText(item.profile),
              status_summary: this.normalizeOptionalText(item.status_summary),
              location: this.normalizeOptionalText(item.location),
              goal: this.normalizeOptionalText(item.goal),
              public_impression: this.normalizeOptionalText(item.public_impression),
              internal_state: this.normalizeOptionalText(item.internal_state)
            }
          ];
        })
      : [];

    const factions = Array.isArray(parsed.factions)
      ? parsed.factions.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const factionId =
            (typeof item.faction_id === "number" && validFactionIds.has(item.faction_id)
              ? item.faction_id
              : undefined) ?? this.resolveMappedId(item.name, factionNameMap);
          const name = this.normalizeOptionalText(item.name);

          if (!factionId && !name) {
            return [];
          }

          return [
            {
              faction_id: factionId,
              name: factionId ? undefined : name,
              type: this.normalizeOptionalText(item.type),
              leader: this.normalizeOptionalText(item.leader),
              goal: this.normalizeOptionalText(item.goal),
              stance: this.normalizeOptionalText(item.stance),
              summary: this.normalizeOptionalText(item.summary),
              details: this.normalizeOptionalText(item.details),
              status_summary: this.normalizeOptionalText(item.status_summary),
              power_shift: this.normalizeOptionalText(item.power_shift),
              external_relation_summary: this.normalizeOptionalText(item.external_relation_summary)
            }
          ];
        })
      : [];

    const hooks = Array.isArray(parsed.hooks)
      ? parsed.hooks.flatMap((item) => {
          if (
            !item ||
            typeof item !== "object" ||
            !this.isHookProgressStatus(item.progress_status)
          ) {
            return [];
          }

          const hookId =
            (typeof item.hook_id === "number" && validHookIds.has(item.hook_id)
              ? item.hook_id
              : undefined) ?? this.resolveMappedId(item.title, hookNameMap);
          const title = this.normalizeOptionalText(item.title);

          if (!hookId && !title) {
            return [];
          }

          return [
            {
              hook_id: hookId,
              title: hookId ? undefined : title,
              hook_type: this.normalizeOptionalText(item.hook_type),
              summary: this.normalizeOptionalText(item.summary),
              setup_text: this.normalizeOptionalText(item.setup_text),
              payoff_text: this.normalizeOptionalText(item.payoff_text),
              priority: this.normalizeOptionalInteger(item.priority),
              target_chapter_id: this.normalizeOptionalInteger(item.target_chapter_id),
              link_type: this.normalizeOptionalText(item.link_type),
              progress_status: item.progress_status,
              progress_note: this.normalizeOptionalText(item.progress_note)
            }
          ];
        })
      : [];

    const characterRelations = Array.isArray(parsed.character_relations)
      ? parsed.character_relations.flatMap((item) => {
          if (
            !item ||
            typeof item !== "object" ||
            typeof item.relation_type !== "string" ||
            !item.relation_type.trim()
          ) {
            return [];
          }

          const characterId =
            (typeof item.character_id === "number" && validCharacterIds.has(item.character_id)
              ? item.character_id
              : undefined) ?? this.resolveMappedId(item.character_name, characterNameMap);
          const relatedCharacterId =
            (typeof item.related_character_id === "number" &&
            validCharacterIds.has(item.related_character_id)
              ? item.related_character_id
              : undefined) ?? this.resolveMappedId(item.related_character_name, characterNameMap);
          const characterName = this.normalizeOptionalText(item.character_name);
          const relatedCharacterName = this.normalizeOptionalText(item.related_character_name);

          if ((!characterId && !characterName) || (!relatedCharacterId && !relatedCharacterName)) {
            return [];
          }

          return [
            {
              character_id: characterId,
              character_name: characterId ? undefined : characterName,
              related_character_id: relatedCharacterId,
              related_character_name: relatedCharacterId ? undefined : relatedCharacterName,
              relation_type: item.relation_type.trim(),
              summary: this.normalizeOptionalText(item.summary),
              details: this.normalizeOptionalText(item.details),
              intensity: this.normalizeOptionalInteger(item.intensity),
              visibility: this.normalizeOptionalText(item.visibility)
            }
          ];
        })
      : [];

    const characterFactionRelations = Array.isArray(parsed.character_faction_relations)
      ? parsed.character_faction_relations.flatMap((item) => {
          if (
            !item ||
            typeof item !== "object" ||
            typeof item.relation_type !== "string" ||
            !item.relation_type.trim()
          ) {
            return [];
          }

          const characterId =
            (typeof item.character_id === "number" && validCharacterIds.has(item.character_id)
              ? item.character_id
              : undefined) ?? this.resolveMappedId(item.character_name, characterNameMap);
          const factionId =
            (typeof item.faction_id === "number" && validFactionIds.has(item.faction_id)
              ? item.faction_id
              : undefined) ?? this.resolveMappedId(item.faction_name, factionNameMap);
          const characterName = this.normalizeOptionalText(item.character_name);
          const factionName = this.normalizeOptionalText(item.faction_name);

          if ((!characterId && !characterName) || (!factionId && !factionName)) {
            return [];
          }

          return [
            {
              character_id: characterId,
              character_name: characterId ? undefined : characterName,
              faction_id: factionId,
              faction_name: factionId ? undefined : factionName,
              relation_type: item.relation_type.trim(),
              title: this.normalizeOptionalText(item.title),
              stance: this.normalizeOptionalText(item.stance),
              summary: this.normalizeOptionalText(item.summary),
              details: this.normalizeOptionalText(item.details),
              is_primary: typeof item.is_primary === "boolean" ? item.is_primary : undefined
            }
          ];
        })
      : [];

    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(
          (item): item is ExtractedChapterStatePayload["items"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.item_id === "number" &&
            validItemIds.has(item.item_id) &&
            (item.owner_character_id === undefined ||
              (typeof item.owner_character_id === "number" &&
                validOwnerCharacterIds.has(item.owner_character_id)))
        )
      : [];

    return {
      chapter_summary:
        typeof parsed.chapter_summary === "string" && parsed.chapter_summary.trim()
          ? parsed.chapter_summary.trim()
          : `角色提及 ${characters.length} 个，势力提及 ${factions.length} 个，钩子跟踪 ${hooks.length} 条，人物关系 ${characterRelations.length} 条，人物-势力关系 ${characterFactionRelations.length} 条，物品提及 ${items.length} 个`,
      characters,
      factions,
      hooks,
      character_relations: characterRelations,
      character_faction_relations: characterFactionRelations,
      items
    };
  }

  private unwrapJson(rawOutput: string): string {
    const trimmed = rawOutput.trim();
    if (trimmed.startsWith("```")) {
      const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (fenced) {
        return fenced[1].trim();
      }
    }

    return trimmed;
  }

  private isHookProgressStatus(value: unknown): value is HookProgressStatus {
    return (
      value === "pending" ||
      value === "started" ||
      value === "advanced" ||
      value === "resolved"
    );
  }

  private normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private normalizeOptionalInteger(value: unknown): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
  }

  private normalizeName(value: string): string {
    return value.trim().toLocaleLowerCase("zh-Hans-CN");
  }

  private resolveMappedId(
    value: unknown,
    mapping: Map<string, number>
  ): number | undefined {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return undefined;
    }

    return mapping.get(this.normalizeName(normalized));
  }
}
