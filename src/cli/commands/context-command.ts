import { Command } from "commander";
import { createDatabase } from "../../db/client.js";
import { ChapterContextBuilder, formatChapterContextAsText } from "../../app/services/chapter-context-builder.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { assertInitialized, parseRequiredIntegerOption } from "../command-helpers.js";

function parseContextFormat(value: string): "json" | "text" {
  if (value === "json" || value === "text") {
    return value;
  }

  throw new Error("`--format` must be one of: json, text.");
}

export function registerContextCommands(program: Command): void {
  const context = program.command("context").description("Context inspection commands.");

  context
    .command("chapter")
    .description("Show the unified chapter generation context.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .option("--format <format>", "Output format: json|text", parseContextFormat, "json")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const runtimeContext = await loadRuntimeContext(process.cwd());
      const database = createDatabase(runtimeContext.dbPath);

      try {
        const builder = new ChapterContextBuilder(database);
        const chapterContext = builder.build({
          projectId: options.project,
          chapterId: options.chapter
        });

        if (options.format === "text") {
          console.log(formatChapterContextAsText(chapterContext));
          return;
        }

        console.log(JSON.stringify(chapterContext, null, 2));
      } finally {
        database.close();
      }
    });
}
