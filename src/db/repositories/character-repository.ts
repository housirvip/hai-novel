import type Database from "better-sqlite3";
import type {
  CharacterListItem,
  CharacterRecord,
  CreateCharacterInput
} from "../../domain/types/index.js";

export class CharacterRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateCharacterInput): CharacterRecord {
    const statement = this.database.prepare<
      [
        number,
        string,
        string | null,
        number | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null
      ],
      { id: number }
    >(
      `INSERT INTO characters (
        project_id, name, role, faction_id, profession, profession_detail, age,
        profile, personality, goal, conflict, secret, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.name,
      input.role ?? null,
      input.factionId ?? null,
      input.profession ?? null,
      input.professionDetail ?? null,
      input.age ?? null,
      input.profile ?? null,
      input.personality ?? null,
      input.goal ?? null,
      input.conflict ?? null,
      input.secret ?? null,
      input.notes ?? null
    );

    const character = this.findById(Number(result.lastInsertRowid));
    if (!character) {
      throw new Error("Failed to load character after creation.");
    }

    return character;
  }

  findAllByProjectId(projectId: number): CharacterListItem[] {
    const statement = this.database.prepare<[number], CharacterListItem>(
      `SELECT
         c.id,
         c.project_id,
         c.name,
         c.role,
         c.faction_id,
         c.profession,
         c.profession_detail,
         c.age,
         c.profile,
         c.personality,
         c.goal,
         c.conflict,
         c.secret,
         c.notes,
         c.created_at,
         c.updated_at,
         f.name AS faction_name
       FROM characters c
       LEFT JOIN factions f ON f.id = c.faction_id
       WHERE c.project_id = ?
       ORDER BY c.id ASC`
    );
    return statement.all(projectId);
  }

  findById(id: number): CharacterRecord | undefined {
    const statement = this.database.prepare<[number], CharacterRecord>(
      `SELECT
         id,
         project_id,
         name,
         role,
         faction_id,
         profession,
         profession_detail,
         age,
         profile,
         personality,
         goal,
         conflict,
         secret,
         notes,
         created_at,
         updated_at
       FROM characters
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
