import { formatChapterContextAsText } from "../../ai/context-format.js";
import { buildChapterPlanPrompt, buildChapterPlanSystemPrompt } from "../../ai/prompts/chapter-plan-prompt.js";
import { buildDraftWritePrompt, buildDraftWriteSystemPrompt } from "../../ai/prompts/draft-write-prompt.js";
import { buildDraftFixPrompt, buildDraftFixSystemPrompt } from "../../ai/prompts/draft-fix-prompt.js";
import { getPromptTemplateMetadata } from "../../ai/prompts/template-registry.js";
import { createDatabase } from "../../db/client.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import type { PromptBundle } from "../../domain/types/index.js";
import type { RuntimeContext } from "./context-service.js";
import { ChapterContextBuilder } from "./chapter-context-builder.js";

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
        template: getPromptTemplateMetadata("chapter-plan"),
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
      this.assertPlanBelongsToContext(plan, input.projectId, input.chapterId);

      return {
        template: getPromptTemplateMetadata("draft-write"),
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

  private assertPlanBelongsToContext(
    plan: { id: number; project_id: number; chapter_id: number },
    projectId: number,
    chapterId: number
  ): void {
    // prompt 预览也要与真实执行保持一致，避免作者看到的不是当前章节真实会用到的 plan。
    if (plan.project_id !== projectId) {
      throw new Error(`Plan ${plan.id} does not belong to project ${projectId}.`);
    }

    if (plan.chapter_id !== chapterId) {
      throw new Error(`Plan ${plan.id} does not belong to chapter ${chapterId}.`);
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
        template: getPromptTemplateMetadata("draft-fix"),
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
