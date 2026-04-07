import type Database from "better-sqlite3";
import { formatChapterContextAsText } from "../../ai/context-format.js";
import {
  buildStateExtractPrompt,
  buildStateExtractSystemPrompt
} from "../../ai/prompts/state-extract-prompt.js";
import { createAIProvider } from "../../ai/provider-factory.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import type {
  ChapterGenerationContext,
  ChapterStateSnapshotRecord,
  HookProgressStatus
} from "../../domain/types/index.js";
import { ChapterContextBuilder } from "./chapter-context-builder.js";
import type { RuntimeContext } from "./context-service.js";

interface ExtractedStatePayload {
  chapter_summary: string;
  characters: Array<{
    character_id: number;
    status_summary?: string;
    location?: string;
    goal?: string;
    public_impression?: string;
    internal_state?: string;
  }>;
  factions: Array<{
    faction_id: number;
    status_summary?: string;
    power_shift?: string;
    external_relation_summary?: string;
  }>;
  hooks: Array<{
    hook_id: number;
    progress_status: HookProgressStatus;
    progress_note?: string;
  }>;
}

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
    payload: ExtractedStatePayload;
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
      temperature: 0.2,
      maxOutputTokens: 1200
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
    payload: ExtractedStatePayload;
    rawOutput: string;
  }): {
    chapterSnapshot: ChapterStateSnapshotRecord;
    characterSnapshotCount: number;
    factionSnapshotCount: number;
    hookSnapshotCount: number;
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
      hookSnapshotCount: input.payload.hooks.length
    };
  }

  private parseExtractionPayload(
    rawOutput: string,
    context: ChapterGenerationContext
  ): ExtractedStatePayload {
    const parsed = JSON.parse(this.unwrapJson(rawOutput)) as Partial<ExtractedStatePayload>;
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

    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.filter(
          (item): item is ExtractedStatePayload["characters"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.character_id === "number" &&
            validCharacterIds.has(item.character_id)
        )
      : [];

    const factions = Array.isArray(parsed.factions)
      ? parsed.factions.filter(
          (item): item is ExtractedStatePayload["factions"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.faction_id === "number" &&
            validFactionIds.has(item.faction_id)
        )
      : [];

    const hooks = Array.isArray(parsed.hooks)
      ? parsed.hooks.filter(
          (item): item is ExtractedStatePayload["hooks"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.hook_id === "number" &&
            validHookIds.has(item.hook_id) &&
            this.isHookProgressStatus(item.progress_status)
        )
      : [];

    return {
      chapter_summary:
        typeof parsed.chapter_summary === "string" && parsed.chapter_summary.trim()
          ? parsed.chapter_summary.trim()
          : `角色提及 ${characters.length} 个，势力提及 ${factions.length} 个，钩子跟踪 ${hooks.length} 条`,
      characters,
      factions,
      hooks
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
