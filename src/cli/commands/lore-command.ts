import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { LoreService } from "../../app/services/lore-service.js";
import { logger } from "../../utils/logger.js";
import { assertInitialized, parseRequiredIntegerOption } from "../command-helpers.js";

export function registerLoreCommands(program: Command): void {
  const lore = program.command("lore").description("Lore management commands.");

  lore
    .command("add")
    .description("Add a lore entry to a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--type <type>", "Lore type")
    .requiredOption("--title <title>", "Lore title")
    .option("--summary <summary>", "Lore summary")
    .option("--details <details>", "Lore details")
    .option("--tags <tags>", "Lore tags")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new LoreService(context);
      const loreRecord = service.createLoreEntry({
        projectId: options.project,
        type: options.type,
        title: options.title,
        summary: options.summary,
        details: options.details,
        tags: options.tags
      });

      console.table([
        {
          id: loreRecord.id,
          project_id: loreRecord.project_id,
          type: loreRecord.type,
          title: loreRecord.title,
          created_at: loreRecord.created_at
        }
      ]);
    });

  lore
    .command("list")
    .description("List lore entries in a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .option("--type <type>", "Lore type filter")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new LoreService(context);
      const entries = service.listLoreEntries(options.project, options.type);

      if (entries.length === 0) {
        logger.info("No lore entries found.");
        return;
      }

      console.table(
        entries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          title: entry.title,
          summary: entry.summary ?? "",
          tags: entry.tags ?? ""
        }))
      );
    });
}
