import { Command } from "commander";
import { CharacterService } from "../../app/services/character-service.js";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { ItemService } from "../../app/services/item-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerCharacterCommands(program: Command): void {
  const character = program.command("character").description("Character management commands.");

  // 角色基础档案录入命令，负责把人物卡信息写入 `characters` 表。
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

  // 列出项目内所有角色，并顺手带出主归属势力名称，方便做世界观巡检。
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

  // 为角色建立持有物关系，而不是直接改写物品本体，这样可以保留流转历史。
  character
    .command("item:add")
    .description("Link an item to a character.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--character <id>", "Character id", (value: string) =>
      parseRequiredIntegerOption(value, "--character")
    )
    .requiredOption("--item <id>", "Item id", (value: string) =>
      parseRequiredIntegerOption(value, "--item")
    )
    .option("--type <type>", "Ownership type")
    .option("--quantity <number>", "Item quantity", (value: string) =>
      parseOptionalIntegerOption(value, "--quantity")
    )
    .option("--equipped", "Mark item as equipped")
    .option("--note <note>", "Ownership note")
    .option("--start-chapter <id>", "Start chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--start-chapter")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ItemService(context);
      const linkRecord = service.addCharacterItem({
        projectId: options.project,
        characterId: options.character,
        itemId: options.item,
        ownershipType: options.type,
        quantity: options.quantity,
        isEquipped: options.equipped === true,
        note: options.note,
        startChapterId: options.startChapter
      });

      console.table([
        {
          id: linkRecord.id,
          project_id: linkRecord.project_id,
          character_id: linkRecord.character_id,
          item_id: linkRecord.item_id,
          ownership_type: linkRecord.ownership_type,
          quantity: linkRecord.quantity,
          equipped: linkRecord.is_equipped === 1 ? "yes" : "no",
          start_chapter_id: linkRecord.start_chapter_id ?? ""
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel character item:add --project 1 --character 1 --item 1 --type carry --start-chapter 1
  novel character item:add --project 1 --character 1 --item 1 --equipped --note "贴身携带"`
    );

  // 查看人物与物品的关系链路，默认可按角色、物品和是否仍在持有进行筛选。
  character
    .command("item:list")
    .description("List character-item links.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .option("--character <id>", "Character id filter", (value: string) =>
      parseOptionalIntegerOption(value, "--character")
    )
    .option("--item <id>", "Item id filter", (value: string) =>
      parseOptionalIntegerOption(value, "--item")
    )
    .option("--active-only", "Only show active ownership links")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ItemService(context);
      const links = service.listCharacterItems(options.project, {
        characterId: options.character,
        itemId: options.item,
        activeOnly: options.activeOnly === true
      });

      if (links.length === 0) {
        logger.info("No character-item links found.");
        return;
      }

      console.table(
        links.map((linkRecord) => ({
          id: linkRecord.id,
          character: linkRecord.character_name,
          item: linkRecord.item_name,
          ownership_type: linkRecord.ownership_type,
          quantity: linkRecord.quantity,
          equipped: linkRecord.is_equipped === 1 ? "yes" : "no",
          active: linkRecord.end_chapter_id === null ? "yes" : "no",
          start: linkRecord.start_chapter_title ?? "",
          end: linkRecord.end_chapter_title ?? "",
          note: linkRecord.note ?? ""
        }))
      );
    })
    .addHelpText(
      "after",
      `
Examples:
  novel character item:list --project 1
  novel character item:list --project 1 --character 1 --active-only`
    );

  // 结束一条持有关系时优先使用 link id，避免同一人物多次持有同一物品时发生歧义。
  character
    .command("item:remove")
    .description("End a character-item link.")
    .requiredOption("--link <id>", "Character item link id", (value: string) =>
      parseRequiredIntegerOption(value, "--link")
    )
    .option("--end-chapter <id>", "End chapter id", (value: string) =>
      parseOptionalIntegerOption(value, "--end-chapter")
    )
    .option("--note <note>", "Closing note")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ItemService(context);
      const linkRecord = service.removeCharacterItem({
        linkId: options.link,
        endChapterId: options.endChapter,
        note: options.note
      });

      console.table([
        {
          id: linkRecord.id,
          character_id: linkRecord.character_id,
          item_id: linkRecord.item_id,
          end_chapter_id: linkRecord.end_chapter_id ?? "",
          note: linkRecord.note ?? ""
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel character item:remove --link 1
  novel character item:remove --link 1 --end-chapter 2 --note "暂时交由长老保管"`
    );
}
