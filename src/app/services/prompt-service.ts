import { formatChapterContextAsText } from "../../ai/context-format.js";
import { buildChapterPlanPrompt, buildChapterPlanSystemPrompt } from "../../ai/prompts/chapter-plan-prompt.js";
import { buildDraftWritePrompt, buildDraftWriteSystemPrompt } from "../../ai/prompts/draft-write-prompt.js";
import { buildDraftFixPrompt, buildDraftFixSystemPrompt } from "../../ai/prompts/draft-fix-prompt.js";
import { createDatabase } from "../../db/client.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import type { RuntimeContext } from "./context-service.js";
import { ChapterContextBuilder } from "./chapter-context-builder.js";

export interface PromptBundle {
  /** 模板类型。 */
  template: string;
  /** 系统提示词。 */
  systemPrompt: string;
  /** 主提示词。 */
  prompt: string;
  /** 格式化后的上下文文本。 */
  contextText: string;
}

export class PromptService {
  constructor(private readonly context: RuntimeContext) {}

  buildChapterPlanPrompt(input: {
    projectId: number;
    chapterId: number;
    intent?: string;
  }): PromptBundle {
    const database = createDatabase(this.context.dbPath);
    try {
      const contextBuilder = new ChapterContextBuilder(database);
      const chapterContext = contextBuilder.build({
        projectId: input.projectId,
        chapterId: input.chapterId
      });

      return {
        template: "chapter-plan",
        systemPrompt: buildChapterPlanSystemPrompt(),
        prompt: buildChapterPlanPrompt(chapterContext, input.intent),
        contextText: formatChapterContextAsText(chapterContext)
      };
    } finally {
      database.close();
    }
  }

  buildDraftWritePrompt(input: {
    projectId: number;
    chapterId: number;
    planId?: number;
    instruction?: string;
  }): PromptBundle {
    const database = createDatabase(this.context.dbPath);
    try {
      const contextBuilder = new ChapterContextBuilder(database);
      const planRepository = new ChapterPlanRepository(database);
      const chapterContext = contextBuilder.build({
        projectId: input.projectId,
        chapterId: input.chapterId
      });
      const plan =
        input.planId !== undefined
          ? planRepository.findById(input.planId)
          : planRepository.findActiveByChapterId(input.chapterId);

      if (!plan) {
        throw new Error(`No plan found for chapter ${input.chapterId}.`);
      }

      return {
        template: "draft-write",
        systemPrompt: buildDraftWriteSystemPrompt(),
        prompt: buildDraftWritePrompt({
          context: chapterContext,
          planText: plan.plan_text,
          authorIntent: plan.author_intent,
          instruction: input.instruction
        }),
        contextText: formatChapterContextAsText(chapterContext)
      };
    } finally {
      database.close();
    }
  }

  buildDraftFixPrompt(input: {
    draftId: number;
    notes?: string;
  }): PromptBundle {
    const database = createDatabase(this.context.dbPath);
    try {
      const draftRepository = new ChapterDraftRepository(database);
      const contextBuilder = new ChapterContextBuilder(database);
      const draft = draftRepository.findById(input.draftId);
      if (!draft) {
        throw new Error(`Draft ${input.draftId} not found.`);
      }

      const chapterContext = contextBuilder.build({
        projectId: draft.project_id,
        chapterId: draft.chapter_id
      });

      return {
        template: "draft-fix",
        systemPrompt: buildDraftFixSystemPrompt(),
        prompt: buildDraftFixPrompt(
          draft.draft_text,
          [
            {
              level: "warning",
              title: "人工查看模板",
              detail: "该命令主要用于查看 fix 模板结构，真实执行时会带入运行时问题列表。"
            }
          ],
          input.notes
        ),
        contextText: formatChapterContextAsText(chapterContext)
      };
    } finally {
      database.close();
    }
  }
}
