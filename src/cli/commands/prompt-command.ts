import path from "node:path";
import { writeFile } from "node:fs/promises";
import { Command } from "commander";
import {
  loadRuntimeContext,
  relativeToAppRoot
} from "../../app/services/context-service.js";
import { PromptService } from "../../app/services/prompt-service.js";
import { logger } from "../../utils/logger.js";
import { ensureDir } from "../../utils/paths.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";
import type { PromptBundle } from "../../domain/types/index.js";

function printPromptBundle(bundle: PromptBundle): void {
  console.table([
    {
      template_key: bundle.template.key,
      template_name: bundle.template.name,
      template_version: bundle.template.version,
      template_summary: bundle.template.summary
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

function renderPromptBundle(bundle: PromptBundle): string {
  return [
    `# ${bundle.template.name}`,
    "",
    "## template",
    `- key: ${bundle.template.key}`,
    `- version: ${bundle.template.version}`,
    `- summary: ${bundle.template.summary}`,
    "",
    "## systemPrompt",
    bundle.systemPrompt,
    "",
    "## prompt",
    bundle.prompt,
    "",
    "## contextText",
    bundle.contextText,
    ""
  ].join("\n");
}

function resolvePromptSavePath(input: {
  appRoot: string;
  exportsDir: string;
  template: string;
  explicitPath?: string | boolean;
  identitySuffix: string;
}): string | undefined {
  if (input.explicitPath === undefined || input.explicitPath === false) {
    return undefined;
  }

  if (typeof input.explicitPath === "string") {
    return path.resolve(input.appRoot, input.explicitPath);
  }

  return path.join(
    input.exportsDir,
    "prompts",
    `${input.template}-${input.identitySuffix}.md`
  );
}

async function savePromptBundleIfNeeded(input: {
  appRoot: string;
  exportsDir: string;
  template: string;
  bundle: PromptBundle;
  save?: string | boolean;
  identitySuffix: string;
}): Promise<void> {
  const targetPath = resolvePromptSavePath({
    appRoot: input.appRoot,
    exportsDir: input.exportsDir,
    template: input.template,
    explicitPath: input.save,
    identitySuffix: input.identitySuffix
  });

  if (!targetPath) {
    return;
  }

  await ensureDir(path.dirname(targetPath));
  await writeFile(targetPath, renderPromptBundle(input.bundle), "utf8");
  logger.success(`prompt:save file=${relativeToAppRoot(input.appRoot, targetPath)}`);
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
    .option("--save [path]", "Save prompt bundle to a file")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new PromptService(context);
      const bundle = service.buildChapterPlanPrompt({
        projectId: options.project,
        chapterId: options.chapter,
        intent: options.intent
      });
      await savePromptBundleIfNeeded({
        appRoot: context.appRoot,
        exportsDir: context.exportsDir,
        template: bundle.template.key,
        bundle,
        save: options.save,
        identitySuffix: `project-${options.project}-chapter-${options.chapter}`
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
    .option("--save [path]", "Save prompt bundle to a file")
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
      await savePromptBundleIfNeeded({
        appRoot: context.appRoot,
        exportsDir: context.exportsDir,
        template: bundle.template.key,
        bundle,
        save: options.save,
        identitySuffix: `project-${options.project}-chapter-${options.chapter}`
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
    .option("--save [path]", "Save prompt bundle to a file")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new PromptService(context);
      const bundle = service.buildDraftFixPrompt({
        draftId: options.draft,
        notes: options.notes
      });
      await savePromptBundleIfNeeded({
        appRoot: context.appRoot,
        exportsDir: context.exportsDir,
        template: bundle.template.key,
        bundle,
        save: options.save,
        identitySuffix: `draft-${options.draft}`
      });
      printPromptBundle(bundle);
    });
}
