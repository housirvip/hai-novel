import { createDatabase } from "../../db/client.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import { StoryHookRepository } from "../../db/repositories/story-hook-repository.js";
import type {
  CreateHookChapterLinkInput,
  CreateStoryHookInput,
  HookChapterLinkRecord,
  StoryHookDetail,
  StoryHookListItem,
  StoryHookRecord,
  UpdateStoryHookInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class HookService {
  constructor(private readonly context: RuntimeContext) {}

  createHook(input: CreateStoryHookInput): StoryHookRecord {
    logger.start(`hook:add project=${input.projectId} title="${input.title}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new StoryHookRepository(database);
      const hook = repository.create(input);
      logger.success(`hook:add id=${hook.id} title="${hook.title}"`);
      return hook;
    } finally {
      database.close();
    }
  }

  listHooks(projectId: number, status?: string): StoryHookListItem[] {
    logger.start(
      status ? `hook:list project=${projectId} status=${status}` : `hook:list project=${projectId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new StoryHookRepository(database);
      const hooks = repository.findAllByProjectId(projectId, status);
      logger.success(`hook:list count=${hooks.length}`);
      return hooks;
    } finally {
      database.close();
    }
  }

  showHook(hookId: number): StoryHookDetail {
    logger.start(`hook:show id=${hookId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const hookRepository = new StoryHookRepository(database);
      const linkRepository = new HookChapterLinkRepository(database);

      const hook = hookRepository.findListItemById(hookId);
      if (!hook) {
        throw new Error(`Story hook ${hookId} not found.`);
      }

      const chapterLinks = linkRepository.findAllByHookId(hookId);
      logger.success(`hook:show id=${hookId} links=${chapterLinks.length}`);

      return {
        hook,
        chapter_links: chapterLinks
      };
    } finally {
      database.close();
    }
  }

  bindHookToChapter(input: CreateHookChapterLinkInput): HookChapterLinkRecord {
    logger.start(
      `hook:bind project=${input.projectId} hook=${input.hookId} chapter=${input.chapterId} type=${input.linkType}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const hookRepository = new StoryHookRepository(database);
      const linkRepository = new HookChapterLinkRepository(database);

      const hook = hookRepository.findById(input.hookId);
      if (!hook) {
        throw new Error(`Story hook ${input.hookId} not found.`);
      }

      const chapter = chapterRepository.findById(input.chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${input.chapterId} not found.`);
      }

      this.assertHookBelongsToProject(hook, input.projectId);
      this.assertChapterBelongsToProject(chapter, input.projectId);

      const link = linkRepository.create(input);
      this.syncHookLifecycle(hookRepository, hook, input);

      logger.success(`hook:bind id=${link.id}`);
      return link;
    } finally {
      database.close();
    }
  }

  updateHook(input: UpdateStoryHookInput): StoryHookRecord {
    logger.start(`hook:update id=${input.hookId}`);

    if (
      input.status === undefined &&
      input.startChapterId === undefined &&
      input.targetChapterId === undefined &&
      input.endChapterId === undefined
    ) {
      throw new Error("At least one hook field must be provided for update.");
    }

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const repository = new StoryHookRepository(database);
      const existingHook = repository.findById(input.hookId);
      if (!existingHook) {
        throw new Error(`Story hook ${input.hookId} not found.`);
      }

      if (input.startChapterId !== undefined) {
        this.assertChapterIdBelongsToProject(
          chapterRepository,
          input.startChapterId,
          existingHook.project_id
        );
      }
      if (input.targetChapterId !== undefined) {
        this.assertChapterIdBelongsToProject(
          chapterRepository,
          input.targetChapterId,
          existingHook.project_id
        );
      }
      if (input.endChapterId !== undefined) {
        this.assertChapterIdBelongsToProject(
          chapterRepository,
          input.endChapterId,
          existingHook.project_id
        );
      }

      const hook = repository.update(input);
      logger.success(`hook:update id=${hook.id} status=${hook.status}`);
      return hook;
    } finally {
      database.close();
    }
  }

  private syncHookLifecycle(
    repository: StoryHookRepository,
    hook: StoryHookRecord,
    input: CreateHookChapterLinkInput
  ): void {
    // 绑定章节时顺手同步钩子生命周期，减少用户手工维护成本。
    if (input.linkType === "close") {
      repository.update({
        hookId: hook.id,
        status: "closed",
        endChapterId: input.chapterId
      });
      logger.progress(`hook:bind auto-close hook=${hook.id} endChapter=${input.chapterId}`);
      return;
    }

    if (input.linkType === "setup") {
      repository.update({
        hookId: hook.id,
        status: hook.status === "pending" ? "active" : hook.status,
        startChapterId: hook.start_chapter_id ?? input.chapterId
      });
      logger.progress(`hook:bind auto-start hook=${hook.id} startChapter=${input.chapterId}`);
      return;
    }

    if (input.linkType === "advance" || input.linkType === "reveal") {
      if (hook.status === "pending") {
        repository.update({
          hookId: hook.id,
          status: "active"
        });
        logger.progress(`hook:bind auto-activate hook=${hook.id}`);
      }
    }
  }

  private assertHookBelongsToProject(hook: StoryHookRecord, projectId: number): void {
    if (hook.project_id !== projectId) {
      throw new Error(`Hook ${hook.id} does not belong to project ${projectId}.`);
    }
  }

  private assertChapterBelongsToProject(
    chapter: { id: number; project_id: number },
    projectId: number
  ): void {
    if (chapter.project_id !== projectId) {
      throw new Error(`Chapter ${chapter.id} does not belong to project ${projectId}.`);
    }
  }

  private assertChapterIdBelongsToProject(
    repository: ChapterRepository,
    chapterId: number,
    projectId: number
  ): void {
    const chapter = repository.findById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found.`);
    }

    this.assertChapterBelongsToProject(chapter, projectId);
  }
}
