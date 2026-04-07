import path from "node:path";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../../db/client.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import type {
  ChapterPlanImportResult,
  ChapterPlanShowResult,
  ImportPlanInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import { relativeToAppRoot, type RuntimeContext } from "./context-service.js";
import { MarkdownSyncService } from "./markdown-sync-service.js";

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

  async importPlan(input: ImportPlanInput): Promise<ChapterPlanImportResult> {
    logger.start(`plan:import chapter=${input.chapterId}`);

    const importPath = path.resolve(this.context.appRoot, input.inputPath);
    const markdown = await readFile(importPath, "utf8");
    const markdownSyncService = new MarkdownSyncService();
    const parsed = markdownSyncService.parseDocument(markdown);

    markdownSyncService.expectEntityType(parsed.metadata, "chapter_plan");

    const planId = markdownSyncService.requireIntegerMetadata(parsed.metadata, "entity_id");
    const chapterId = markdownSyncService.requireIntegerMetadata(parsed.metadata, "chapter_id");
    const sourceVersion = markdownSyncService.requireIntegerMetadata(
      parsed.metadata,
      "source_version"
    );

    if (chapterId !== input.chapterId) {
      throw new Error(`Plan import chapter mismatch: command=${input.chapterId}, file=${chapterId}.`);
    }

    const authorIntent = markdownSyncService.normalizeOptionalValue(
      markdownSyncService.extractSection(parsed.content, "作者意图")
    );
    const planText = markdownSyncService.extractSection(parsed.content, "规划正文");

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const planRepository = new ChapterPlanRepository(database);

      const chapter = chapterRepository.findDetailById(input.chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${input.chapterId} not found.`);
      }

      const plan = planRepository.findById(planId);
      if (!plan) {
        throw new Error(`Chapter plan ${planId} not found.`);
      }

      if (plan.chapter_id !== input.chapterId) {
        throw new Error(
          `Plan import target mismatch: chapter=${input.chapterId}, plan_chapter=${plan.chapter_id}.`
        );
      }

      const updatedPlan = planRepository.updateImportedContent({
        planId,
        planText,
        authorIntent,
        expectedSourceVersion: sourceVersion,
        force: input.force
      });

      logger.success(
        `plan:import chapter=${input.chapterId} plan=${planId} file=${relativeToAppRoot(
          this.context.appRoot,
          importPath
        )}`
      );

      return {
        plan: updatedPlan,
        importPath
      };
    } finally {
      database.close();
    }
  }
}
