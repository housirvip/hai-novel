import { createDatabase } from "../../db/client.js";
import { CharacterFactionRelationRepository } from "../../db/repositories/character-faction-relation-repository.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { CharacterRelationRepository } from "../../db/repositories/character-relation-repository.js";
import { FactionRepository } from "../../db/repositories/faction-repository.js";
import type {
  CharacterFactionRelationListItem,
  CharacterFactionRelationRecord,
  CharacterRelationListItem,
  CharacterRelationRecord,
  CreateCharacterFactionRelationInput,
  CreateCharacterRelationInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class RelationService {
  constructor(private readonly context: RuntimeContext) {}

  createCharacterRelation(input: CreateCharacterRelationInput): CharacterRelationRecord {
    logger.start(
      `relation:character:add project=${input.projectId} from=${input.characterId} to=${input.relatedCharacterId}`
    );

    // 关系命令后面还会继续扩展，所以先把数据库管理收口在 service 层。
    const database = createDatabase(this.context.dbPath);
    try {
      const characterRepository = new CharacterRepository(database);
      const repository = new CharacterRelationRepository(database);

      this.assertCharacterBelongsToProject(characterRepository, input.characterId, input.projectId);
      this.assertCharacterBelongsToProject(
        characterRepository,
        input.relatedCharacterId,
        input.projectId
      );

      const relation = repository.create(input);
      logger.success(`relation:character:add id=${relation.id}`);
      return relation;
    } finally {
      database.close();
    }
  }

  listCharacterRelations(projectId: number, characterId?: number): CharacterRelationListItem[] {
    logger.start(
      characterId === undefined
        ? `relation:character:list project=${projectId}`
        : `relation:character:list project=${projectId} character=${characterId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new CharacterRelationRepository(database);
      const relations = repository.findAllByProjectId(projectId, characterId);
      logger.success(`relation:character:list count=${relations.length}`);
      return relations;
    } finally {
      database.close();
    }
  }

  createCharacterFactionRelation(
    input: CreateCharacterFactionRelationInput
  ): CharacterFactionRelationRecord {
    logger.start(
      `relation:faction:add project=${input.projectId} character=${input.characterId} faction=${input.factionId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const characterRepository = new CharacterRepository(database);
      const factionRepository = new FactionRepository(database);
      const repository = new CharacterFactionRelationRepository(database);

      this.assertCharacterBelongsToProject(characterRepository, input.characterId, input.projectId);
      this.assertFactionBelongsToProject(factionRepository, input.factionId, input.projectId);

      const relation = repository.create(input);
      logger.success(`relation:faction:add id=${relation.id}`);
      return relation;
    } finally {
      database.close();
    }
  }

  listCharacterFactionRelations(
    projectId: number,
    filters?: { characterId?: number; factionId?: number }
  ): CharacterFactionRelationListItem[] {
    logger.start(
      `relation:faction:list project=${projectId}${
        filters?.characterId !== undefined ? ` character=${filters.characterId}` : ""
      }${filters?.factionId !== undefined ? ` faction=${filters.factionId}` : ""}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new CharacterFactionRelationRepository(database);
      const relations = repository.findAllByProjectId(projectId, filters);
      logger.success(`relation:faction:list count=${relations.length}`);
      return relations;
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
      throw new Error(`Character ${characterId} does not belong to project ${projectId}.`);
    }
  }

  private assertFactionBelongsToProject(
    repository: FactionRepository,
    factionId: number,
    projectId: number
  ): void {
    const faction = repository.findById(factionId);
    if (!faction) {
      throw new Error(`Faction ${factionId} not found.`);
    }

    if (faction.project_id !== projectId) {
      throw new Error(`Faction ${factionId} does not belong to project ${projectId}.`);
    }
  }
}
