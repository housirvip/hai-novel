import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { ProjectService } from "../../app/services/project-service.js";
import { logger } from "../../utils/logger.js";
import { pathExists } from "../../utils/paths.js";

async function assertInitialized(cwd: string): Promise<void> {
  const context = await loadRuntimeContext(cwd);
  const hasConfig = await pathExists(context.configPath);
  const hasDb = await pathExists(context.dbPath);

  if (!hasConfig || !hasDb) {
    throw new Error("Workspace is not initialized. Run `novel init` first.");
  }
}

export function registerProjectCommands(program: Command): void {
  const project = program.command("project").description("Project management commands.");

  project
    .command("create")
    .description("Create a new novel project.")
    .requiredOption("--name <name>", "Project name")
    .option("--genre <genre>", "Project genre")
    .option("--premise <premise>", "Story premise")
    .option("--style <style>", "Writing style")
    .option("--target-word-count <count>", "Target total word count", (value) => {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        throw new Error("`--target-word-count` must be an integer.");
      }
      return parsed;
    })
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
    });

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
    });
}
