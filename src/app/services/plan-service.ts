import { createDatabase } from "../../db/client.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import type { ChapterPlanShowResult } from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class PlanService {
  constructor(private readonly context: RuntimeContext) {}

  showPlanByChapter(chapterId: number): ChapterPlanShowResult {
    logger.start(`plan:show chapter=${chapterId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const planRepository = new ChapterPlanRepository(database);
      const chapter = chapterRepository.findDetailById(chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${chapterId} not found.`);
      }

      const plan =
        planRepository.findActiveByChapterId(chapterId) ??
        planRepository.findLatestByChapterId(chapterId);
      if (!plan) {
        throw new Error(`No plan found for chapter ${chapterId}.`);
      }

      logger.success(`plan:show chapter=${chapterId} plan=${plan.id}`);
      return {
        chapter,
        plan
      };
    } finally {
      database.close();
    }
  }
}
