import { Command } from "commander";
import { ChapterService } from "../../app/services/chapter-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

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
    });

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
}
