import type Database from "better-sqlite3";
import type {
  CharacterFactionRelationListItem,
  CharacterFactionRelationRecord,
  CreateCharacterFactionRelationInput
} from "../../domain/types/index.js";

export class CharacterFactionRelationRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateCharacterFactionRelationInput): CharacterFactionRelationRecord {
    const statement = this.database.prepare<
      [
        number,
        number,
        number,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        number
      ],
      { id: number }
    >(
      `INSERT INTO character_faction_relations (
        project_id, character_id, faction_id, relation_type, title, stance, summary, details, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.characterId,
      input.factionId,
      input.relationType,
      input.title ?? null,
      input.stance ?? null,
      input.summary ?? null,
      input.details ?? null,
      input.isPrimary ? 1 : 0
    );

    // 插入后重新查询一次，保证返回值和列表查询使用同一套读取结构。
    const relation = this.findById(Number(result.lastInsertRowid));
    if (!relation) {
      throw new Error("Failed to load character-faction relation after creation.");
    }

    return relation;
  }

  findAllByProjectId(
    projectId: number,
    filters?: { characterId?: number; factionId?: number }
  ): CharacterFactionRelationListItem[] {
    // 逐步拼接过滤条件，让一个查询同时支持项目全量和按人物/势力筛选。
    const conditions: string[] = ["cfr.project_id = ?"];
    const params: number[] = [projectId];

    if (filters?.characterId !== undefined) {
      conditions.push("cfr.character_id = ?");
      params.push(filters.characterId);
    }

    if (filters?.factionId !== undefined) {
      conditions.push("cfr.faction_id = ?");
      params.push(filters.factionId);
    }

    const statement = this.database.prepare<number[], CharacterFactionRelationListItem>(
      `SELECT
         cfr.id,
         cfr.project_id,
         cfr.character_id,
         cfr.faction_id,
         cfr.relation_type,
         cfr.title,
         cfr.stance,
         cfr.summary,
         cfr.details,
         cfr.is_primary,
         cfr.status,
         cfr.created_at,
         cfr.updated_at,
         c.name AS character_name,
         f.name AS faction_name
       FROM character_faction_relations cfr
       JOIN characters c ON c.id = cfr.character_id
       JOIN factions f ON f.id = cfr.faction_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY cfr.id ASC`
    );
    return statement.all(...params);
  }

  findById(id: number): CharacterFactionRelationRecord | undefined {
    const statement = this.database.prepare<[number], CharacterFactionRelationRecord>(
      `SELECT
         id,
         project_id,
         character_id,
         faction_id,
         relation_type,
         title,
         stance,
         summary,
         details,
         is_primary,
         status,
         created_at,
         updated_at
       FROM character_faction_relations
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
