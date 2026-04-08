import path from "node:path";
import { writeFile } from "node:fs/promises";
import { formatChapterContextAsText } from "../../ai/context-format.js";
import {
  buildChapterPlanPrompt,
  buildChapterPlanSystemPrompt,
  buildLocalChapterPlanText
} from "../../ai/prompts/chapter-plan-prompt.js";
import { getPromptTemplateMetadata } from "../../ai/prompts/template-registry.js";
import { createAIProvider, resolveAISettings } from "../../ai/provider-factory.js";
import { runtimeEnv } from "../../config/runtime-env.js";
import { createDatabase } from "../../db/client.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { GenerationRunRepository } from "../../db/repositories/generation-run-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import { ProjectRepository } from "../../db/repositories/project-repository.js";
import type {
  ChapterDraftRecord,
  ChapterRecord,
  ChapterExportResult,
  ChapterExportSource,
  ChapterGenerationContext,
  ChapterPlanGenerationResult,
  ChapterPlanRecord,
  ChapterShowResult,
  CreateChapterInput,
  ExportChapterInput,
  GenerateChapterPlanInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import { ensureDir } from "../../utils/paths.js";
import { ChapterContextBuilder } from "./chapter-context-builder.js";
import { relativeToAppRoot, type RuntimeContext } from "./context-service.js";

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

  async generatePlan(
    input: GenerateChapterPlanInput
  ): Promise<ChapterPlanGenerationResult> {
    logger.start(`chapter:plan project=${input.projectId} chapter=${input.chapterId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const planRepository = new ChapterPlanRepository(database);
      const runRepository = new GenerationRunRepository(database);
      const contextBuilder = new ChapterContextBuilder(database);

      logger.progress("chapter:plan 1/6 构建统一上下文");
      const chapterContext = contextBuilder.build({
        projectId: input.projectId,
        chapterId: input.chapterId
      });

      logger.progress("chapter:plan 2/6 生成规划正文");
      const sourceType = this.resolvePlanSourceType(
        input.intent,
        chapterContext.outline_chain.length > 0
      );
      const templateMetadata = getPromptTemplateMetadata("chapter-plan");
      const generatedPlan = await this.generatePlanText(chapterContext, input.intent);

      const plan = planRepository.createActive({
        projectId: input.projectId,
        chapterId: input.chapterId,
        sourceType,
        authorIntent: input.intent,
        planText: generatedPlan.text
      });

      logger.progress("chapter:plan 3/6 写入生成记录");
      const run = runRepository.create({
        projectId: input.projectId,
        chapterId: input.chapterId,
        runType: "chapter_plan",
        templateKey: templateMetadata.key,
        templateLabel: templateMetadata.name,
        templateVersion: templateMetadata.version,
        templateSummary: templateMetadata.summary,
        inputContext: JSON.stringify(chapterContext, null, 2),
        promptText: generatedPlan.prompt,
        outputText: generatedPlan.text,
        model: generatedPlan.model,
        status: "success"
      });

      logger.progress("chapter:plan 4/6 导出 Markdown");
      const exportResult = await this.exportFromLoadedData({
        chapter: chapterContext.chapter,
        project: chapterContext.project,
        source: "plan",
        planText: plan.plan_text,
        planMeta: plan
      });
      const exportedPlan = planRepository.markExported(
        plan.id,
        relativeToAppRoot(this.context.appRoot, exportResult.exportPath)
      );

      logger.success(
        `chapter:plan chapter=${input.chapterId} plan=${plan.id} export=${relativeToAppRoot(
          this.context.appRoot,
          exportResult.exportPath
        )}`
      );

      return {
        plan: exportedPlan,
        generationRunId: run.id,
        exportPath: exportResult.exportPath
      };
    } finally {
      database.close();
    }
  }

  async exportChapter(input: ExportChapterInput): Promise<ChapterExportResult> {
    logger.start(`chapter:export chapter=${input.chapterId} source=${input.source}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const planRepository = new ChapterPlanRepository(database);
      const draftRepository = new ChapterDraftRepository(database);
      const projectRepository = new ProjectRepository(database);

      const chapter = chapterRepository.findDetailById(input.chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${input.chapterId} not found.`);
      }

      const project = projectRepository.findById(chapter.project_id);
      if (!project) {
        throw new Error(`Project ${chapter.project_id} not found.`);
      }

      let planText: string | undefined;
      let planMeta;
      let draftText: string | undefined;
      let draftMeta;
      let finalText: string | undefined;

      if (input.source === "plan") {
        planMeta = planRepository.findActiveByChapterId(input.chapterId);
        if (!planMeta) {
          throw new Error(`No active plan found for chapter ${input.chapterId}.`);
        }
        planText = planMeta.plan_text;
      }

      if (input.source === "draft") {
        draftMeta =
          input.draftId !== undefined
            ? draftRepository.findById(input.draftId)
            : draftRepository.findLatestByChapterId(input.chapterId);
        if (!draftMeta) {
          throw new Error(`No draft found for chapter ${input.chapterId}.`);
        }
        if (draftMeta.chapter_id !== input.chapterId) {
          throw new Error(`Draft ${draftMeta.id} does not belong to chapter ${input.chapterId}.`);
        }
        draftText = draftMeta.draft_text;
      }

      if (input.source === "final") {
        if (!chapter.final_text) {
          throw new Error(`No final text found for chapter ${input.chapterId}.`);
        }
        finalText = chapter.final_text;
      }

      const result = await this.exportFromLoadedData({
        chapter,
        project,
        source: input.source,
        planText,
        planMeta,
        draftText,
        draftMeta,
        finalText
      });

      if (input.source === "plan" && planMeta) {
        planRepository.markExported(
          planMeta.id,
          relativeToAppRoot(this.context.appRoot, result.exportPath)
        );
      }

      if (input.source === "draft" && draftMeta) {
        draftRepository.markExported(
          draftMeta.id,
          relativeToAppRoot(this.context.appRoot, result.exportPath)
        );
      }

      logger.success(
        `chapter:export chapter=${input.chapterId} source=${input.source} file=${relativeToAppRoot(
          this.context.appRoot,
          result.exportPath
        )}`
      );

      return result;
    } finally {
      database.close();
    }
  }

  private resolvePlanSourceType(intent: string | undefined, hasOutlineContext: boolean): string {
    if (intent && hasOutlineContext) {
      return "outline_with_intent";
    }

    if (intent) {
      return "author_intent";
    }

    return "outline_only";
  }

  private async generatePlanText(
    context: ChapterGenerationContext,
    intent: string | undefined
  ): Promise<{ text: string; model: string; prompt: string }> {
    const prompt = this.buildPlanPrompt(context, intent);
    const settings = resolveAISettings(this.context);

    // 默认仍走本地规划器，只有显式配置为真实 provider 时才切模型，保证本地开发体验稳定。
    if (settings.provider === "mock") {
      return {
        text: buildLocalChapterPlanText(context, intent),
        model: "rule-planner-v1",
        prompt
      };
    }

    const provider = createAIProvider(this.context);
    const result = await provider.generateText({
      taskType: "chapter_plan",
      systemPrompt: buildChapterPlanSystemPrompt(),
      prompt,
      contextText: formatChapterContextAsText(context),
      // 规划类任务通常既要有一定发散性，也要控制结构稳定，因此开放为环境变量调优。
      temperature: runtimeEnv.ai.chapterPlan.temperature,
      maxOutputTokens: runtimeEnv.ai.chapterPlan.maxOutputTokens
    });

    return {
      text: result.text,
      model: result.model,
      prompt
    };
  }

  private buildPlanPrompt(
    context: ChapterGenerationContext,
    intent: string | undefined
  ): string {
    return buildChapterPlanPrompt(context, intent);
  }

  private async exportFromLoadedData(input: {
    chapter: {
      id: number;
      project_id: number;
      title: string;
      summary: string | null;
      outline_title?: string | null;
      final_text?: string | null;
    };
    project: { name: string };
    source: ChapterExportSource;
    planText?: string;
    planMeta?: ChapterPlanRecord;
    draftText?: string;
    draftMeta?: ChapterDraftRecord;
    finalText?: string;
  }): Promise<ChapterExportResult> {
    const markdown = this.renderChapterMarkdown(input);
    const exportPath = path.join(
      this.context.exportsDir,
      `chapter-${String(input.chapter.id).padStart(3, "0")}-${input.source}.md`
    );

    await ensureDir(this.context.exportsDir);
    await writeFile(exportPath, markdown, "utf8");

    return {
      source: input.source,
      exportPath,
      markdown
    };
  }

  private renderChapterMarkdown(input: {
    chapter: {
      id: number;
      project_id: number;
      title: string;
      summary: string | null;
      outline_title?: string | null;
    };
    project: { name: string };
    source: ChapterExportSource;
    planText?: string;
    planMeta?: ChapterPlanRecord;
    draftText?: string;
    draftMeta?: ChapterDraftRecord;
    finalText?: string;
  }): string {
    if (input.source === "plan") {
      if (!input.planText || !input.planMeta) {
        throw new Error("Plan export requires plan content.");
      }

      return [
        this.buildMarkdownFrontmatter({
          entityType: "chapter_plan",
          entityId: input.planMeta.id,
          projectId: input.chapter.project_id,
          chapterId: input.chapter.id,
          sourceVersion: input.planMeta.source_version
        }),
        `# ${input.chapter.title} Plan`,
        "",
        `- 项目：${input.project.name}`,
        `- 项目 ID：${input.chapter.project_id}`,
        `- 章节 ID：${input.chapter.id}`,
        `- Plan ID：${input.planMeta.id}`,
        `- 来源：${input.planMeta.source_type}`,
        `- 状态：${input.planMeta.status}`,
        `- 关联大纲：${input.chapter.outline_title ?? "未关联"}`,
        "",
        "## 章节摘要",
        input.chapter.summary ?? "未设置",
        "",
        "## 作者意图",
        input.planMeta.author_intent ?? "未提供",
        "",
        "## 规划正文",
        input.planText,
        ""
      ].join("\n");
    }

    if (input.source === "draft") {
      if (!input.draftText || !input.draftMeta) {
        throw new Error("Draft export requires draft content.");
      }

      return [
        this.buildMarkdownFrontmatter({
          entityType: "chapter_draft",
          entityId: input.draftMeta.id,
          projectId: input.chapter.project_id,
          chapterId: input.chapter.id,
          sourceVersion: input.draftMeta.source_version
        }),
        `# ${input.chapter.title} Draft`,
        "",
        `- 项目：${input.project.name}`,
        `- 项目 ID：${input.chapter.project_id}`,
        `- 章节 ID：${input.chapter.id}`,
        `- Draft ID：${input.draftMeta.id}`,
        `- 状态：${input.draftMeta.status}`,
        `- 来源 Plan：${input.draftMeta.plan_id ?? "未关联"}`,
        "",
        "## 章节摘要",
        input.chapter.summary ?? "未设置",
        "",
        "## 草稿正文",
        input.draftText,
        ""
      ].join("\n");
    }

    if (!input.finalText) {
      throw new Error("Final export requires final text.");
    }

    return [
      `# ${input.chapter.title} Final`,
      "",
      `- 项目：${input.project.name}`,
      `- 项目 ID：${input.chapter.project_id}`,
      `- 章节 ID：${input.chapter.id}`,
      `- 关联大纲：${input.chapter.outline_title ?? "未关联"}`,
      "",
      "## 章节摘要",
      input.chapter.summary ?? "未设置",
      "",
      "## 正式文稿",
      input.finalText,
      ""
    ].join("\n");
  }

  private buildMarkdownFrontmatter(input: {
    entityType: "chapter_plan" | "chapter_draft";
    entityId: number;
    projectId: number;
    chapterId: number;
    sourceVersion: number;
  }): string {
    return [
      "---",
      `entity_type: ${input.entityType}`,
      `entity_id: ${input.entityId}`,
      `chapter_id: ${input.chapterId}`,
      `project_id: ${input.projectId}`,
      `source_version: ${input.sourceVersion}`,
      `exported_at: ${new Date().toISOString()}`,
      "---",
      ""
    ].join("\n");
  }
}
