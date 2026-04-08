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

    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.filter(
          (item): item is ExtractedChapterStatePayload["characters"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.character_id === "number" &&
            validCharacterIds.has(item.character_id)
        )
      : [];

    const factions = Array.isArray(parsed.factions)
      ? parsed.factions.filter(
          (item): item is ExtractedChapterStatePayload["factions"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.faction_id === "number" &&
            validFactionIds.has(item.faction_id)
        )
      : [];

    const hooks = Array.isArray(parsed.hooks)
      ? parsed.hooks.filter(
          (item): item is ExtractedChapterStatePayload["hooks"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.hook_id === "number" &&
            validHookIds.has(item.hook_id) &&
            this.isHookProgressStatus(item.progress_status)
        )
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
          : `角色提及 ${characters.length} 个，势力提及 ${factions.length} 个，钩子跟踪 ${hooks.length} 条，物品提及 ${items.length} 个`,
      characters,
      factions,
      hooks,
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
}
