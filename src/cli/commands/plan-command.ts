import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { PlanService } from "../../app/services/plan-service.js";
import { logger } from "../../utils/logger.js";
import { assertInitialized, parseRequiredIntegerOption } from "../command-helpers.js";

export function registerPlanCommands(program: Command): void {
  const plan = program.command("plan").description("Chapter plan inspection commands.");

  plan
    .command("show")
    .description("Show the current plan of a chapter.")
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new PlanService(context);
      const result = service.showPlanByChapter(options.chapter);

      console.table([
        {
          chapter_id: result.chapter.id,
          chapter_title: result.chapter.title,
          plan_id: result.plan.id,
          source_type: result.plan.source_type,
          status: result.plan.status,
          created_at: result.plan.created_at
        }
      ]);

      if (result.plan.author_intent) {
        logger.info(`author_intent: ${result.plan.author_intent}`);
      }

      logger.info("plan_text:");
      console.log(result.plan.plan_text);
    });

  plan
    .command("import")
    .description("Import an edited plan Markdown file back into the database.")
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .requiredOption("--input <path>", "Markdown file path")
    .option("--force", "Ignore source version conflict and force import")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new PlanService(context);
      const result = await service.importPlan({
        chapterId: options.chapter,
        inputPath: options.input,
        force: options.force === true
      });

      console.table([
        {
          plan_id: result.plan.id,
          chapter_id: result.plan.chapter_id,
          source_version: result.plan.source_version,
          updated_from: result.plan.updated_from,
          import_path: result.importPath
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel plan import --chapter 1 --input exports/chapter-001-plan.md
  novel plan import --chapter 1 --input exports/chapter-001-plan.md --force`
    );
}
