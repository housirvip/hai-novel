import type Database from "better-sqlite3";
import type {
  CharacterItemListItem,
  CharacterItemRecord,
  CreateCharacterItemInput,
  RemoveCharacterItemInput
} from "../../domain/types/index.js";

export class CharacterItemRepository {
  constructor(private readonly database: Database.Database) {}

  // 新建人物持有物关系，表示某个物品从某时点开始进入该角色手中。
  create(input: CreateCharacterItemInput): CharacterItemRecord {
    const statement = this.database.prepare<
      [number, number, number, string, number, number, string | null, number | null],
      { id: number }
    >(
      `INSERT INTO character_items (
        project_id, character_id, item_id, ownership_type, quantity, is_equipped, note, start_chapter_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.characterId,
      input.itemId,
      input.ownershipType ?? "own",
      input.quantity ?? 1,
      input.isEquipped ? 1 : 0,
      input.note ?? null,
      input.startChapterId ?? null
    );

    const record = this.findById(Number(result.lastInsertRowid));
    if (!record) {
      throw new Error("Failed to load character-item link after creation.");
    }

    return record;
  }

  // 结束持有关系时仅补结束章节和备注，不物理删除，便于回溯剧情流转。
  endOwnership(input: RemoveCharacterItemInput): CharacterItemRecord {
    const existing = this.findById(input.linkId);
    if (!existing) {
      throw new Error(`Character item link ${input.linkId} not found.`);
    }

    const statement = this.database.prepare<
      [number | null, string | null, number],
      { changes: number }
    >(
      `UPDATE character_items
       SET end_chapter_id = ?,
           note = COALESCE(?, note),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );

    statement.run(input.endChapterId ?? existing.end_chapter_id, input.note ?? null, input.linkId);

    const updated = this.findById(input.linkId);
    if (!updated) {
      throw new Error(`Failed to load character item link ${input.linkId} after update.`);
    }

    return updated;
  }

  // 查询人物持有物关系明细，并带出角色名、物品名和章节标题方便直接展示。
  findAllByProjectId(
    projectId: number,
    filters?: { characterId?: number; itemId?: number; activeOnly?: boolean; limit?: number }
  ): CharacterItemListItem[] {
    const conditions: string[] = ["ci.project_id = ?"];
    const params: number[] = [projectId];

    if (filters?.characterId !== undefined) {
      conditions.push("ci.character_id = ?");
      params.push(filters.characterId);
    }

    if (filters?.itemId !== undefined) {
      conditions.push("ci.item_id = ?");
      params.push(filters.itemId);
    }

    if (filters?.activeOnly === true) {
      // 结束章节为空表示当前仍处于持有中。
      conditions.push("ci.end_chapter_id IS NULL");
    }

    const limitClause = filters?.limit !== undefined ? " LIMIT ?" : "";
    const queryParams = filters?.limit !== undefined ? [...params, filters.limit] : params;

    const statement = this.database.prepare<number[], CharacterItemListItem>(
      `SELECT
         ci.id,
         ci.project_id,
         ci.character_id,
         ci.item_id,
         ci.ownership_type,
         ci.quantity,
         ci.is_equipped,
         ci.note,
         ci.start_chapter_id,
         ci.end_chapter_id,
         ci.created_at,
         ci.updated_at,
         c.name AS character_name,
         i.name AS item_name,
         sc.title AS start_chapter_title,
         ec.title AS end_chapter_title
       FROM character_items ci
       JOIN characters c ON c.id = ci.character_id
       JOIN items i ON i.id = ci.item_id
       LEFT JOIN chapters sc ON sc.id = ci.start_chapter_id
       LEFT JOIN chapters ec ON ec.id = ci.end_chapter_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ci.updated_at DESC, ci.id DESC${limitClause}`
    );

    return statement.all(...queryParams);
  }

  // 通过关系主键读取原始持有关系记录。
  findById(id: number): CharacterItemRecord | undefined {
    const statement = this.database.prepare<[number], CharacterItemRecord>(
      `SELECT
         id,
         project_id,
         character_id,
         item_id,
         ownership_type,
         quantity,
         is_equipped,
         note,
         start_chapter_id,
         end_chapter_id,
         created_at,
         updated_at
       FROM character_items
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
