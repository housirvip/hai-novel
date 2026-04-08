import type Database from "better-sqlite3";
import type {
  ChapterStateSnapshotRecord,
  ExtractedChapterStatePayload
} from "../../domain/types/index.js";
import type { RuntimeContext } from "./context-service.js";
import { StateExtractionService } from "./state-extraction-service.js";
import { StateUpdateService } from "./state-update-service.js";

/**
 * 状态同步兼容层。
 * 当前保留这个服务名，避免外部调用点一次性大改；
 * 内部实际委托给更细粒度的提取服务和更新服务。
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
    const extractionService = new StateExtractionService(this.context, this.database);
    return extractionService.extractChapterState({
      projectId: input.projectId,
      chapterId: input.chapterId,
      finalText: input.finalText
    });
  }

  applyApprovedChapterState(input: {
    projectId: number;
    chapterId: number;
    draftId?: number;
    payload: ExtractedChapterStatePayload;
    rawOutput: string;
  }): {
    chapterSnapshot: ChapterStateSnapshotRecord;
    characterSnapshotCount: number;
    factionSnapshotCount: number;
    hookSnapshotCount: number;
    itemStateCount: number;
  } {
    const updateService = new StateUpdateService(this.database);
    return updateService.applyChapterState({
      projectId: input.projectId,
      chapterId: input.chapterId,
      draftId: input.draftId,
      payload: input.payload
    });
  }
}
