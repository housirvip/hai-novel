import type { Command } from "commander";
import { initializeWorkspace } from "../../app/services/init-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize the novel workspace, config, and SQLite database.")
    .action(async () => {
      const context = await loadRuntimeContext(process.cwd());
      await initializeWorkspace(context);
    });
}
