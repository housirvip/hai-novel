import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { DraftService } from "../../app/services/draft-service.js";
import { assertInitialized, parseOptionalIntegerOption, parseRequiredIntegerOption } from "../command-helpers.js";

export function registerDraftCommands(program: Command): void {
  const draft = program.command("draft").description("Draft management commands.");

  draft
    .command("write")
    .description("Generate a chapter draft from the current plan.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .option("--plan <id>", "Plan id", (value: string) =>
      parseOptionalIntegerOption(value, "--plan")
    )
    .option("--instruction <text>", "Extra writing instruction")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new DraftService(context);
      const result = await service.writeDraft({
        projectId: options.project,
        chapterId: options.chapter,
        planId: options.plan,
        instruction: options.instruction
      });

      console.table([
        {
          draft_id: result.draft.id,
          project_id: result.draft.project_id,
          chapter_id: result.draft.chapter_id,
          plan_id: result.draft.plan_id ?? "",
          status: result.draft.status,
          generation_run_id: result.generationRunId,
          export_path: result.exportPath
        }
      ]);
    });
}
