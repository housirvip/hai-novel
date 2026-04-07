import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { ProjectService } from "../../app/services/project-service.js";
import { assertInitialized, parseRequiredIntegerOption } from "../command-helpers.js";
import { logger } from "../../utils/logger.js";

export function registerProjectCommands(program: Command): void {
  const project = program.command("project").description("Project management commands.");

  project
    .command("create")
    .description("Create a new novel project.")
    .requiredOption("--name <name>", "Project name")
    .option("--genre <genre>", "Project genre")
    .option("--premise <premise>", "Story premise")
    .option("--style <style>", "Writing style")
    .option(
      "--target-word-count <count>",
      "Target total word count",
      (value: string) => parseRequiredIntegerOption(value, "--target-word-count")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ProjectService(context);
      const projectRecord = service.createProject({
        name: options.name,
        genre: options.genre,
        premise: options.premise,
        style: options.style,
        targetWordCount: options.targetWordCount
      });

      console.table([
        {
          id: projectRecord.id,
          name: projectRecord.name,
          genre: projectRecord.genre ?? "",
          status: projectRecord.status,
          created_at: projectRecord.created_at
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel project create --name "测试小说" --genre "仙侠"
  novel project create --name "雨夜异闻" --premise "一桩旧案在雨夜重启" --style "冷峻克制"`
    );

  project
    .command("list")
    .description("List all projects.")
    .action(async () => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ProjectService(context);
      const projects = service.listProjects();

      if (projects.length === 0) {
        logger.info("No projects found.");
        return;
      }

      console.table(
        projects.map((projectRecord) => ({
          id: projectRecord.id,
          name: projectRecord.name,
          genre: projectRecord.genre ?? "",
          status: projectRecord.status,
          updated_at: projectRecord.updated_at
        }))
      );
    })
    .addHelpText(
      "after",
      `
Examples:
  novel project list`
    );
}
