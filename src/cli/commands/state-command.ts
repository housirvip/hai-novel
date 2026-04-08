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
    .command("chapter-preview")
    .description("Preview state changes from the latest draft or approved final text.")
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .option("--draft <id>", "Optional draft id", (value: string) =>
      parseOptionalIntegerOption(value, "--draft")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new StateService(context);
      const result = await service.previewChapterState({
        chapterId: options.chapter,
        draftId: options.draft
      });

      console.table([
        {
          chapter_id: result.chapterId,
          project_id: result.projectId,
          source_type: result.sourceType,
          source_draft_id: result.sourceDraftId ?? "",
          chapter_summary: result.payload.chapter_summary
        }
      ]);

      if (result.payload.characters.length > 0) {
        console.table(
          result.payload.characters.map((character) => ({
            character_id: character.character_id,
            status_summary: character.status_summary ?? "",
            location: character.location ?? "",
            goal: character.goal ?? ""
          }))
        );
      }

      if (result.payload.factions.length > 0) {
        console.table(
          result.payload.factions.map((faction) => ({
            faction_id: faction.faction_id,
            status_summary: faction.status_summary ?? "",
            power_shift: faction.power_shift ?? ""
          }))
        );
      }

      if (result.payload.hooks.length > 0) {
        console.table(
          result.payload.hooks.map((hook) => ({
            hook_id: hook.hook_id,
            progress_status: hook.progress_status,
            progress_note: hook.progress_note ?? ""
          }))
        );
      }

      if (result.payload.items.length > 0) {
        console.table(
          result.payload.items.map((item) => ({
            item_id: item.item_id,
            owner_character_id: item.owner_character_id ?? "",
            status_summary: item.status_summary ?? "",
            location: item.location ?? ""
          }))
        );
      }
    })
    .addHelpText(
      "after",
      `
Examples:
  novel state chapter-preview --chapter 1
  novel state chapter-preview --chapter 1 --draft 2`
    );

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

        if (result.itemStates.length > 0) {
          console.table(
            result.itemStates.map((itemState) => ({
              chapter_snapshot_id: itemState.chapter_snapshot_id,
              item_id: itemState.item_id,
              item_name: itemState.item_name ?? "",
              owner_character_id: itemState.owner_character_id ?? "",
              owner_character_name: itemState.owner_character_name ?? "",
              status_summary: itemState.status_summary ?? "",
              location: itemState.location ?? ""
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
