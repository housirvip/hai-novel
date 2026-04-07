import { createDatabase } from "../../db/client.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import type {
  ChapterRecord,
  ChapterShowResult,
  CreateChapterInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class ChapterService {
  constructor(private readonly context: RuntimeContext) {}

  createChapter(input: CreateChapterInput): ChapterRecord {
    logger.start(`chapter:create project=${input.projectId} title="${input.title}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new ChapterRepository(database);
      const chapter = repository.create(input);
      logger.success(`chapter:create id=${chapter.id} title="${chapter.title}"`);
      return chapter;
    } finally {
      database.close();
    }
  }

  showChapter(chapterId: number): ChapterShowResult {
    logger.start(`chapter:show id=${chapterId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const hookLinkRepository = new HookChapterLinkRepository(database);

      const chapter = chapterRepository.findDetailById(chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${chapterId} not found.`);
      }

      const hookLinks = hookLinkRepository.findAllByChapterId(chapterId);
      logger.success(`chapter:show id=${chapterId} hooks=${hookLinks.length}`);

      return {
        chapter,
        hook_links: hookLinks
      };
    } finally {
      database.close();
    }
  }
}
