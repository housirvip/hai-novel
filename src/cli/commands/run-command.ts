import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { RunService, shortenRunText } from "../../app/services/run-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerRunCommands(program: Command): void {
  const run = program.command("run").description("Generation run history commands.");

  run
    .command("history")
    .description("List generation runs.")
    .option("--project <id>", "Project id", (value: string) =>
      parseOptionalIntegerOption(value, "--project")
    )
    .option("--chapter <id>", "Chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--chapter")
    )
    .option("--type <type>", "Run type filter")
    .option("--limit <number>", "Max result count", (value: string) =>
      parseOptionalIntegerOption(value, "--limit")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RunService(context);
      const runs = service.listRuns({
        projectId: options.project,
        chapterId: options.chapter,
        runType: options.type,
        limit: options.limit
      });

      if (runs.length === 0) {
        logger.info("No generation runs found.");
        return;
      }

      console.table(
        runs.map((runRecord) => ({
          id: runRecord.id,
          project_id: runRecord.project_id,
          chapter: runRecord.chapter_title ?? "",
          run_type: runRecord.run_type,
          model: runRecord.model ?? "",
          status: runRecord.status,
          output_preview: shortenRunText(runRecord.output_text, 60),
          created_at: runRecord.created_at
        }))
      );
    });

  run
    .command("show")
    .description("Show a generation run in detail.")
    .requiredOption("--id <id>", "Run id", (value: string) =>
      parseRequiredIntegerOption(value, "--id")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RunService(context);
      const runRecord = service.showRun(options.id);

      console.table([
        {
          id: runRecord.id,
          project_id: runRecord.project_id,
          chapter_id: runRecord.chapter_id ?? "",
          run_type: runRecord.run_type,
          model: runRecord.model ?? "",
          status: runRecord.status,
          created_at: runRecord.created_at
        }
      ]);

      if (runRecord.prompt_text) {
        logger.info("prompt_text:");
        console.log(runRecord.prompt_text);
      }

      if (runRecord.input_context) {
        logger.info("input_context:");
        console.log(runRecord.input_context);
      }

      if (runRecord.output_text) {
        logger.info("output_text:");
        console.log(runRecord.output_text);
      }
    });
}
