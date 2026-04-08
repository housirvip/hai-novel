import type Database from "better-sqlite3";
import { formatChapterContextAsText } from "../../ai/context-format.js";
import {
  buildStateExtractPrompt,
  buildStateExtractSystemPrompt
} from "../../ai/prompts/state-extract-prompt.js";
import { createAIProvider } from "../../ai/provider-factory.js";
import { runtimeEnv } from "../../config/runtime-env.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import type {
  ExtractedChapterStatePayload,
  ChapterGenerationContext,
  ChapterStateSnapshotRecord,
  HookProgressStatus
} from "../../domain/types/index.js";
import { ChapterContextBuilder } from "./chapter-context-builder.js";
import type { RuntimeContext } from "./context-service.js";

/**
 * approve 之后的正式状态同步服务。
 * 当前通过 AI 输出 JSON，再由服务层统一校验并落库。
 */
export class StateSyncService {
  constructor(
    private readonly context: RuntimeContext,
    private readonly database: Database.Database
  ) {}

  async extractApprovedChapterState(input: {
    projectId: number;
    chapterId: number;
    draftId: number;
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
      // 状态提取更偏结构化抽取，低温度能减少 JSON 漂移。
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

  applyApprovedChapterState(input: {
    projectId: number;
    chapterId: number;
    draftId: number;
    payload: ExtractedChapterStatePayload;
    rawOutput: string;
  }): {
    chapterSnapshot: ChapterStateSnapshotRecord;
    characterSnapshotCount: number;
    factionSnapshotCount: number;
    hookSnapshotCount: number;
    itemStateCount: number;
  } {
    const chapterSnapshotRepository = new ChapterStateSnapshotRepository(this.database);
    const chapterSnapshot = chapterSnapshotRepository.create({
      projectId: input.projectId,
      chapterId: input.chapterId,
      sourceDraftId: input.draftId,
      status: "applied",
      applied: true,
      summary: input.payload.chapter_summary,
      rawPayload: JSON.stringify(input.payload, null, 2)
    });

    const characterSnapshotRepository = new CharacterStateSnapshotRepository(this.database);
    for (const character of input.payload.characters) {
      characterSnapshotRepository.create({
        projectId: input.projectId,
        characterId: character.character_id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        statusSummary: this.normalizeOptionalText(character.status_summary),
        location: this.normalizeOptionalText(character.location),
        goal: this.normalizeOptionalText(character.goal),
        publicImpression: this.normalizeOptionalText(character.public_impression),
        internalState: this.normalizeOptionalText(character.internal_state)
      });
    }

    const factionSnapshotRepository = new FactionStateSnapshotRepository(this.database);
    for (const faction of input.payload.factions) {
      factionSnapshotRepository.create({
        projectId: input.projectId,
        factionId: faction.faction_id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        statusSummary: this.normalizeOptionalText(faction.status_summary),
        powerShift: this.normalizeOptionalText(faction.power_shift),
        externalRelationSummary: this.normalizeOptionalText(faction.external_relation_summary)
      });
    }

    const hookSnapshotRepository = new HookStateSnapshotRepository(this.database);
    for (const hook of input.payload.hooks) {
      hookSnapshotRepository.create({
        projectId: input.projectId,
        hookId: hook.hook_id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        progressStatus: hook.progress_status,
        progressNote: this.normalizeOptionalText(hook.progress_note)
      });
    }

    return {
      chapterSnapshot,
      characterSnapshotCount: input.payload.characters.length,
      factionSnapshotCount: input.payload.factions.length,
      hookSnapshotCount: input.payload.hooks.length,
      itemStateCount: input.payload.items.length
    };
  }

  private parseExtractionPayload(
    rawOutput: string,
    context: ChapterGenerationContext
  ): ExtractedChapterStatePayload {
    const parsed = JSON.parse(this.unwrapJson(rawOutput)) as Partial<ExtractedChapterStatePayload>;
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

  private normalizeOptionalText(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
}
