#!/usr/bin/env node

import { Command } from "commander";
import { registerAICommands } from "./commands/ai-command.js";
import { registerCharacterCommands } from "./commands/character-command.js";
import { registerChapterCommands } from "./commands/chapter-command.js";
import { registerContextCommands } from "./commands/context-command.js";
import { registerDraftCommands } from "./commands/draft-command.js";
import { registerFactionCommands } from "./commands/faction-command.js";
import { registerHookCommands } from "./commands/hook-command.js";
import { registerInitCommand } from "./commands/init-command.js";
import { registerLoreCommands } from "./commands/lore-command.js";
import { registerOutlineCommands } from "./commands/outline-command.js";
import { registerPlanCommands } from "./commands/plan-command.js";
import { registerProjectCommands } from "./commands/project-command.js";
import { registerPromptCommands } from "./commands/prompt-command.js";
import { registerRelationCommands } from "./commands/relation-command.js";
import { registerRunCommands } from "./commands/run-command.js";
import { registerVolumeCommands } from "./commands/volume-command.js";
import { presentCliError } from "../utils/error-presenter.js";
import { logger } from "../utils/logger.js";

const program = new Command();

program
  .name("novel")
  .description("AI novel writing CLI powered by TypeScript and SQLite.")
  .version("0.1.0");

registerAICommands(program);
registerInitCommand(program);
registerProjectCommands(program);
registerFactionCommands(program);
registerCharacterCommands(program);
registerRelationCommands(program);
registerContextCommands(program);
registerPromptCommands(program);
registerPlanCommands(program);
registerRunCommands(program);
registerLoreCommands(program);
registerOutlineCommands(program);
registerVolumeCommands(program);
registerChapterCommands(program);
registerDraftCommands(program);
registerHookCommands(program);

program.showHelpAfterError();
program.showSuggestionAfterError();

try {
  // 命令注册统一收口在这里，后续新增模块只需要接入一个入口。
  await program.parseAsync(process.argv);
} catch (error) {
  const presented = presentCliError(error);
  logger.error(`[${presented.code}] ${presented.message}`);
  if (presented.hint) {
    logger.info(`hint: ${presented.hint}`);
  }
  process.exitCode = 1;
}
