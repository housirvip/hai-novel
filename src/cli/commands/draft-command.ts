import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { DraftService } from "../../app/services/draft-service.js";
import type { DraftReviewAction } from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import { assertInitialized, parseOptionalIntegerOption, parseRequiredIntegerOption } from "../command-helpers.js";

function parseDraftReviewAction(value: string): DraftReviewAction {
  if (value === "check" || value === "fix" || value === "approve") {
    return value;
  }

  throw new Error("`--action` must be one of: check, fix, approve.");
}

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
    })
    .addHelpText(
      "after",
      `
Examples:
  novel draft write --project 1 --chapter 1
  novel draft write --project 1 --chapter 1 --instruction "加强压迫感和对白冲突"`
    );

  draft
    .command("review")
    .description("Review a draft with check, fix, or approve action.")
    .requiredOption("--draft <id>", "Draft id", (value: string) =>
      parseRequiredIntegerOption(value, "--draft")
    )
    .requiredOption("--action <action>", "Review action: check|fix|approve", parseDraftReviewAction)
    .option("--notes <text>", "Extra review notes")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new DraftService(context);
      const result = await service.reviewDraft({
        draftId: options.draft,
        action: options.action,
        notes: options.notes
      });

      console.table([
        {
          draft_id: result.draft.id,
          chapter_id: result.draft.chapter_id,
          action: result.action,
          status: result.draft.status,
          generation_run_id: result.generationRunId,
          export_path: result.exportPath ?? ""
        }
      ]);

      if (result.issues.length === 0) {
        logger.info("No review issues found.");
        return;
      }

      console.table(
        result.issues.map((issue, index) => ({
          index: index + 1,
          level: issue.level,
          title: issue.title,
          detail: issue.detail
        }))
      );
    })
    .addHelpText(
      "after",
      `
Examples:
  novel draft review --draft 1 --action check
  novel draft review --draft 1 --action fix --notes "强化结尾钩子"
  novel draft review --draft 1 --action approve`
    );

  draft
    .command("drop")
    .description("Drop a draft so it will not be used as final text.")
    .requiredOption("--draft <id>", "Draft id", (value: string) =>
      parseRequiredIntegerOption(value, "--draft")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new DraftService(context);
      service.dropDraft(options.draft);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel draft drop --draft 3`
    );

  draft
    .command("import")
    .description("Import an edited draft Markdown file back into the database.")
    .requiredOption("--draft <id>", "Draft id", (value: string) =>
      parseRequiredIntegerOption(value, "--draft")
    )
    .requiredOption("--input <path>", "Markdown file path")
    .option("--force", "Ignore source version conflict and force import")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new DraftService(context);
      const result = await service.importDraft({
        draftId: options.draft,
        inputPath: options.input,
        force: options.force === true
      });

      console.table([
        {
          draft_id: result.draft.id,
          chapter_id: result.draft.chapter_id,
          source_version: result.draft.source_version,
          updated_from: result.draft.updated_from,
          import_path: result.importPath
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel draft import --draft 1 --input exports/chapter-001-draft.md
  novel draft import --draft 1 --input exports/chapter-001-draft.md --force`
    );
}
