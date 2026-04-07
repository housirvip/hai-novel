import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { PromptService } from "../../app/services/prompt-service.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

function printPromptBundle(bundle: {
  template: string;
  systemPrompt: string;
  prompt: string;
  contextText: string;
}): void {
  console.table([
    {
      template: bundle.template
    }
  ]);

  console.log("## systemPrompt");
  console.log(bundle.systemPrompt);
  console.log("");
  console.log("## prompt");
  console.log(bundle.prompt);
  console.log("");
  console.log("## contextText");
  console.log(bundle.contextText);
}

export function registerPromptCommands(program: Command): void {
  const prompt = program.command("prompt").description("Prompt inspection commands.");

  prompt
    .command("chapter-plan")
    .description("Show the prompt bundle for chapter plan generation.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .option("--intent <text>", "Author intent")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new PromptService(context);
      const bundle = service.buildChapterPlanPrompt({
        projectId: options.project,
        chapterId: options.chapter,
        intent: options.intent
      });
      printPromptBundle(bundle);
    });

  prompt
    .command("draft-write")
    .description("Show the prompt bundle for draft writing.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--chapter <id>", "Chapter id", (value: string) =>
      parseRequiredIntegerOption(value, "--chapter")
    )
    .option("--plan <id>", "Plan id", (value: string) =>
      parseOptionalIntegerOption(value, "--plan")
    )
    .option("--instruction <text>", "Extra instruction")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new PromptService(context);
      const bundle = service.buildDraftWritePrompt({
        projectId: options.project,
        chapterId: options.chapter,
        planId: options.plan,
        instruction: options.instruction
      });
      printPromptBundle(bundle);
    });

  prompt
    .command("draft-fix")
    .description("Show the prompt bundle for draft fixing.")
    .requiredOption("--draft <id>", "Draft id", (value: string) =>
      parseRequiredIntegerOption(value, "--draft")
    )
    .option("--notes <text>", "Extra notes")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new PromptService(context);
      const bundle = service.buildDraftFixPrompt({
        draftId: options.draft,
        notes: options.notes
      });
      printPromptBundle(bundle);
    });
}
