import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { ItemService } from "../../app/services/item-service.js";
import { logger } from "../../utils/logger.js";
import { assertInitialized, parseRequiredIntegerOption } from "../command-helpers.js";

export function registerItemCommands(program: Command): void {
  const item = program.command("item").description("Item management commands.");

  // 物品先作为独立实体沉淀，后续再通过人物持有关系与剧情状态快照串起来。
  item
    .command("add")
    .description("Add an item to a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--name <name>", "Item name")
    .option("--category <category>", "Item category")
    .option("--rarity <rarity>", "Item rarity")
    .option("--description <description>", "Item description")
    .option("--origin <origin>", "Item origin")
    .option("--status <status>", "Item status")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ItemService(context);
      const itemRecord = service.createItem({
        projectId: options.project,
        name: options.name,
        category: options.category,
        rarity: options.rarity,
        description: options.description,
        origin: options.origin,
        status: options.status
      });

      console.table([
        {
          id: itemRecord.id,
          project_id: itemRecord.project_id,
          name: itemRecord.name,
          category: itemRecord.category ?? "",
          rarity: itemRecord.rarity ?? "",
          status: itemRecord.status
        }
      ]);
    })
    .addHelpText(
      "after",
      `
Examples:
  novel item add --project 1 --name "黑玉佩" --category artifact --rarity rare
  novel item add --project 1 --name "掌门令" --status sealed`
    );

  // 物品列表会额外显示当前活跃持有人数，帮助作者快速判断道具是否正在剧情里流转。
  item
    .command("list")
    .description("List items in a project.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ItemService(context);
      const items = service.listItems(options.project);

      if (items.length === 0) {
        logger.info("No items found.");
        return;
      }

      console.table(
        items.map((itemRecord) => ({
          id: itemRecord.id,
          name: itemRecord.name,
          category: itemRecord.category ?? "",
          rarity: itemRecord.rarity ?? "",
          status: itemRecord.status,
          active_holders: itemRecord.active_holder_count
        }))
      );
    })
    .addHelpText(
      "after",
      `
Examples:
  novel item list --project 1`
    );

  // 详情页除了物品本体外，也会把历次持有关系拉出来，方便追踪“谁拿过它”。
  item
    .command("show")
    .description("Show an item and its holder timeline.")
    .requiredOption("--item <id>", "Item id", (value: string) =>
      parseRequiredIntegerOption(value, "--item")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new ItemService(context);
      const result = service.showItem(options.item);

      console.table([
        {
          id: result.item.id,
          project_id: result.item.project_id,
          name: result.item.name,
          category: result.item.category ?? "",
          rarity: result.item.rarity ?? "",
          status: result.item.status
        }
      ]);

      if (result.item.description) {
        logger.info(`description: ${result.item.description}`);
      }

      if (result.item.origin) {
        logger.info(`origin: ${result.item.origin}`);
      }

      if (result.holders.length === 0) {
        logger.info("No character holders found for this item.");
        return;
      }

      console.table(
        result.holders.map((holder) => ({
          id: holder.id,
          character: holder.character_name,
          ownership_type: holder.ownership_type,
          quantity: holder.quantity,
          equipped: holder.is_equipped === 1 ? "yes" : "no",
          start: holder.start_chapter_title ?? "",
          end: holder.end_chapter_title ?? "",
          note: holder.note ?? ""
        }))
      );
    })
    .addHelpText(
      "after",
      `
Examples:
  novel item show --item 1`
    );
}
