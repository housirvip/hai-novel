import { createDatabase } from "../../db/client.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { GenerationRunRepository } from "../../db/repositories/generation-run-repository.js";
import type {
  ChapterGenerationContext,
  DraftReviewIssue,
  DraftReviewResult,
  DraftWriteResult,
  ReviewDraftInput,
  WriteDraftInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import { MockProvider } from "../../ai/mock-provider.js";
import {
  ChapterContextBuilder,
  formatChapterContextAsText
} from "./chapter-context-builder.js";
import type { RuntimeContext } from "./context-service.js";
import { ChapterService } from "./chapter-service.js";

export class DraftService {
  constructor(private readonly context: RuntimeContext) {}

  async writeDraft(input: WriteDraftInput): Promise<DraftWriteResult> {
    logger.start(`draft:write project=${input.projectId} chapter=${input.chapterId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const planRepository = new ChapterPlanRepository(database);
      const draftRepository = new ChapterDraftRepository(database);
      const runRepository = new GenerationRunRepository(database);
      const contextBuilder = new ChapterContextBuilder(database);

      logger.progress("draft:write 1/5 构建统一上下文");
      const chapterContext = contextBuilder.build({
        projectId: input.projectId,
        chapterId: input.chapterId
      });

      logger.progress("draft:write 2/5 读取有效规划");
      const plan =
        input.planId !== undefined
          ? planRepository.findById(input.planId)
          : planRepository.findActiveByChapterId(input.chapterId);

      if (!plan) {
        throw new Error(`No plan found for chapter ${input.chapterId}. Run \`novel chapter plan\` first.`);
      }

      logger.progress("draft:write 3/5 组织 prompt 与任务要求");
      const prompt = this.buildDraftPrompt({
        context: chapterContext,
        planText: plan.plan_text,
        authorIntent: plan.author_intent,
        instruction: input.instruction
      });

      const contextText = formatChapterContextAsText(chapterContext);

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
        inputContext: JSON.stringify(chapterContext, null, 2),
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

  async reviewDraft(input: ReviewDraftInput): Promise<DraftReviewResult> {
    logger.start(`draft:review action=${input.action} draft=${input.draftId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const draftRepository = new ChapterDraftRepository(database);
      const chapterRepository = new ChapterRepository(database);
      const runRepository = new GenerationRunRepository(database);

      const draft = draftRepository.findById(input.draftId);
      if (!draft) {
        throw new Error(`Draft ${input.draftId} not found.`);
      }

      const chapter = chapterRepository.findDetailById(draft.chapter_id);
      if (!chapter) {
        throw new Error(`Chapter ${draft.chapter_id} not found for draft ${input.draftId}.`);
      }

      if (input.action === "check") {
        logger.progress("draft:review 1/2 执行规则检查");
        const issues = this.reviewIssues(draft.draft_text);
        const reviewReport = this.serializeIssues(issues);
        const updatedDraft = draftRepository.updateReview(input.draftId, {
          status: "checked",
          reviewNotes: input.notes ?? null,
          reviewReport
        });

        logger.progress("draft:review 2/2 写入生成记录");
        const run = runRepository.create({
          projectId: draft.project_id,
          chapterId: draft.chapter_id,
          runType: "draft_review_check",
          inputContext: draft.draft_text,
          outputText: reviewReport,
          model: "rule-reviewer-v1",
          status: "success"
        });

        logger.success(
          `draft:review action=check draft=${input.draftId} issues=${issues.length}`
        );

        return {
          action: input.action,
          draft: updatedDraft,
          issues,
          generationRunId: run.id
        };
      }

      if (input.action === "fix") {
        logger.progress("draft:review 1/3 执行规则检查");
        const issues = this.reviewIssues(draft.draft_text);
        const fixedText = this.fixDraftText(draft.draft_text, issues, input.notes);
        const reviewReport = this.serializeIssues(issues);

        logger.progress("draft:review 2/3 写回草稿");
        const updatedDraft = draftRepository.updateReview(input.draftId, {
          status: "generated",
          draftText: fixedText,
          reviewNotes: input.notes ?? draft.review_notes,
          reviewReport
        });

        const run = runRepository.create({
          projectId: draft.project_id,
          chapterId: draft.chapter_id,
          runType: "draft_review_fix",
          inputContext: draft.draft_text,
          outputText: fixedText,
          model: "rule-reviewer-v1",
          status: "success"
        });

        logger.progress("draft:review 3/3 重新导出 Draft Markdown");
        const chapterService = new ChapterService(this.context);
        const exportResult = await chapterService.exportChapter({
          chapterId: draft.chapter_id,
          source: "draft"
        });

        logger.success(
          `draft:review action=fix draft=${input.draftId} export=${exportResult.exportPath}`
        );

        return {
          action: input.action,
          draft: updatedDraft,
          issues,
          generationRunId: run.id,
          exportPath: exportResult.exportPath
        };
      }

      logger.progress("draft:review 1/3 读取草稿并生成检查报告");
      const issues = this.reviewIssues(draft.draft_text);
      const reviewReport = this.serializeIssues(issues);

      logger.progress("draft:review 2/3 批准草稿并同步 final");
      const approvedDraft = draftRepository.updateReview(input.draftId, {
        status: "approved",
        reviewNotes: input.notes ?? draft.review_notes,
        reviewReport
      });
      chapterRepository.approveDraft(draft.chapter_id, draft.id, approvedDraft.draft_text);

      const run = runRepository.create({
        projectId: draft.project_id,
        chapterId: draft.chapter_id,
        runType: "draft_review_approve",
        inputContext: approvedDraft.draft_text,
        outputText: reviewReport,
        model: "rule-reviewer-v1",
        status: "success"
      });

      logger.progress("draft:review 3/3 导出 Final Markdown");
      const chapterService = new ChapterService(this.context);
      const exportResult = await chapterService.exportChapter({
        chapterId: draft.chapter_id,
        source: "final"
      });

      logger.success(
        `draft:review action=approve draft=${input.draftId} export=${exportResult.exportPath}`
      );

      return {
        action: input.action,
        draft: approvedDraft,
        issues,
        generationRunId: run.id,
        exportPath: exportResult.exportPath
      };
    } finally {
      database.close();
    }
  }

  dropDraft(draftId: number): void {
    logger.start(`draft:drop draft=${draftId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const draftRepository = new ChapterDraftRepository(database);
      draftRepository.updateReview(draftId, {
        status: "dropped"
      });
      logger.success(`draft:drop draft=${draftId}`);
    } finally {
      database.close();
    }
  }

  private buildDraftPrompt(input: {
    context: ChapterGenerationContext;
    planText: string;
    authorIntent: string | null;
    instruction?: string;
  }): string {
    const hookSection =
      input.context.hook_links.length > 0
        ? input.context.hook_links
            .map(
              (hook, index) =>
                `${index + 1}. ${hook.hook_title} / ${hook.link_type}${
                  hook.planned_note ? ` / ${hook.planned_note}` : ""
                }`
            )
            .join("\n")
        : "无";

    return [
      `项目：${input.context.project.name}`,
      `章节：${input.context.chapter.title}`,
      `章节摘要：${input.context.chapter.summary ?? "未设置"}`,
      `作者意图：${input.authorIntent ?? "未提供"}`,
      `额外指令：${input.instruction ?? "未提供"}`,
      "",
      "请基于以下 plan 生成章节草稿：",
      input.planText,
      "",
      "本章已绑定钩子：",
      hookSection
    ].join("\n");
  }

  private reviewIssues(draftText: string): DraftReviewIssue[] {
    const issues: DraftReviewIssue[] = [];
    const trimmedText = draftText.trim();

    // V1 先用一组明确、可解释的规则做静态检查，保证 check 结果稳定可复现。
    if (trimmedText.length < 300) {
      issues.push({
        level: "error",
        title: "篇幅过短",
        detail: "当前草稿内容过少，尚不足以支撑完整章节展开。"
      });
    }

    if (draftText.includes("Mock 输出")) {
      issues.push({
        level: "error",
        title: "存在生成器占位文本",
        detail: "正文中残留了 Mock 输出标记，不能直接作为正式文稿。"
      });
    }

    if (draftText.includes("以下为本次生成参考上下文")) {
      issues.push({
        level: "error",
        title: "上下文泄露到正文",
        detail: "草稿把生成参考上下文直接写进了正文，需要清理。"
      });
    }

    if (/[A-Za-z]{4,}/.test(draftText)) {
      issues.push({
        level: "warning",
        title: "存在明显英文残留",
        detail: "草稿中混入了英文表达，可能破坏当前中文叙事的文风一致性。"
      });
    }

    if (!/[。！？]/.test(draftText)) {
      issues.push({
        level: "warning",
        title: "叙述停顿不足",
        detail: "正文缺少足够的中文句读，阅读节奏可能会显得生硬。"
      });
    }

    if (!/[“”]/.test(draftText)) {
      issues.push({
        level: "warning",
        title: "对白表现偏弱",
        detail: "当前草稿没有明显对白，人物互动可能还不够鲜活。"
      });
    }

    if (issues.length === 0) {
      issues.push({
        level: "warning",
        title: "未发现阻塞问题",
        detail: "当前草稿未检出明显硬伤，但仍建议人工通读确认节奏与风格。"
      });
    }

    return issues;
  }

  private serializeIssues(issues: DraftReviewIssue[]): string {
    return JSON.stringify(issues, null, 2);
  }

  private fixDraftText(
    draftText: string,
    issues: DraftReviewIssue[],
    notes?: string
  ): string {
    let fixedText = draftText
      .replace(/^【.*Mock 输出.*】\n*/m, "")
      .replace(/\n*以下为本次生成参考上下文：[\s\S]*$/m, "")
      .trim();

    // 对 V1 常见问题做规则化修补，保证 fix 动作立即可用。
    if (issues.some((issue) => issue.title === "存在明显英文残留")) {
      fixedText = fixedText.replace(/\btension\b/gi, "紧张感");
    }

    if (!/[“”]/.test(fixedText)) {
      fixedText = [
        fixedText,
        "",
        "“今夜的山门，不像是在迎新。”林渡压低声音，指尖在冰冷的玉佩边缘停了一瞬。",
        "夜色里没有人回答他，可那份突如其来的安静，反而让怀疑比雨意更早落进心里。"
      ].join("\n");
    }

    if (notes) {
      fixedText = [
        fixedText,
        "",
        `【修订备注吸收】${notes}`
      ].join("\n");
    }

    return fixedText.trim();
  }
}
