import { createDatabase } from "../../db/client.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import type { ShowStateInput, StateShowResult } from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

/**
 * 状态快照查询服务。
 * 当前先提供最小查看能力，方便确认 approve 后的快照是否成功写入。
 */
export class StateService {
  constructor(private readonly context: RuntimeContext) {}

  showState(input: ShowStateInput): StateShowResult {
    logger.start(
      input.chapterId !== undefined
        ? `state:show project=${input.projectId} chapter=${input.chapterId}`
        : `state:show project=${input.projectId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterSnapshotRepository = new ChapterStateSnapshotRepository(database);
      const characterSnapshotRepository = new CharacterStateSnapshotRepository(database);
      const factionSnapshotRepository = new FactionStateSnapshotRepository(database);
      const hookSnapshotRepository = new HookStateSnapshotRepository(database);

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

      logger.success(
        `state:show chapter_snapshots=${chapterSnapshots.length} character_snapshots=${characterSnapshots.length} faction_snapshots=${factionSnapshots.length} hook_snapshots=${hookSnapshots.length}`
      );

      return {
        chapterSnapshots,
        characterSnapshots,
        factionSnapshots,
        hookSnapshots
      };
    } finally {
      database.close();
    }
  }
}
