import { createDatabase } from "../../db/client.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { CharacterItemRepository } from "../../db/repositories/character-item-repository.js";
import { ItemRepository } from "../../db/repositories/item-repository.js";
import type {
  CharacterItemListItem,
  CharacterItemRecord,
  CreateCharacterItemInput,
  CreateItemInput,
  ItemListItem,
  ItemRecord,
  ItemShowResult,
  RemoveCharacterItemInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class ItemService {
  constructor(private readonly context: RuntimeContext) {}

  // 创建独立物品档案，供后续人物持有关系和状态快照引用。
  createItem(input: CreateItemInput): ItemRecord {
    logger.start(`item:add project=${input.projectId} name="${input.name}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new ItemRepository(database);
      const item = repository.create(input);
      logger.success(`item:add id=${item.id} name="${item.name}"`);
      return item;
    } finally {
      database.close();
    }
  }

  // 按项目查看物品清单，列表页会带上活跃持有人统计。
  listItems(projectId: number): ItemListItem[] {
    logger.start(`item:list project=${projectId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new ItemRepository(database);
      const items = repository.findAllByProjectId(projectId);
      logger.success(`item:list count=${items.length}`);
      return items;
    } finally {
      database.close();
    }
  }

  // 查看单个物品详情，并拼出它与人物之间的流转时间线。
  showItem(itemId: number): ItemShowResult {
    logger.start(`item:show item=${itemId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const itemRepository = new ItemRepository(database);
      const characterItemRepository = new CharacterItemRepository(database);
      const item = itemRepository.findById(itemId);

      if (!item) {
        throw new Error(`Item ${itemId} not found.`);
      }

      const holders = characterItemRepository.findAllByProjectId(item.project_id, {
        itemId
      });

      logger.success(`item:show item=${itemId} holders=${holders.length}`);
      return {
        item,
        holders
      };
    } finally {
      database.close();
    }
  }

  // 新建一条人物持有物关系，表示某个角色从某章开始持有该物品。
  addCharacterItem(input: CreateCharacterItemInput): CharacterItemRecord {
    logger.start(
      `character:item:add project=${input.projectId} character=${input.characterId} item=${input.itemId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const characterRepository = new CharacterRepository(database);
      const itemRepository = new ItemRepository(database);
      const chapterRepository = new ChapterRepository(database);
      const repository = new CharacterItemRepository(database);

      this.assertCharacterBelongsToProject(characterRepository, input.characterId, input.projectId);
      this.assertItemBelongsToProject(itemRepository, input.itemId, input.projectId);
      if (input.startChapterId !== undefined) {
        this.assertChapterBelongsToProject(chapterRepository, input.startChapterId, input.projectId);
      }

      const link = repository.create(input);
      logger.success(`character:item:add link=${link.id}`);
      return link;
    } finally {
      database.close();
    }
  }

  // 按项目拉取人物持有物关系，并支持在命令层做多维筛选。
  listCharacterItems(
    projectId: number,
    filters?: { characterId?: number; itemId?: number; activeOnly?: boolean }
  ): CharacterItemListItem[] {
    logger.start(
      `character:item:list project=${projectId}${
        filters?.characterId !== undefined ? ` character=${filters.characterId}` : ""
      }${filters?.itemId !== undefined ? ` item=${filters.itemId}` : ""}${
        filters?.activeOnly === true ? " active_only=yes" : ""
      }`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new CharacterItemRepository(database);
      const links = repository.findAllByProjectId(projectId, filters);
      logger.success(`character:item:list count=${links.length}`);
      return links;
    } finally {
      database.close();
    }
  }

  // 结束一条持有关系，而不是直接删除记录，便于保留完整剧情历史。
  removeCharacterItem(input: RemoveCharacterItemInput): CharacterItemRecord {
    logger.start(`character:item:remove link=${input.linkId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const chapterRepository = new ChapterRepository(database);
      const repository = new CharacterItemRepository(database);
      const current = repository.findById(input.linkId);
      if (!current) {
        throw new Error(`Character item link ${input.linkId} not found.`);
      }

      if (input.endChapterId !== undefined) {
        this.assertChapterBelongsToProject(
          chapterRepository,
          input.endChapterId,
          current.project_id
        );
      }

      const link = repository.endOwnership(input);
      logger.success(`character:item:remove link=${link.id}`);
      return link;
    } finally {
      database.close();
    }
  }

  private assertCharacterBelongsToProject(
    repository: CharacterRepository,
    characterId: number,
    projectId: number
  ): void {
    const character = repository.findById(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found.`);
    }

    if (character.project_id !== projectId) {
      throw new Error(
        `Character ${characterId} does not belong to project ${projectId}.`
      );
    }
  }

  private assertItemBelongsToProject(
    repository: ItemRepository,
    itemId: number,
    projectId: number
  ): void {
    const item = repository.findById(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found.`);
    }

    if (item.project_id !== projectId) {
      throw new Error(`Item ${itemId} does not belong to project ${projectId}.`);
    }
  }

  private assertChapterBelongsToProject(
    repository: ChapterRepository,
    chapterId: number,
    projectId: number
  ): void {
    const chapter = repository.findById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found.`);
    }

    if (chapter.project_id !== projectId) {
      throw new Error(`Chapter ${chapterId} does not belong to project ${projectId}.`);
    }
  }
}
