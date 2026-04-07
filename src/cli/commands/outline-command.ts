import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { OutlineService } from "../../app/services/outline-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerOutlineCommands(program: Command): void {
  const outline = program.command("outline").description("Outline management commands.");

  outline
    .command("set")
    .description("Create or update the story-level outline for a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--title <title>", "Story outline title")
    .option("--summary <summary>", "Story outline summary")
    .option("--goal <goal>", "Story outline goal")
    .option("--conflict <conflict>", "Story outline conflict")
    .option("--outcome <outcome>", "Story outline outcome")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new OutlineService(context);
      const outlineRecord = service.setStoryOutline({
        projectId: options.project,
        title: options.title,
        summary: options.summary,
        goal: options.goal,
        conflict: options.conflict,
        outcome: options.outcome
      });

      console.table([
        {
          id: outlineRecord.id,
          project_id: outlineRecord.project_id,
          type: outlineRecord.node_type,
          title: outlineRecord.title,
          position: outlineRecord.position,
          updated_at: outlineRecord.updated_at
        }
      ]);
    });

  outline
    .command("show")
    .description("Show the story-level outline and current volumes of a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new OutlineService(context);
      const result = service.showStoryOutline(options.project);

      console.table([
        {
          project_id: result.project.id,
          project_name: result.project.name,
          story_outline_id: result.outline?.id ?? "",
          story_outline_title: result.outline?.title ?? "",
          volume_count: result.volumes.length
        }
      ]);

      if (!result.outline) {
        logger.info("No story outline found.");
      } else {
        console.log("## story_outline");
        console.log(`title: ${result.outline.title}`);
        console.log(`summary: ${result.outline.summary ?? ""}`);
        console.log(`goal: ${result.outline.goal ?? ""}`);
        console.log(`conflict: ${result.outline.conflict ?? ""}`);
        console.log(`outcome: ${result.outline.outcome ?? ""}`);
      }

      if (result.volumes.length === 0) {
        logger.info("No volumes found.");
        return;
      }

      console.table(
        result.volumes.map((outlineRecord) => ({
          id: outlineRecord.id,
          title: outlineRecord.title,
          parent: outlineRecord.parent_title ?? "",
          position: outlineRecord.position,
          goal: outlineRecord.goal ?? ""
        }))
      );
    });

  outline
    .command("add")
    .description("Add an outline node to a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--type <type>", "Outline node type")
    .requiredOption("--title <title>", "Outline title")
    .option("--parent <id>", "Parent outline id", (value: string) =>
      parseOptionalIntegerOption(value, "--parent")
    )
    .option("--summary <summary>", "Outline summary")
    .option("--goal <goal>", "Narrative goal")
    .option("--conflict <conflict>", "Main conflict")
    .option("--outcome <outcome>", "Expected outcome")
    .option("--position <number>", "Sibling order", (value: string) =>
      parseOptionalIntegerOption(value, "--position")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new OutlineService(context);
      const outlineRecord = service.createOutline({
        projectId: options.project,
        parentId: options.parent,
        nodeType: options.type,
        title: options.title,
        summary: options.summary,
        goal: options.goal,
        conflict: options.conflict,
        outcome: options.outcome,
        position: options.position
      });

      console.table([
        {
          id: outlineRecord.id,
          project_id: outlineRecord.project_id,
          parent_id: outlineRecord.parent_id ?? "",
          type: outlineRecord.node_type,
          title: outlineRecord.title,
          position: outlineRecord.position
        }
      ]);
    });

  outline
    .command("list")
    .description("List outline nodes in a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new OutlineService(context);
      const outlines = service.listOutlines(options.project);

      if (outlines.length === 0) {
        logger.info("No outlines found.");
        return;
      }

      console.table(
        outlines.map((outlineRecord) => ({
          id: outlineRecord.id,
          parent: outlineRecord.parent_title ?? "",
          type: outlineRecord.node_type,
          title: outlineRecord.title,
          position: outlineRecord.position,
          goal: outlineRecord.goal ?? ""
        }))
      );
    });
}
