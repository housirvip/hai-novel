import { createDatabase } from "../../db/client.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionRepository } from "../../db/repositories/faction-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import { ItemRepository } from "../../db/repositories/item-repository.js";
import { StoryHookRepository } from "../../db/repositories/story-hook-repository.js";
import type {
  ApproveSyncChapterInput,
  ApproveSyncChapterResult,
  ChapterStatePreviewResult,
  ChapterStateSnapshotRecord,
  PreviewChapterStateInput,
  ShowStateInput,
  StateShowCharacterState,
  StateShowFactionState,
  StateShowHookState,
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
        const latestAnyDraft = draftRepository.findLatestAnyStatusByChapterId(input.chapterId);
        if (latestAnyDraft?.status === "dropped") {
          throw new Error(
            `No draft found for chapter ${input.chapterId}. Latest draft was dropped. Run \`novel draft write\` first or pass \`--draft <id>\` explicitly.`
          );
        }
        throw new Error(`No draft found for chapter ${input.chapterId}. Run \`novel draft write\` first.`);
      }

      const extractionService = new StateExtractionService(this.context, database);
      const extracted = await extractionService.extractChapterState({
        projectId: chapter.project_id,
        chapterId: chapter.id,
        finalText: sourceText
      });

      logger.success(
        `state:chapter-preview chapter=${input.chapterId} source=${sourceType} characters=${extracted.payload.characters.length} factions=${extracted.payload.factions.length} hooks=${extracted.payload.hooks.length} character_relations=${extracted.payload.character_relations.length} character_faction_relations=${extracted.payload.character_faction_relations.length} items=${extracted.payload.items.length}`
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
        characterRelationCount: syncResult.applied.characterRelationCount,
        characterFactionRelationCount: syncResult.applied.characterFactionRelationCount,
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
      const chapterRepository = new ChapterRepository(database);
      const characterRepository = new CharacterRepository(database);
      const characterSnapshotRepository = new CharacterStateSnapshotRepository(database);
      const factionRepository = new FactionRepository(database);
      const factionSnapshotRepository = new FactionStateSnapshotRepository(database);
      const hookRepository = new StoryHookRepository(database);
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
      const chapterTitles = this.buildChapterTitleMap(chapterSnapshots, chapterRepository);
      const itemStates = this.extractItemStatesFromChapterSnapshots(
        chapterSnapshots,
        chapterTitles,
        new Map(items.map((item) => [item.id, item])),
        new Map(characters.map((character) => [character.id, character.name]))
      );
      const latestCharacterStates = this.extractLatestCharacterStates(
        characterSnapshots,
        chapterTitles,
        new Map(characters.map((character) => [character.id, character.name]))
      );
      const latestFactionStates = this.extractLatestFactionStates(
        factionSnapshots,
        chapterTitles,
        new Map(factionRepository.findAllByProjectId(input.projectId).map((faction) => [faction.id, faction.name]))
      );
      const latestHookStates = this.extractLatestHookStates(
        hookSnapshots,
        chapterTitles,
        new Map(hookRepository.findAllByProjectId(input.projectId).map((hook) => [hook.id, hook.title]))
      );
      const latestItemStates = this.extractLatestItemStates(itemStates);

      logger.success(
        `state:show chapter_snapshots=${chapterSnapshots.length} character_snapshots=${characterSnapshots.length} faction_snapshots=${factionSnapshots.length} hook_snapshots=${hookSnapshots.length} item_states=${itemStates.length} latest_character_states=${latestCharacterStates.length} latest_faction_states=${latestFactionStates.length} latest_hook_states=${latestHookStates.length} latest_item_states=${latestItemStates.length}`
      );

      return {
        chapterSnapshots,
        chapterTitles,
        characterSnapshots,
        latestCharacterStates,
        factionSnapshots,
        latestFactionStates,
        hookSnapshots,
        latestHookStates,
        itemStates,
        latestItemStates
      };
    } finally {
      database.close();
    }
  }

  // 物品状态当前采用轻量方案，直接从章节快照 raw_payload 中提取，不额外建表。
  private extractItemStatesFromChapterSnapshots(
    chapterSnapshots: ChapterStateSnapshotRecord[],
    chapterTitles: Record<number, string>,
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
          chapter_title: chapterTitles[snapshot.chapter_id] ?? null,
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

  /**
   * 为展示层补一份章节标题映射。
   * 状态快照表本身只存章节 ID，而作者在 CLI 中通常更想直接看到章节标题。
   */
  private buildChapterTitleMap(
    chapterSnapshots: ChapterStateSnapshotRecord[],
    chapterRepository: ChapterRepository
  ): Record<number, string> {
    const titles: Record<number, string> = {};
    const chapterIds = Array.from(new Set(chapterSnapshots.map((snapshot) => snapshot.chapter_id)));

    for (const chapterId of chapterIds) {
      const chapter = chapterRepository.findById(chapterId);
      if (chapter) {
        titles[chapterId] = chapter.title;
      }
    }

    return titles;
  }

  /**
   * 章节快照默认按最新在前返回，因此这里取“每个 item_id 第一次出现”的记录，
   * 就能得到这个物品当前最新一次正式同步出来的状态。
   */
  private extractLatestItemStates(itemStates: StateShowItemState[]): StateShowItemState[] {
    const latestByItemId = new Map<number, StateShowItemState>();

    for (const itemState of itemStates) {
      if (!latestByItemId.has(itemState.item_id)) {
        latestByItemId.set(itemState.item_id, itemState);
      }
    }

    return Array.from(latestByItemId.values()).sort((left, right) => left.item_id - right.item_id);
  }

  /**
   * 快照仓储已经按 `id DESC` 返回，因此遍历时首次命中的记录就是角色当前最新正式状态。
   */
  private extractLatestCharacterStates(
    characterSnapshots: ReturnType<CharacterStateSnapshotRepository["findAllByProjectId"]>,
    chapterTitles: Record<number, string>,
    characterNames: Map<number, string>
  ): StateShowCharacterState[] {
    const latestByCharacterId = new Map<number, StateShowCharacterState>();

    for (const snapshot of characterSnapshots) {
      if (latestByCharacterId.has(snapshot.character_id)) {
        continue;
      }

      latestByCharacterId.set(snapshot.character_id, {
        character_id: snapshot.character_id,
        character_name: characterNames.get(snapshot.character_id) ?? null,
        chapter_id: snapshot.chapter_id,
        chapter_title: chapterTitles[snapshot.chapter_id] ?? null,
        chapter_snapshot_id: snapshot.chapter_snapshot_id,
        status_summary: snapshot.status_summary,
        location: snapshot.location,
        goal: snapshot.goal,
        public_impression: snapshot.public_impression,
        internal_state: snapshot.internal_state
      });
    }

    return Array.from(latestByCharacterId.values()).sort(
      (left, right) => left.character_id - right.character_id
    );
  }

  /**
   * 势力和人物一样，项目级展示只关心“当前最近一次正式状态”，因此按势力 ID 去重即可。
   */
  private extractLatestFactionStates(
    factionSnapshots: ReturnType<FactionStateSnapshotRepository["findAllByProjectId"]>,
    chapterTitles: Record<number, string>,
    factionNames: Map<number, string>
  ): StateShowFactionState[] {
    const latestByFactionId = new Map<number, StateShowFactionState>();

    for (const snapshot of factionSnapshots) {
      if (latestByFactionId.has(snapshot.faction_id)) {
        continue;
      }

      latestByFactionId.set(snapshot.faction_id, {
        faction_id: snapshot.faction_id,
        faction_name: factionNames.get(snapshot.faction_id) ?? null,
        chapter_id: snapshot.chapter_id,
        chapter_title: chapterTitles[snapshot.chapter_id] ?? null,
        chapter_snapshot_id: snapshot.chapter_snapshot_id,
        status_summary: snapshot.status_summary,
        power_shift: snapshot.power_shift,
        external_relation_summary: snapshot.external_relation_summary
      });
    }

    return Array.from(latestByFactionId.values()).sort((left, right) => left.faction_id - right.faction_id);
  }

  /**
   * 钩子项目级面板展示的是“目前推进到哪里”，因此同样取每个钩子的最新正式状态。
   */
  private extractLatestHookStates(
    hookSnapshots: ReturnType<HookStateSnapshotRepository["findAllByProjectId"]>,
    chapterTitles: Record<number, string>,
    hookTitles: Map<number, string>
  ): StateShowHookState[] {
    const latestByHookId = new Map<number, StateShowHookState>();

    for (const snapshot of hookSnapshots) {
      if (latestByHookId.has(snapshot.hook_id)) {
        continue;
      }

      latestByHookId.set(snapshot.hook_id, {
        hook_id: snapshot.hook_id,
        hook_title: hookTitles.get(snapshot.hook_id) ?? null,
        chapter_id: snapshot.chapter_id,
        chapter_title: chapterTitles[snapshot.chapter_id] ?? null,
        chapter_snapshot_id: snapshot.chapter_snapshot_id,
        progress_status: snapshot.progress_status,
        progress_note: snapshot.progress_note
      });
    }

    return Array.from(latestByHookId.values()).sort((left, right) => left.hook_id - right.hook_id);
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
