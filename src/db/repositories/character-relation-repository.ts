import type Database from "better-sqlite3";
import type {
  CharacterRelationListItem,
  CharacterRelationRecord,
  CreateCharacterRelationInput
} from "../../domain/types/index.js";

export class CharacterRelationRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateCharacterRelationInput): CharacterRelationRecord {
    const statement = this.database.prepare<
      [number, number, number, string, string | null, string | null, number | null, string | null],
      { id: number }
    >(
      `INSERT INTO character_relations (
        project_id, character_id, related_character_id, relation_type, summary, details, intensity, visibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.characterId,
      input.relatedCharacterId,
      input.relationType,
      input.summary ?? null,
      input.details ?? null,
      input.intensity ?? null,
      input.visibility ?? null
    );

    // 插入后重新查询一次，保证返回值和列表查询使用同一套读取结构。
    const relation = this.findById(Number(result.lastInsertRowid));
    if (!relation) {
      throw new Error("Failed to load character relation after creation.");
    }

    return relation;
  }

  findAllByProjectId(projectId: number, characterId?: number): CharacterRelationListItem[] {
    const baseSql = `
      SELECT
        cr.id,
        cr.project_id,
        cr.character_id,
        cr.related_character_id,
        cr.relation_type,
        cr.summary,
        cr.details,
        cr.intensity,
        cr.visibility,
        cr.status,
        cr.created_at,
        cr.updated_at,
        c1.name AS character_name,
        c2.name AS related_character_name
      FROM character_relations cr
      JOIN characters c1 ON c1.id = cr.character_id
      JOIN characters c2 ON c2.id = cr.related_character_id
      WHERE cr.project_id = ?
    `;

    // 过滤逻辑放在 SQL 层，命令层就能同时支持全量视图和单角色视图。
    if (characterId === undefined) {
      const statement = this.database.prepare<[number], CharacterRelationListItem>(
        `${baseSql} ORDER BY cr.id ASC`
      );
      return statement.all(projectId);
    }

    const statement = this.database.prepare<[number, number, number], CharacterRelationListItem>(
      `${baseSql}
       AND (cr.character_id = ? OR cr.related_character_id = ?)
       ORDER BY cr.id ASC`
    );
    return statement.all(projectId, characterId, characterId);
  }

  findById(id: number): CharacterRelationRecord | undefined {
    const statement = this.database.prepare<[number], CharacterRelationRecord>(
      `SELECT
         id,
         project_id,
         character_id,
         related_character_id,
         relation_type,
         summary,
         details,
         intensity,
         visibility,
         status,
         created_at,
         updated_at
       FROM character_relations
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
