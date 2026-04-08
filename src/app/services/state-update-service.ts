import type Database from "better-sqlite3";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import type {
  ChapterStateSnapshotRecord,
  ExtractedChapterStatePayload
} from "../../domain/types/index.js";

/**
 * 正式状态落库服务。
 * 只负责把已经校验过的状态结果写入章节级和对象级快照。
 */
export class StateUpdateService {
  constructor(private readonly database: Database.Database) {}

  applyChapterState(input: {
    projectId: number;
    chapterId: number;
    draftId?: number;
    payload: ExtractedChapterStatePayload;
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

  private normalizeOptionalText(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
}
