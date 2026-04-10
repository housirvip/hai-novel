import type Database from "better-sqlite3";
import type {
  CreateItemInput,
  ItemListItem,
  ItemRecord
} from "../../domain/types/index.js";

export class ItemRepository {
  constructor(private readonly database: Database.Database) {}

  // 创建物品主档案，承载相对稳定的静态信息。
  create(input: CreateItemInput): ItemRecord {
    const statement = this.database.prepare<
      [number, string, string | null, string | null, string | null, string | null, string],
      { id: number }
    >(
      `INSERT INTO items (
        project_id, name, category, rarity, description, origin, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.name,
      input.category ?? null,
      input.rarity ?? null,
      input.description ?? null,
      input.origin ?? null,
      input.status ?? "normal"
    );

    const item = this.findById(Number(result.lastInsertRowid));
    if (!item) {
      throw new Error("Failed to load item after creation.");
    }

    return item;
  }

  // 项目级物品列表，同时统计当前仍未结束的持有关系数量。
  findAllByProjectId(projectId: number, limit?: number): ItemListItem[] {
    // 这里顺手统计当前活跃持有人数量，方便列表里快速看出哪些道具正在流转。
    if (limit === undefined) {
      const statement = this.database.prepare<[number], ItemListItem>(
        `SELECT
           i.id,
           i.project_id,
           i.name,
           i.category,
           i.rarity,
           i.description,
           i.origin,
           i.status,
           i.created_at,
           i.updated_at,
           -- LEFT JOIN 在没有持有人时也会补一行全空记录，因此这里必须先确认 ci.id 存在，
           -- 才能把“未结束的持有关系”算进活跃持有人数量。
           COUNT(CASE WHEN ci.id IS NOT NULL AND ci.end_chapter_id IS NULL THEN 1 END) AS active_holder_count
         FROM items i
         LEFT JOIN character_items ci ON ci.item_id = i.id
         WHERE i.project_id = ?
         GROUP BY i.id
         ORDER BY i.id ASC`
      );
      return statement.all(projectId);
    }

    const statement = this.database.prepare<[number, number], ItemListItem>(
      `SELECT
         i.id,
         i.project_id,
         i.name,
         i.category,
         i.rarity,
         i.description,
         i.origin,
         i.status,
         i.created_at,
         i.updated_at,
         COUNT(CASE WHEN ci.id IS NOT NULL AND ci.end_chapter_id IS NULL THEN 1 END) AS active_holder_count
       FROM items i
       LEFT JOIN character_items ci ON ci.item_id = i.id
       WHERE i.project_id = ?
       GROUP BY i.id
       ORDER BY i.updated_at DESC, i.id DESC
       LIMIT ?`
    );
    return statement.all(projectId, limit);
  }

  // 通过主键读取单个物品详情。
  findById(id: number): ItemRecord | undefined {
    const statement = this.database.prepare<[number], ItemRecord>(
      `SELECT
         id,
         project_id,
         name,
         category,
         rarity,
         description,
         origin,
         status,
         created_at,
         updated_at
       FROM items
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
