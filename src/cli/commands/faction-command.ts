import { Command } from "commander";
import { FactionService } from "../../app/services/faction-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { logger } from "../../utils/logger.js";
import { assertInitialized, parseRequiredIntegerOption } from "../command-helpers.js";

export function registerFactionCommands(program: Command): void {
  const faction = program.command("faction").description("Faction management commands.");

  faction
    .command("add")
    .description("Add a faction to a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--name <name>", "Faction name")
    .option("--type <type>", "Faction type")
    .option("--leader <leader>", "Faction leader")
    .option("--goal <goal>", "Faction goal")
    .option("--stance <stance>", "Faction stance")
    .option("--summary <summary>", "Faction summary")
    .option("--details <details>", "Faction details")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new FactionService(context);
      const factionRecord = service.createFaction({
        projectId: options.project,
        name: options.name,
        type: options.type,
        leader: options.leader,
        goal: options.goal,
        stance: options.stance,
        summary: options.summary,
        details: options.details
      });

      console.table([
        {
          id: factionRecord.id,
          project_id: factionRecord.project_id,
          name: factionRecord.name,
          type: factionRecord.type ?? "",
          leader: factionRecord.leader ?? "",
          created_at: factionRecord.created_at
        }
      ]);
    });

  faction
    .command("list")
    .description("List factions in a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new FactionService(context);
      const factions = service.listFactions(options.project);

      if (factions.length === 0) {
        logger.info("No factions found.");
        return;
      }

      console.table(
        factions.map((factionRecord) => ({
          id: factionRecord.id,
          name: factionRecord.name,
          type: factionRecord.type ?? "",
          leader: factionRecord.leader ?? "",
          goal: factionRecord.goal ?? "",
          stance: factionRecord.stance ?? ""
        }))
      );
    });
}
