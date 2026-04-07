import { createDatabase } from "../../db/client.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { GenerationRunRepository } from "../../db/repositories/generation-run-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import { ProjectRepository } from "../../db/repositories/project-repository.js";
import type { DraftWriteResult, WriteDraftInput } from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import { MockProvider } from "../../ai/mock-provider.js";
import type { RuntimeContext } from "./context-service.js";
import { ChapterService } from "./chapter-service.js";

export class DraftService {
  constructor(private readonly context: RuntimeContext) {}

  async writeDraft(input: WriteDraftInput): Promise<DraftWriteResult> {
    logger.start(`draft:write project=${input.projectId} chapter=${input.chapterId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const projectRepository = new ProjectRepository(database);
      const chapterRepository = new ChapterRepository(database);
      const planRepository = new ChapterPlanRepository(database);
      const draftRepository = new ChapterDraftRepository(database);
      const runRepository = new GenerationRunRepository(database);
      const hookLinkRepository = new HookChapterLinkRepository(database);

      logger.progress("draft:write 1/5 读取项目与章节");
      const chapter = chapterRepository.findDetailById(input.chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${input.chapterId} not found.`);
      }

      if (chapter.project_id !== input.projectId) {
        throw new Error(
          `Chapter ${input.chapterId} does not belong to project ${input.projectId}.`
        );
      }

      const project = projectRepository.findById(input.projectId);
      if (!project) {
        throw new Error(`Project ${input.projectId} not found.`);
      }

      logger.progress("draft:write 2/5 读取有效规划");
      const plan =
        input.planId !== undefined
          ? planRepository.findById(input.planId)
          : planRepository.findActiveByChapterId(input.chapterId);

      if (!plan) {
        throw new Error(`No plan found for chapter ${input.chapterId}. Run \`novel chapter plan\` first.`);
      }

      logger.progress("draft:write 3/5 汇总钩子与额外指令");
      const hookLinks = hookLinkRepository.findAllByChapterId(input.chapterId);
      const prompt = this.buildDraftPrompt({
        projectName: project.name,
        chapterTitle: chapter.title,
        chapterSummary: chapter.summary,
        planText: plan.plan_text,
        authorIntent: plan.author_intent,
        instruction: input.instruction,
        hookLinks
      });

      const contextText = this.buildDraftContext({
        chapterTitle: chapter.title,
        chapterSummary: chapter.summary,
        outlineTitle: chapter.outline_title,
        hookLinks
      });

      logger.progress("draft:write 4/5 调用 Mock Provider 生成草稿");
      const provider = new MockProvider();
      const generated = provider.generateText({
        taskType: "chapter_draft",
        prompt,
        contextText
      });

      logger.progress("draft:write 5/5 落库并导出 Markdown");
      const draft = draftRepository.create({
        projectId: input.projectId,
        chapterId: input.chapterId,
        planId: plan.id,
        draftText: generated.text,
        status: "generated"
      });

      const run = runRepository.create({
        projectId: input.projectId,
        chapterId: input.chapterId,
        runType: "draft_write",
        promptText: prompt,
        inputContext: contextText,
        outputText: generated.text,
        model: generated.model,
        status: "success"
      });

      const chapterService = new ChapterService(this.context);
      const exportResult = await chapterService.exportChapter({
        chapterId: input.chapterId,
        source: "draft"
      });

      logger.success(
        `draft:write chapter=${input.chapterId} draft=${draft.id} export=${exportResult.exportPath}`
      );

      return {
        draft,
        generationRunId: run.id,
        exportPath: exportResult.exportPath
      };
    } finally {
      database.close();
    }
  }

  private buildDraftPrompt(input: {
    projectName: string;
    chapterTitle: string;
    chapterSummary: string | null;
    planText: string;
    authorIntent: string | null;
    instruction?: string;
    hookLinks: Array<{ hook_title: string; link_type: string; planned_note: string | null }>;
  }): string {
    return [
      `项目：${input.projectName}`,
      `章节：${input.chapterTitle}`,
      `章节摘要：${input.chapterSummary ?? "未设置"}`,
      `作者意图：${input.authorIntent ?? "未提供"}`,
      `额外指令：${input.instruction ?? "未提供"}`,
      "",
      "请基于以下 plan 生成章节草稿：",
      input.planText,
      "",
      "本章已绑定钩子：",
      input.hookLinks.length > 0
        ? input.hookLinks
            .map(
              (hook, index) =>
                `${index + 1}. ${hook.hook_title} / ${hook.link_type}${
                  hook.planned_note ? ` / ${hook.planned_note}` : ""
                }`
            )
            .join("\n")
        : "无"
    ].join("\n");
  }

  private buildDraftContext(input: {
    chapterTitle: string;
    chapterSummary: string | null;
    outlineTitle: string | null;
    hookLinks: Array<{ hook_title: string; hook_type: string; hook_status: string }>;
  }): string {
    return [
      `章节标题：${input.chapterTitle}`,
      `章节摘要：${input.chapterSummary ?? "未设置"}`,
      `关联大纲：${input.outlineTitle ?? "未关联"}`,
      `钩子概览：${
        input.hookLinks.length > 0
          ? input.hookLinks
              .map((hook) => `${hook.hook_title}（${hook.hook_type}/${hook.hook_status}）`)
              .join("，")
          : "无"
      }`
    ].join("\n");
  }
}
