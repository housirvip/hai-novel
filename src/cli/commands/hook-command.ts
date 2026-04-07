import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { HookService } from "../../app/services/hook-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerHookCommands(program: Command): void {
  const hook = program.command("hook").description("Story hook management commands.");

  hook
    .command("add")
    .description("Add a story hook.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--title <title>", "Hook title")
    .requiredOption("--type <type>", "Hook type")
    .option("--summary <summary>", "Hook summary")
    .option("--setup <text>", "Setup text")
    .option("--payoff <text>", "Payoff text")
    .option("--priority <number>", "Priority", (value: string) =>
      parseOptionalIntegerOption(value, "--priority")
    )
    .option("--target-chapter <id>", "Target payoff chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--target-chapter")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new HookService(context);
      const hookRecord = service.createHook({
        projectId: options.project,
        title: options.title,
        hookType: options.type,
        summary: options.summary,
        setupText: options.setup,
        payoffText: options.payoff,
        priority: options.priority,
        targetChapterId: options.targetChapter
      });

      console.table([
        {
          id: hookRecord.id,
          project_id: hookRecord.project_id,
          title: hookRecord.title,
          type: hookRecord.hook_type,
          status: hookRecord.status,
          target_chapter_id: hookRecord.target_chapter_id ?? ""
        }
      ]);
    });

  hook
    .command("list")
    .description("List story hooks in a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .option("--status <status>", "Hook status filter")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new HookService(context);
      const hooks = service.listHooks(options.project, options.status);

      if (hooks.length === 0) {
        logger.info("No hooks found.");
        return;
      }

      console.table(
        hooks.map((hookRecord) => ({
          id: hookRecord.id,
          title: hookRecord.title,
          type: hookRecord.hook_type,
          status: hookRecord.status,
          priority: hookRecord.priority ?? "",
          start: hookRecord.start_chapter_title ?? "",
          target: hookRecord.target_chapter_title ?? "",
          end: hookRecord.end_chapter_title ?? ""
        }))
      );
    });

  hook
    .command("show")
    .description("Show a story hook with its chapter timeline.")
    .requiredOption("--hook <id>", "Hook id", (value: string) =>
      parseRequiredIntegerOption(value, "--hook")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new HookService(context);
      const result = service.showHook(options.hook);

      console.table([
        {
          id: result.hook.id,
          project_id: result.hook.project_id,
          title: result.hook.title,
          type: result.hook.hook_type,
          status: result.hook.status,
          start: result.hook.start_chapter_title ?? "",
          target: result.hook.target_chapter_title ?? "",
          end: result.hook.end_chapter_title ?? ""
        }
      ]);

      if (result.hook.summary) {
        logger.info(`summary: ${result.hook.summary}`);
      }

      if (result.hook.setup_text) {
        logger.info(`setup: ${result.hook.setup_text}`);
      }

      if (result.hook.payoff_text) {
        logger.info(`payoff: ${result.hook.payoff_text}`);
      }

      if (result.chapter_links.length === 0) {
        logger.info("No chapter links found for this hook.");
        return;
      }

      console.table(
        result.chapter_links.map((linkRecord) => ({
          id: linkRecord.id,
          chapter: linkRecord.chapter_title,
          type: linkRecord.link_type,
          status: linkRecord.status,
          planned_note: linkRecord.planned_note ?? "",
          actual_note: linkRecord.actual_note ?? ""
        }))
      );
    });

  hook
    .command("bind")
    .description("Bind a hook to a chapter.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--hook <id>", "Hook id", (value: string) =>
      parseRequiredIntegerOption(value, "--hook")
    )
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .requiredOption("--type <type>", "Link type")
    .option("--planned-note <text>", "Planned note")
    .option("--actual-note <text>", "Actual note")
    .option("--status <status>", "Link status")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new HookService(context);
      const linkRecord = service.bindHookToChapter({
        projectId: options.project,
        hookId: options.hook,
        chapterId: options.chapter,
        linkType: options.type,
        plannedNote: options.plannedNote,
        actualNote: options.actualNote,
        status: options.status
      });

      console.table([
        {
          id: linkRecord.id,
          project_id: linkRecord.project_id,
          hook_id: linkRecord.hook_id,
          chapter_id: linkRecord.chapter_id,
          type: linkRecord.link_type,
          status: linkRecord.status
        }
      ]);
    });

  hook
    .command("update")
    .description("Update hook lifecycle fields.")
    .requiredOption("--hook <id>", "Hook id", (value: string) =>
      parseRequiredIntegerOption(value, "--hook")
    )
    .option("--status <status>", "Hook status")
    .option("--start-chapter <id>", "Start chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--start-chapter")
    )
    .option("--target-chapter <id>", "Target chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--target-chapter")
    )
    .option("--end-chapter <id>", "End chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--end-chapter")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new HookService(context);
      const hookRecord = service.updateHook({
        hookId: options.hook,
        status: options.status,
        startChapterId: options.startChapter,
        targetChapterId: options.targetChapter,
        endChapterId: options.endChapter
      });

      console.table([
        {
          id: hookRecord.id,
          title: hookRecord.title,
          status: hookRecord.status,
          start_chapter_id: hookRecord.start_chapter_id ?? "",
          target_chapter_id: hookRecord.target_chapter_id ?? "",
          end_chapter_id: hookRecord.end_chapter_id ?? ""
        }
      ]);
    });
}
