import { Command } from "commander";
import { ChapterService } from "../../app/services/chapter-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import type { ChapterExportSource } from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

function parseChapterExportSource(value: string): ChapterExportSource {
  if (value === "plan" || value === "draft" || value === "final") {
    return value;
  }

  throw new Error("`--source` must be one of: plan, draft, final.");
}

export function registerChapterCommands(program: Command): void {
  const chapter = program.command("chapter").description("Chapter management commands.");

  chapter
    .command("create")
    .description("Create a chapter.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--title <title>", "Chapter title")
    .option("--outline <id>", "Related outline id", (value: string) =>
      parseOptionalIntegerOption(value, "--outline")
    )
    .option("--summary <summary>", "Chapter summary")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ChapterService(context);
      const chapterRecord = service.createChapter({
        projectId: options.project,
        outlineId: options.outline,
        title: options.title,
        summary: options.summary
      });

      console.table([
        {
          id: chapterRecord.id,
          project_id: chapterRecord.project_id,
          outline_id: chapterRecord.outline_id ?? "",
          title: chapterRecord.title,
          status: chapterRecord.status,
          created_at: chapterRecord.created_at
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel chapter create --project 1 --title "第001章 雨夜入宗"
  novel chapter create --project 1 --title "第002章 山门试剑" --outline 5 --summary "主角初次公开出手"`
    );

  chapter
    .command("plan")
    .description("Generate a chapter plan and export it as Markdown.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .option("--intent <text>", "Author intent for this chapter")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ChapterService(context);
      const result = await service.generatePlan({
        projectId: options.project,
        chapterId: options.chapter,
        intent: options.intent
      });

      console.table([
        {
          id: result.plan.id,
          project_id: result.plan.project_id,
          chapter_id: result.plan.chapter_id,
          source_type: result.plan.source_type,
          status: result.plan.status,
          generation_run_id: result.generationRunId,
          export_path: result.exportPath
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel chapter plan --project 1 --chapter 1
  novel chapter plan --project 1 --chapter 1 --intent "突出黑玉佩异常与宗门压迫感"`
    );

  chapter
    .command("show")
    .description("Show a chapter and its hook links.")
    .requiredOption("--id <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--id")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ChapterService(context);
      const result = service.showChapter(options.id);

      console.table([
        {
          id: result.chapter.id,
          project_id: result.chapter.project_id,
          outline: result.chapter.outline_title ?? "",
          title: result.chapter.title,
          status: result.chapter.status,
          approved_draft_id: result.chapter.approved_draft_id ?? ""
        }
      ]);

      if (result.chapter.summary) {
        logger.info(`summary: ${result.chapter.summary}`);
      }

      if (result.chapter.final_text) {
        logger.info("final_text:");
        console.log(result.chapter.final_text);
      }

      if (result.hook_links.length === 0) {
        logger.info("No hook links found for this chapter.");
        return;
      }

      console.table(
        result.hook_links.map((linkRecord) => ({
          id: linkRecord.id,
          hook: linkRecord.hook_title,
          hook_type: linkRecord.hook_type,
          hook_status: linkRecord.hook_status,
          link_type: linkRecord.link_type,
          status: linkRecord.status
        }))
      );
    });

  chapter
    .command("export")
    .description("Export chapter content to Markdown.")
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .requiredOption(
      "--source <source>",
      "Export source: plan|draft|final",
      parseChapterExportSource
    )
    .option("--draft <id>", "Draft id used when source=draft", (value: string) =>
      parseOptionalIntegerOption(value, "--draft")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ChapterService(context);
      const result = await service.exportChapter({
        chapterId: options.chapter,
        source: options.source,
        draftId: options.draft
      });

      console.table([
        {
          chapter_id: options.chapter,
          source: result.source,
          export_path: result.exportPath
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel chapter export --chapter 1 --source plan
  novel chapter export --chapter 1 --source draft --draft 3
  novel chapter export --chapter 1 --source final`
    );
}
