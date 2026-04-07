import type Database from "better-sqlite3";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import type {
  ChapterGenerationContext,
  ChapterStateSnapshotRecord
} from "../../domain/types/index.js";
import { ChapterContextBuilder } from "./chapter-context-builder.js";

/**
 * approve 之后的正式状态同步服务。
 * V2 当前先用可解释的规则提取章节级、角色级、势力级和钩子级快照。
 */
export class StateSyncService {
  constructor(private readonly database: Database.Database) {}

  syncApprovedChapter(input: {
    projectId: number;
    chapterId: number;
    draftId: number;
    finalText: string;
  }): {
    chapterSnapshot: ChapterStateSnapshotRecord;
    characterSnapshotCount: number;
    factionSnapshotCount: number;
    hookSnapshotCount: number;
  } {
    const contextBuilder = new ChapterContextBuilder(this.database);
    const chapterContext = contextBuilder.build({
      projectId: input.projectId,
      chapterId: input.chapterId
    });

    const characterNames = chapterContext.characters
      .filter((character) => input.finalText.includes(character.name))
      .map((character) => character.name);
    const factionNames = chapterContext.factions
      .filter((faction) => input.finalText.includes(faction.name))
      .map((faction) => faction.name);
    const hookStates = this.resolveHookStates(chapterContext, input.finalText);

    const payload = {
      chapter_id: input.chapterId,
      source_draft_id: input.draftId,
      mentioned_characters: characterNames,
      mentioned_factions: factionNames,
      hook_progress: hookStates.map((item) => ({
        hook_id: item.hookId,
        title: item.title,
        progress_status: item.progressStatus
      }))
    };

    const chapterSnapshotRepository = new ChapterStateSnapshotRepository(this.database);
    const chapterSnapshot = chapterSnapshotRepository.create({
      projectId: input.projectId,
      chapterId: input.chapterId,
      sourceDraftId: input.draftId,
      status: "applied",
      applied: true,
      summary: this.buildChapterSummary(characterNames, factionNames, hookStates.length),
      rawPayload: JSON.stringify(payload, null, 2)
    });

    const characterSnapshotRepository = new CharacterStateSnapshotRepository(this.database);
    const mentionedCharacters = chapterContext.characters.filter((character) =>
      input.finalText.includes(character.name)
    );
    for (const character of mentionedCharacters) {
      characterSnapshotRepository.create({
        projectId: input.projectId,
        characterId: character.id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        statusSummary: this.findMentionSummary(input.finalText, character.name),
        goal: character.goal ?? undefined,
        publicImpression: `本章正式文稿明确出现人物“${character.name}”。`
      });
    }

    const factionSnapshotRepository = new FactionStateSnapshotRepository(this.database);
    const mentionedFactions = chapterContext.factions.filter((faction) =>
      input.finalText.includes(faction.name)
    );
    for (const faction of mentionedFactions) {
      factionSnapshotRepository.create({
        projectId: input.projectId,
        factionId: faction.id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        statusSummary: this.findMentionSummary(input.finalText, faction.name),
        externalRelationSummary: faction.stance ?? undefined
      });
    }

    const hookSnapshotRepository = new HookStateSnapshotRepository(this.database);
    for (const hookState of hookStates) {
      hookSnapshotRepository.create({
        projectId: input.projectId,
        hookId: hookState.hookId,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        progressStatus: hookState.progressStatus,
        progressNote: hookState.progressNote
      });
    }

    return {
      chapterSnapshot,
      characterSnapshotCount: mentionedCharacters.length,
      factionSnapshotCount: mentionedFactions.length,
      hookSnapshotCount: hookStates.length
    };
  }

  private buildChapterSummary(
    characterNames: string[],
    factionNames: string[],
    hookCount: number
  ): string {
    return [
      `角色提及 ${characterNames.length} 个`,
      `势力提及 ${factionNames.length} 个`,
      `钩子跟踪 ${hookCount} 条`
    ].join("，");
  }

  private resolveHookStates(
    context: ChapterGenerationContext,
    finalText: string
  ): Array<{
    hookId: number;
    title: string;
    progressStatus: "pending" | "advanced";
    progressNote: string;
  }> {
    const hooks = new Map<
      number,
      {
        hookId: number;
        title: string;
        keywords: string[];
      }
    >();

    for (const link of context.hook_links) {
      hooks.set(link.hook_id, {
        hookId: link.hook_id,
        title: link.hook_title,
        keywords: this.collectKeywords([link.hook_title, link.planned_note, link.actual_note])
      });
    }

    for (const hook of context.target_hooks) {
      hooks.set(hook.id, {
        hookId: hook.id,
        title: hook.title,
        keywords: this.collectKeywords([hook.title, hook.summary, hook.setup_text, hook.payoff_text])
      });
    }

    return Array.from(hooks.values()).map((hook) => {
      const detected = hook.keywords.some((keyword) => keyword && finalText.includes(keyword));
      return {
        hookId: hook.hookId,
        title: hook.title,
        progressStatus: detected ? "advanced" : "pending",
        progressNote: detected
          ? `本章正式文稿已检测到钩子“${hook.title}”的推进痕迹。`
          : `本章已关联钩子“${hook.title}”，但正文中未检测到明显推进痕迹。`
      };
    });
  }

  private collectKeywords(values: Array<string | null | undefined>): string[] {
    const keywords = new Set<string>();

    for (const value of values) {
      if (!value) {
        continue;
      }

      const normalized = value.trim();
      if (normalized.length >= 2) {
        keywords.add(normalized);
      }

      for (const part of normalized.split(/[，。！？；、\s]+/)) {
        const keyword = part.trim();
        if (keyword.length >= 2 && keyword.length <= 12) {
          keywords.add(keyword);
        }
      }
    }

    return Array.from(keywords);
  }

  private findMentionSummary(finalText: string, keyword: string): string {
    const sentences = finalText
      .split(/(?<=[。！？\n])/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    const matched = sentences.find((sentence) => sentence.includes(keyword));
    if (matched) {
      return matched.slice(0, 120);
    }

    return `本章正式文稿检测到“${keyword}”相关状态，但暂未提取到更细摘要。`;
  }
}
