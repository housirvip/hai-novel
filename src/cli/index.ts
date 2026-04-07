#!/usr/bin/env node

import { Command } from "commander";
import { registerCharacterCommands } from "./commands/character-command.js";
import { registerFactionCommands } from "./commands/faction-command.js";
import { registerInitCommand } from "./commands/init-command.js";
import { registerProjectCommands } from "./commands/project-command.js";
import { registerRelationCommands } from "./commands/relation-command.js";
import { logger } from "../utils/logger.js";

const program = new Command();

program
  .name("novel")
  .description("AI novel writing CLI powered by TypeScript and SQLite.")
  .version("0.1.0");

registerInitCommand(program);
registerProjectCommands(program);
registerFactionCommands(program);
registerCharacterCommands(program);
registerRelationCommands(program);

program.showHelpAfterError();

try {
  // 命令注册统一收口在这里，后续新增模块只需要接入一个入口。
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exitCode = 1;
}
