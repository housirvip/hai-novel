import path from "node:path";
import { writeFile } from "node:fs/promises";
import { createDatabase } from "../../db/client.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterPlanRepository } from "../../db/repositories/chapter-plan-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { FactionRepository } from "../../db/repositories/faction-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import { LoreRepository } from "../../db/repositories/lore-repository.js";
import { OutlineRepository } from "../../db/repositories/outline-repository.js";
import { ProjectRepository } from "../../db/repositories/project-repository.js";
import { StoryHookRepository } from "../../db/repositories/story-hook-repository.js";
import type {
  ChapterRecord,
  ChapterExportResult,
  ChapterExportSource,
  ChapterPlanGenerationResult,
  ChapterShowResult,
  CreateChapterInput,
  ExportChapterInput,
  GenerateChapterPlanInput,
  OutlineRecord
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import { ensureDir } from "../../utils/paths.js";
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
      const chapterRepository = new ChapterRepository(database);
      const projectRepository = new ProjectRepository(database);
      const outlineRepository = new OutlineRepository(database);
      const characterRepository = new CharacterRepository(database);
      const factionRepository = new FactionRepository(database);
      const loreRepository = new LoreRepository(database);
      const hookRepository = new StoryHookRepository(database);
      const hookLinkRepository = new HookChapterLinkRepository(database);
      const planRepository = new ChapterPlanRepository(database);

      logger.progress("chapter:plan 1/6 读取章节与项目信息");
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

      logger.progress("chapter:plan 2/6 整理大纲上下文");
      const outlineChain = this.resolveOutlineChain(outlineRepository, chapter.outline_id);
      const rootOutlines =
        outlineChain.length > 0
          ? []
          : outlineRepository.findAllByProjectId(input.projectId).filter((item) => item.parent_id === null);

      logger.progress("chapter:plan 3/6 汇总人物与势力");
      const characters = characterRepository.findAllByProjectId(input.projectId);
      const factions = factionRepository.findAllByProjectId(input.projectId);
      const loreEntries = loreRepository.findAllByProjectId(input.projectId);

      logger.progress("chapter:plan 4/6 汇总钩子线索");
      const chapterHookLinks = hookLinkRepository.findAllByChapterId(input.chapterId);
      const targetHooks = hookRepository
        .findAllByProjectId(input.projectId)
        .filter((hook) => hook.target_chapter_id === input.chapterId);

      logger.progress("chapter:plan 5/6 生成规划正文");
      const sourceType = this.resolvePlanSourceType(input.intent, outlineChain.length > 0);
      const planText = this.buildPlanText({
        project,
        chapter,
        outlineChain,
        rootOutlines,
        characters,
        factions,
        loreEntries,
        chapterHookLinks,
        targetHooks,
        intent: input.intent
      });

      const plan = planRepository.createActive({
        projectId: input.projectId,
        chapterId: input.chapterId,
        sourceType,
        authorIntent: input.intent,
        planText
      });

      logger.progress("chapter:plan 6/6 导出 Markdown");
      const exportResult = await this.exportFromLoadedData({
        chapter,
        project,
        source: "plan",
        planText: plan.plan_text,
        planMeta: plan
      });

      logger.success(
        `chapter:plan chapter=${input.chapterId} plan=${plan.id} export=${relativeToAppRoot(
          this.context.appRoot,
          exportResult.exportPath
        )}`
      );

      return {
        plan,
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
        draftMeta = draftRepository.findLatestByChapterId(input.chapterId);
        if (!draftMeta) {
          throw new Error(`No draft found for chapter ${input.chapterId}.`);
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

  private resolveOutlineChain(
    repository: OutlineRepository,
    outlineId: number | null
  ): OutlineRecord[] {
    if (outlineId === null) {
      return [];
    }

    const chain: OutlineRecord[] = [];
    let currentId: number | null = outlineId;

    // 从当前节点一路向上回溯，最后再反转成“总 -> 分 -> 章”的阅读顺序。
    while (currentId !== null) {
      const outline = repository.findById(currentId);
      if (!outline) {
        break;
      }
      chain.push(outline);
      currentId = outline.parent_id;
    }

    return chain.reverse();
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

  private buildPlanText(input: {
    project: { name: string; genre: string | null; premise: string | null; style: string | null };
    chapter: { title: string; summary: string | null };
    outlineChain: OutlineRecord[];
    rootOutlines: Array<{ title: string; node_type: string; summary: string | null }>;
    characters: Array<{
      name: string;
      role: string | null;
      faction_name: string | null;
      goal: string | null;
      conflict: string | null;
    }>;
    factions: Array<{
      name: string;
      type: string | null;
      goal: string | null;
      stance: string | null;
    }>;
    loreEntries: Array<{
      type: string;
      title: string;
      summary: string | null;
      details: string | null;
    }>;
    chapterHookLinks: Array<{
      hook_title: string;
      hook_type: string;
      hook_status: string;
      link_type: string;
      planned_note: string | null;
    }>;
    targetHooks: Array<{
      title: string;
      hook_type: string;
      status: string;
      payoff_text: string | null;
    }>;
    intent?: string;
  }): string {
    const outlineSection =
      input.outlineChain.length > 0
        ? input.outlineChain
            .map(
              (outline, index) =>
                `${index + 1}. [${outline.node_type}] ${outline.title}${
                  outline.summary ? `：${outline.summary}` : ""
                }`
            )
            .join("\n")
        : input.rootOutlines.length > 0
          ? input.rootOutlines
              .map(
                (outline, index) =>
                  `${index + 1}. [${outline.node_type}] ${outline.title}${
                    outline.summary ? `：${outline.summary}` : ""
                  }`
              )
              .join("\n")
          : "1. 当前项目尚未建立可用大纲，本章规划主要依据章节信息与作者意图。";

    const characterSection =
      input.characters.length > 0
        ? input.characters
            .slice(0, 8)
            .map(
              (character, index) =>
                `${index + 1}. ${character.name}${
                  character.role ? `（${character.role}）` : ""
                }${
                  character.faction_name ? `，所属势力：${character.faction_name}` : ""
                }${character.goal ? `，当前目标：${character.goal}` : ""}${
                  character.conflict ? `，当前冲突：${character.conflict}` : ""
                }`
            )
            .join("\n")
        : "1. 当前项目暂无人物设定。";

    const factionSection =
      input.factions.length > 0
        ? input.factions
            .slice(0, 6)
            .map(
              (faction, index) =>
                `${index + 1}. ${faction.name}${
                  faction.type ? `（${faction.type}）` : ""
                }${faction.stance ? `，立场：${faction.stance}` : ""}${
                  faction.goal ? `，目标：${faction.goal}` : ""
                }`
            )
            .join("\n")
        : "1. 当前项目暂无势力设定。";

    const loreSection =
      input.loreEntries.length > 0
        ? input.loreEntries
            .slice(0, 8)
            .map(
              (entry, index) =>
                `${index + 1}. [${entry.type}] ${entry.title}${
                  entry.summary ? `：${entry.summary}` : ""
                }${entry.details ? `；补充：${entry.details}` : ""}`
            )
            .join("\n")
        : "1. 当前项目暂无长期世界观设定。";

    const hookSectionLines: string[] = [];
    if (input.chapterHookLinks.length > 0) {
      hookSectionLines.push("已绑定到本章的钩子：");
      hookSectionLines.push(
        ...input.chapterHookLinks.map(
          (link, index) =>
            `${index + 1}. ${link.hook_title}（${link.hook_type} / ${link.hook_status}）` +
            `，本章动作：${link.link_type}` +
            `${link.planned_note ? `，计划说明：${link.planned_note}` : ""}`
        )
      );
    }

    if (input.targetHooks.length > 0) {
      hookSectionLines.push("需要在本章注意推进或回收的目标钩子：");
      hookSectionLines.push(
        ...input.targetHooks.map(
          (hook, index) =>
            `${index + 1}. ${hook.title}（${hook.hook_type} / ${hook.status}）${
              hook.payoff_text ? `，目标回收：${hook.payoff_text}` : ""
            }`
        )
      );
    }

    const hookSection =
      hookSectionLines.length > 0
        ? hookSectionLines.join("\n")
        : "当前没有与本章直接关联的钩子，但仍应注意避免破坏既有伏笔。";

    const intentSection = input.intent
      ? input.intent
      : "本次未提供作者额外意图，默认依据已有大纲与章节摘要生成。";

    return [
      "## 本章定位",
      `- 项目：${input.project.name}`,
      `- 章节：${input.chapter.title}`,
      `- 题材：${input.project.genre ?? "未设置"}`,
      `- 文风：${input.project.style ?? "未设置"}`,
      `- 章节摘要：${input.chapter.summary ?? "未设置"}`,
      "",
      "## 作者意图",
      intentSection,
      "",
      "## 大纲依据",
      outlineSection,
      "",
      "## 可调用人物",
      characterSection,
      "",
      "## 可调用势力",
      factionSection,
      "",
      "## 世界观设定",
      loreSection,
      "",
      "## 钩子安排",
      hookSection,
      "",
      "## 建议写作规划",
      "1. 开场：用一个能立即挂住读者的问题或异动切入，尽快让本章目标显形。",
      `2. 中段推进：围绕“${input.chapter.summary ?? input.chapter.title}”逐步升级冲突，让人物目标与外部阻力正面碰撞。`,
      "3. 人物表现：至少让一名核心人物做出明确选择，不只描述事件，也要体现立场与情绪变化。",
      "4. 信息控制：本章可以给出线索，但不要一次性解释完所有谜面，保留下一章的阅读牵引力。",
      "5. 结尾钩挂：结尾最好落在新的风险、误解、发现或关系变化上，为下一章创造强承接。 ",
      "",
      "## 风险提醒",
      `- 避免与项目前提冲突：${input.project.premise ?? "当前未设置故事前提，请注意自洽。"}`,
      "- 若本章承担埋钩任务，需确保正文中有可被读者记住的具体触发点。",
      "- 若本章承担回收任务，需让回收结果改变局面，而不是只做信息解释。"
    ].join("\n");
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
    planMeta?: { id: number; source_type: string; status: string; author_intent: string | null };
    draftText?: string;
    draftMeta?: { id: number; status: string; plan_id: number | null };
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
    planMeta?: { id: number; source_type: string; status: string; author_intent: string | null };
    draftText?: string;
    draftMeta?: { id: number; status: string; plan_id: number | null };
    finalText?: string;
  }): string {
    if (input.source === "plan") {
      if (!input.planText || !input.planMeta) {
        throw new Error("Plan export requires plan content.");
      }

      return [
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
}
