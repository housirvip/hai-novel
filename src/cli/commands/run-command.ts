import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import {
  RunService,
  formatRunValue,
  shortenRunText
} from "../../app/services/run-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

type RunShowSection = "all" | "meta" | "prompt" | "input" | "output";
type RunExportFormat = "md" | "json";

function parseRunShowSection(value: string): RunShowSection {
  if (
    value === "all" ||
    value === "meta" ||
    value === "prompt" ||
    value === "input" ||
    value === "output"
  ) {
    return value;
  }

  throw new Error("`--section` must be one of: all, meta, prompt, input, output.");
}

function parseRunExportFormat(value: string): RunExportFormat {
  if (value === "md" || value === "json") {
    return value;
  }

  throw new Error("`--format` must be one of: md, json.");
}

function formatTemplateSnapshot(input: {
  key: string | null;
  version: string | null;
}): string {
  if (!input.key) {
    return "";
  }

  return input.version ? `${input.key}@${input.version}` : input.key;
}

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
          template: formatTemplateSnapshot({
            key: runRecord.template_key,
            version: runRecord.template_version
          }),
          model: runRecord.model ?? "",
          status: runRecord.status,
          output_preview: shortenRunText(runRecord.output_text, 60),
          created_at: runRecord.created_at
        }))
      );
    })
    .addHelpText(
      "after",
      `
Examples:
  novel run history --project 1 --limit 10
  novel run history --chapter 1 --type draft_write`
    );

  run
    .command("show")
    .description("Show a generation run in detail.")
    .requiredOption("--id <id>", "Run id", (value: string) =>
      parseRequiredIntegerOption(value, "--id")
    )
    .option(
      "--section <section>",
      "Section to show: all|meta|prompt|input|output",
      parseRunShowSection,
      "all"
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RunService(context);
      const runRecord = service.showRun(options.id);

      if (options.section === "all" || options.section === "meta") {
        console.table([
          {
            id: runRecord.id,
            project_id: runRecord.project_id,
            chapter_id: runRecord.chapter_id ?? "",
            run_type: runRecord.run_type,
            template_key: runRecord.template_key ?? "",
            template_name: runRecord.template_label ?? "",
            template_version: runRecord.template_version ?? "",
            template_summary: runRecord.template_summary ?? "",
            model: runRecord.model ?? "",
            status: runRecord.status,
            created_at: runRecord.created_at
          }
        ]);
      }

      if (options.section === "all" || options.section === "prompt") {
        if (runRecord.prompt_text) {
          logger.info("prompt_text:");
          console.log(runRecord.prompt_text);
        } else if (options.section !== "all") {
          logger.info("No prompt_text found.");
        }
      }

      if (options.section === "all" || options.section === "input") {
        if (runRecord.input_context) {
          logger.info("input_context:");
          console.log(formatRunValue(runRecord.input_context));
        } else if (options.section !== "all") {
          logger.info("No input_context found.");
        }
      }

      if (options.section === "all" || options.section === "output") {
        if (runRecord.output_text) {
          logger.info("output_text:");
          console.log(runRecord.output_text);
        } else if (options.section !== "all") {
          logger.info("No output_text found.");
        }
      }
    })
    .addHelpText(
      "after",
      `
Examples:
  novel run show --id 8 --section meta
  novel run show --id 8 --section input`
    );

  run
    .command("export")
    .description("Export a generation run into Markdown or JSON.")
    .requiredOption("--id <id>", "Run id", (value: string) =>
      parseRequiredIntegerOption(value, "--id")
    )
    .option(
      "--section <section>",
      "Section to export: all|meta|prompt|input|output",
      parseRunShowSection,
      "all"
    )
    .option("--format <format>", "Export format: md|json", parseRunExportFormat, "md")
    .option("--output <path>", "Optional custom export path")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RunService(context);
      const result = await service.exportRun({
        runId: options.id,
        section: options.section,
        format: options.format,
        outputPath: options.output
      });

      console.table([
        {
          run_id: result.runId,
          section: result.section,
          format: result.format,
          export_path: result.exportPath
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel run export --id 8 --section all --format md
  novel run export --id 8 --section meta --format json --output exports/run-8.json`
    );
}
