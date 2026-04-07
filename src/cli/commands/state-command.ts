import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { StateService } from "../../app/services/state-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerStateCommands(program: Command): void {
  const state = program.command("state").description("Approved state snapshot commands.");

  state
    .command("show")
    .description("Show chapter and object state snapshots.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .option("--chapter <id>", "Optional chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--chapter")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new StateService(context);
      const result = service.showState({
        projectId: options.project,
        chapterId: options.chapter
      });

      if (result.chapterSnapshots.length === 0) {
        logger.info("No state snapshots found.");
        return;
      }

      console.table(
        result.chapterSnapshots.map((snapshot) => ({
          id: snapshot.id,
          project_id: snapshot.project_id,
          chapter_id: snapshot.chapter_id,
          source_draft_id: snapshot.source_draft_id ?? "",
          status: snapshot.status,
          summary: snapshot.summary ?? "",
          applied_at: snapshot.applied_at ?? "",
          created_at: snapshot.created_at
        }))
      );

      if (options.chapter !== undefined) {
        if (result.characterSnapshots.length > 0) {
          console.table(
            result.characterSnapshots.map((snapshot) => ({
              id: snapshot.id,
              character_id: snapshot.character_id,
              chapter_snapshot_id: snapshot.chapter_snapshot_id,
              status_summary: snapshot.status_summary ?? ""
            }))
          );
        }

        if (result.factionSnapshots.length > 0) {
          console.table(
            result.factionSnapshots.map((snapshot) => ({
              id: snapshot.id,
              faction_id: snapshot.faction_id,
              chapter_snapshot_id: snapshot.chapter_snapshot_id,
              status_summary: snapshot.status_summary ?? ""
            }))
          );
        }

        if (result.hookSnapshots.length > 0) {
          console.table(
            result.hookSnapshots.map((snapshot) => ({
              id: snapshot.id,
              hook_id: snapshot.hook_id,
              chapter_snapshot_id: snapshot.chapter_snapshot_id,
              progress_status: snapshot.progress_status,
              progress_note: snapshot.progress_note ?? ""
            }))
          );
        }
      }
    })
    .addHelpText(
      "after",
      `
Examples:
  novel state show --project 1
  novel state show --project 1 --chapter 1`
    );
}
