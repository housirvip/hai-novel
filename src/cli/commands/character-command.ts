import { Command } from "commander";
import { CharacterService } from "../../app/services/character-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerCharacterCommands(program: Command): void {
  const character = program.command("character").description("Character management commands.");

  character
    .command("add")
    .description("Add a character to a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--name <name>", "Character name")
    .option("--role <role>", "Character role")
    .option("--faction <id>", "Faction id", (value: string) =>
      parseOptionalIntegerOption(value, "--faction")
    )
    .option("--profession <profession>", "Character profession")
    .option("--profession-detail <detail>", "Character profession detail")
    .option("--age <age>", "Character age")
    .option("--profile <profile>", "Character profile")
    .option("--personality <personality>", "Character personality")
    .option("--goal <goal>", "Character goal")
    .option("--conflict <conflict>", "Character conflict")
    .option("--secret <secret>", "Character secret")
    .option("--notes <notes>", "Character notes")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new CharacterService(context);
      const characterRecord = service.createCharacter({
        projectId: options.project,
        name: options.name,
        role: options.role,
        factionId: options.faction,
        profession: options.profession,
        professionDetail: options.professionDetail,
        age: options.age,
        profile: options.profile,
        personality: options.personality,
        goal: options.goal,
        conflict: options.conflict,
        secret: options.secret,
        notes: options.notes
      });

      console.table([
        {
          id: characterRecord.id,
          project_id: characterRecord.project_id,
          name: characterRecord.name,
          role: characterRecord.role ?? "",
          faction_id: characterRecord.faction_id ?? "",
          profession: characterRecord.profession ?? "",
          created_at: characterRecord.created_at
        }
      ]);
    });

  character
    .command("list")
    .description("List characters in a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new CharacterService(context);
      const characters = service.listCharacters(options.project);

      if (characters.length === 0) {
        logger.info("No characters found.");
        return;
      }

      console.table(
        characters.map((characterRecord) => ({
          id: characterRecord.id,
          name: characterRecord.name,
          role: characterRecord.role ?? "",
          faction: characterRecord.faction_name ?? "",
          profession: characterRecord.profession ?? "",
          goal: characterRecord.goal ?? ""
        }))
      );
    });
}
