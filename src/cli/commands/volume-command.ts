import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { OutlineService } from "../../app/services/outline-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerVolumeCommands(program: Command): void {
  const volume = program.command("volume").description("Volume planning commands.");

  volume
    .command("plan")
    .description("Create a volume plan manually or derive it from the story outline.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .option("--title <title>", "Volume title")
    .option("--summary <summary>", "Volume summary")
    .option("--goal <goal>", "Volume goal")
    .option("--conflict <conflict>", "Volume conflict")
    .option("--outcome <outcome>", "Volume outcome")
    .option("--parent <id>", "Parent outline id", (value: string) =>
      parseOptionalIntegerOption(value, "--parent")
    )
    .option("--instruction <text>", "Extra instruction for generated volume plan")
    .option("--from-outline", "Generate the volume plan from the story outline")
    .option("--position <number>", "Sibling order", (value: string) =>
      parseOptionalIntegerOption(value, "--position")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new OutlineService(context);
      const result = service.planVolume({
        projectId: options.project,
        title: options.title,
        summary: options.summary,
        goal: options.goal,
        conflict: options.conflict,
        outcome: options.outcome,
        parentId: options.parent,
        instruction: options.instruction,
        fromOutline: options.fromOutline === true,
        position: options.position
      });

      console.table([
        {
          id: result.volume.id,
          project_id: result.volume.project_id,
          parent_id: result.volume.parent_id ?? "",
          title: result.volume.title,
          position: result.volume.position,
          generation_run_id: result.generationRunId ?? ""
        }
      ]);
    });

  volume
    .command("list")
    .description("List volume outline nodes in a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new OutlineService(context);
      const volumes = service.listVolumes(options.project);

      if (volumes.length === 0) {
        logger.info("No volumes found.");
        return;
      }

      console.table(
        volumes.map((volumeRecord) => ({
          id: volumeRecord.id,
          parent: volumeRecord.parent_title ?? "",
          title: volumeRecord.title,
          position: volumeRecord.position,
          summary: volumeRecord.summary ?? ""
        }))
      );
    });
}
