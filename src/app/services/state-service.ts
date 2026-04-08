import { createDatabase } from "../../db/client.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import { ItemRepository } from "../../db/repositories/item-repository.js";
import type {
  ApproveSyncChapterInput,
  ApproveSyncChapterResult,
  ChapterStatePreviewResult,
  ChapterStateSnapshotRecord,
  PreviewChapterStateInput,
  ShowStateInput,
  StateShowItemState,
  StateShowResult
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";
import { StateExtractionService } from "./state-extraction-service.js";
import { StateUpdateService } from "./state-update-service.js";

/**
 * 状态快照查询服务。
 * 当前先提供最小查看能力，方便确认 approve 后的快照是否成功写入。
 */
export class StateService {
  constructor(private readonly context: RuntimeContext) {}

  async previewChapterState(input: PreviewChapterStateInput): Promise<ChapterStatePreviewResult> {
    logger.start(
      input.draftId !== undefined
        ? `state:chapter-preview chapter=${input.chapterId} draft=${input.draftId}`
        : `state:chapter-preview chapter=${input.chapterId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const draftRepository = new ChapterDraftRepository(database);
      const chapter = chapterRepository.findDetailById(input.chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${input.chapterId} not found.`);
      }

      const draft =
        input.draftId !== undefined
          ? draftRepository.findById(input.draftId)
          : draftRepository.findLatestByChapterId(input.chapterId);

      if (draft && draft.chapter_id !== input.chapterId) {
        throw new Error(`Draft ${draft.id} does not belong to chapter ${input.chapterId}.`);
      }

      const sourceText = draft?.draft_text ?? chapter.final_text;
      const sourceType = draft ? "draft" : "final";
      const sourceDraftId = draft?.id ?? null;

      if (!sourceText) {
        throw new Error(`No draft found for chapter ${input.chapterId}. Run \`novel draft write\` first.`);
      }

      const extractionService = new StateExtractionService(this.context, database);
      const extracted = await extractionService.extractChapterState({
        projectId: chapter.project_id,
        chapterId: chapter.id,
        finalText: sourceText
      });

      logger.success(
        `state:chapter-preview chapter=${input.chapterId} source=${sourceType} characters=${extracted.payload.characters.length} factions=${extracted.payload.factions.length} hooks=${extracted.payload.hooks.length} items=${extracted.payload.items.length}`
      );

      return {
        chapterId: chapter.id,
        projectId: chapter.project_id,
        sourceType,
        sourceDraftId,
        payload: extracted.payload,
        rawOutput: extracted.rawOutput
      };
    } finally {
      database.close();
    }
  }

  async approveSyncChapter(input: ApproveSyncChapterInput): Promise<ApproveSyncChapterResult> {
    logger.start(`state:approve-sync chapter=${input.chapterId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const chapterSnapshotRepository = new ChapterStateSnapshotRepository(database);
      const chapter = chapterRepository.findDetailById(input.chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${input.chapterId} not found.`);
      }

      if (!chapter.final_text) {
        throw new Error(
          `No final text found for chapter ${input.chapterId}. Approve a draft before running approve-sync.`
        );
      }

      const extractionService = new StateExtractionService(this.context, database);
      const updateService = new StateUpdateService(database);
      const extracted = await extractionService.extractChapterState({
        projectId: chapter.project_id,
        chapterId: chapter.id,
        finalText: chapter.final_text
      });

      const previousSnapshots = chapterSnapshotRepository.findAllByChapterId(chapter.id);
      const syncResult = database.transaction(() => {
        const replacedSnapshotCount = chapterSnapshotRepository.deleteByChapterId(chapter.id);
        const applied = updateService.applyChapterState({
          projectId: chapter.project_id,
          chapterId: chapter.id,
          draftId: chapter.approved_draft_id ?? undefined,
          payload: extracted.payload
        });

        return {
          replacedSnapshotCount,
          applied
        };
      })();

      logger.success(
        `state:approve-sync chapter=${input.chapterId} replaced=${previousSnapshots.length} chapter_snapshot=${syncResult.applied.chapterSnapshot.id}`
      );

      return {
        chapterId: chapter.id,
        projectId: chapter.project_id,
        chapterSnapshotId: syncResult.applied.chapterSnapshot.id,
        replacedSnapshotCount: syncResult.replacedSnapshotCount,
        characterSnapshotCount: syncResult.applied.characterSnapshotCount,
        factionSnapshotCount: syncResult.applied.factionSnapshotCount,
        hookSnapshotCount: syncResult.applied.hookSnapshotCount,
        itemStateCount: syncResult.applied.itemStateCount
      };
    } finally {
      database.close();
    }
  }

  showState(input: ShowStateInput): StateShowResult {
    logger.start(
      input.chapterId !== undefined
        ? `state:show project=${input.projectId} chapter=${input.chapterId}`
        : `state:show project=${input.projectId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterSnapshotRepository = new ChapterStateSnapshotRepository(database);
      const characterRepository = new CharacterRepository(database);
      const characterSnapshotRepository = new CharacterStateSnapshotRepository(database);
      const factionSnapshotRepository = new FactionStateSnapshotRepository(database);
      const hookSnapshotRepository = new HookStateSnapshotRepository(database);
      const itemRepository = new ItemRepository(database);

      const chapterSnapshots =
        input.chapterId !== undefined
          ? chapterSnapshotRepository.findAllByChapterId(input.chapterId)
          : chapterSnapshotRepository.findAllByProjectId(input.projectId);
      const characterSnapshots =
        input.chapterId !== undefined
          ? characterSnapshotRepository.findAllByChapterId(input.chapterId)
          : characterSnapshotRepository.findAllByProjectId(input.projectId);
      const factionSnapshots =
        input.chapterId !== undefined
          ? factionSnapshotRepository.findAllByChapterId(input.chapterId)
          : factionSnapshotRepository.findAllByProjectId(input.projectId);
      const hookSnapshots =
        input.chapterId !== undefined
          ? hookSnapshotRepository.findAllByChapterId(input.chapterId)
          : hookSnapshotRepository.findAllByProjectId(input.projectId);
      const items = itemRepository.findAllByProjectId(input.projectId);
      const characters = characterRepository.findAllByProjectId(input.projectId);
      const itemStates = this.extractItemStatesFromChapterSnapshots(
        chapterSnapshots,
        new Map(items.map((item) => [item.id, item])),
        new Map(characters.map((character) => [character.id, character.name]))
      );

      logger.success(
        `state:show chapter_snapshots=${chapterSnapshots.length} character_snapshots=${characterSnapshots.length} faction_snapshots=${factionSnapshots.length} hook_snapshots=${hookSnapshots.length} item_states=${itemStates.length}`
      );

      return {
        chapterSnapshots,
        characterSnapshots,
        factionSnapshots,
        hookSnapshots,
        itemStates
      };
    } finally {
      database.close();
    }
  }

  // 物品状态当前采用轻量方案，直接从章节快照 raw_payload 中提取，不额外建表。
  private extractItemStatesFromChapterSnapshots(
    chapterSnapshots: ChapterStateSnapshotRecord[],
    itemRecords: Map<
      number,
      {
        name: string;
        category: string | null;
        rarity: string | null;
        status: string;
      }
    >,
    characterNames: Map<number, string>
  ): StateShowItemState[] {
    const result: StateShowItemState[] = [];

    for (const snapshot of chapterSnapshots) {
      const parsed = this.parseRawPayload(snapshot.raw_payload);
      if (!parsed || !Array.isArray(parsed.items)) {
        continue;
      }

      for (const item of parsed.items) {
        if (typeof item !== "object" || item === null || typeof item.item_id !== "number") {
          continue;
        }

        const ownerCharacterId =
          typeof item.owner_character_id === "number" ? item.owner_character_id : null;
        const itemRecord = itemRecords.get(item.item_id);

        result.push({
          chapter_snapshot_id: snapshot.id,
          chapter_id: snapshot.chapter_id,
          item_id: item.item_id,
          item_name: itemRecord?.name ?? null,
          item_category: itemRecord?.category ?? null,
          item_rarity: itemRecord?.rarity ?? null,
          item_static_status: itemRecord?.status ?? null,
          owner_character_id: ownerCharacterId,
          owner_character_name:
            ownerCharacterId !== null ? characterNames.get(ownerCharacterId) ?? null : null,
          status_summary:
            typeof item.status_summary === "string" && item.status_summary.trim().length > 0
              ? item.status_summary.trim()
              : null,
          location:
            typeof item.location === "string" && item.location.trim().length > 0
              ? item.location.trim()
              : null
        });
      }
    }

    return result;
  }

  // 状态查看不应因为历史脏数据而整体失败，因此这里对 raw_payload 使用宽松解析。
  private parseRawPayload(rawPayload: string | null): Record<string, unknown> | null {
    if (!rawPayload) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawPayload) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        return null;
      }

      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
