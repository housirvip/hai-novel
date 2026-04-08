import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { StateService } from "../../app/services/state-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

/**
 * 章节状态快照里会把完整提取结果存进 `raw_payload`。
 * 命令行展示时只需要轻量统计数量，因此这里做一个宽松解析，避免脏数据导致 show 整体失败。
 */
function extractSnapshotObjectCounts(rawPayload: string | null): {
  character_count: number;
  faction_count: number;
  hook_count: number;
  item_count: number;
} {
  if (!rawPayload) {
    return {
      character_count: 0,
      faction_count: 0,
      hook_count: 0,
      item_count: 0
    };
  }

  try {
    const parsed = JSON.parse(rawPayload) as Record<string, unknown>;
    return {
      character_count: Array.isArray(parsed.characters) ? parsed.characters.length : 0,
      faction_count: Array.isArray(parsed.factions) ? parsed.factions.length : 0,
      hook_count: Array.isArray(parsed.hooks) ? parsed.hooks.length : 0,
      item_count: Array.isArray(parsed.items) ? parsed.items.length : 0
    };
  } catch {
    return {
      character_count: 0,
      faction_count: 0,
      hook_count: 0,
      item_count: 0
    };
  }
}

// 控制台表格较多时，先打印一个短标题，阅读体验会稳定很多。
function printStateSection(title: string): void {
  logger.info(`${title}:`);
}

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

      printStateSection("preview_summary");
      console.table([
        {
          chapter_id: result.chapterId,
          project_id: result.projectId,
          source_type: result.sourceType,
          source_draft_id: result.sourceDraftId ?? "",
          chapter_summary: result.payload.chapter_summary,
          character_count: result.payload.characters.length,
          faction_count: result.payload.factions.length,
          hook_count: result.payload.hooks.length,
          item_count: result.payload.items.length
        }
      ]);

      if (result.payload.characters.length > 0) {
        printStateSection("character_preview");
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
        printStateSection("faction_preview");
        console.table(
          result.payload.factions.map((faction) => ({
            faction_id: faction.faction_id,
            status_summary: faction.status_summary ?? "",
            power_shift: faction.power_shift ?? ""
          }))
        );
      }

      if (result.payload.hooks.length > 0) {
        printStateSection("hook_preview");
        console.table(
          result.payload.hooks.map((hook) => ({
            hook_id: hook.hook_id,
            progress_status: hook.progress_status,
            progress_note: hook.progress_note ?? ""
          }))
        );
      }

      if (result.payload.items.length > 0) {
        printStateSection("item_preview");
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
    .command("approve-sync")
    .description("Rebuild approved state snapshots from chapter final text.")
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new StateService(context);
      const result = await service.approveSyncChapter({
        chapterId: options.chapter
      });

      console.table([
        {
          chapter_id: result.chapterId,
          project_id: result.projectId,
          chapter_snapshot_id: result.chapterSnapshotId,
          replaced_snapshot_count: result.replacedSnapshotCount,
          character_snapshot_count: result.characterSnapshotCount,
          faction_snapshot_count: result.factionSnapshotCount,
          hook_snapshot_count: result.hookSnapshotCount,
          item_state_count: result.itemStateCount
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel state approve-sync --chapter 1`
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

      printStateSection("chapter_snapshots");
      console.table(
        result.chapterSnapshots.map((snapshot) => ({
          id: snapshot.id,
          project_id: snapshot.project_id,
          chapter_id: snapshot.chapter_id,
          chapter_title: result.chapterTitles[snapshot.chapter_id] ?? "",
          source_draft_id: snapshot.source_draft_id ?? "",
          status: snapshot.status,
          summary: snapshot.summary ?? "",
          ...extractSnapshotObjectCounts(snapshot.raw_payload),
          applied_at: snapshot.applied_at ?? "",
          created_at: snapshot.created_at
        }))
      );

      if (options.chapter === undefined) {
        if (result.latestCharacterStates.length > 0) {
          printStateSection("latest_character_states");
          console.table(
            result.latestCharacterStates.map((characterState) => ({
              character_id: characterState.character_id,
              character_name: characterState.character_name ?? "",
              chapter_id: characterState.chapter_id,
              chapter_title: characterState.chapter_title ?? "",
              chapter_snapshot_id: characterState.chapter_snapshot_id,
              status_summary: characterState.status_summary ?? "",
              location: characterState.location ?? "",
              goal: characterState.goal ?? ""
            }))
          );
        }

        if (result.latestFactionStates.length > 0) {
          printStateSection("latest_faction_states");
          console.table(
            result.latestFactionStates.map((factionState) => ({
              faction_id: factionState.faction_id,
              faction_name: factionState.faction_name ?? "",
              chapter_id: factionState.chapter_id,
              chapter_title: factionState.chapter_title ?? "",
              chapter_snapshot_id: factionState.chapter_snapshot_id,
              status_summary: factionState.status_summary ?? "",
              power_shift: factionState.power_shift ?? ""
            }))
          );
        }

        if (result.latestHookStates.length > 0) {
          printStateSection("latest_hook_states");
          console.table(
            result.latestHookStates.map((hookState) => ({
              hook_id: hookState.hook_id,
              hook_title: hookState.hook_title ?? "",
              chapter_id: hookState.chapter_id,
              chapter_title: hookState.chapter_title ?? "",
              chapter_snapshot_id: hookState.chapter_snapshot_id,
              progress_status: hookState.progress_status,
              progress_note: hookState.progress_note ?? ""
            }))
          );
        }

        if (result.latestItemStates.length > 0) {
          printStateSection("latest_item_states");
          console.table(
            result.latestItemStates.map((itemState) => ({
              chapter_id: itemState.chapter_id,
              chapter_title: itemState.chapter_title ?? "",
              chapter_snapshot_id: itemState.chapter_snapshot_id,
              item_id: itemState.item_id,
              item_name: itemState.item_name ?? "",
              item_category: itemState.item_category ?? "",
              item_rarity: itemState.item_rarity ?? "",
              item_static_status: itemState.item_static_status ?? "",
              owner_character_name: itemState.owner_character_name ?? "",
              status_summary: itemState.status_summary ?? "",
              location: itemState.location ?? ""
            }))
          );
        }
      }

      if (options.chapter !== undefined) {
        if (result.characterSnapshots.length > 0) {
          printStateSection("character_snapshots");
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
          printStateSection("faction_snapshots");
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
          printStateSection("hook_snapshots");
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
          printStateSection("item_states");
          console.table(
            result.itemStates.map((itemState) => ({
              chapter_id: itemState.chapter_id,
              chapter_title: itemState.chapter_title ?? "",
              chapter_snapshot_id: itemState.chapter_snapshot_id,
              item_id: itemState.item_id,
              item_name: itemState.item_name ?? "",
              item_category: itemState.item_category ?? "",
              item_rarity: itemState.item_rarity ?? "",
              item_static_status: itemState.item_static_status ?? "",
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
