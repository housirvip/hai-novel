import { createDatabase } from "../../db/client.js";
import { CharacterFactionRelationRepository } from "../../db/repositories/character-faction-relation-repository.js";
import { CharacterRelationRepository } from "../../db/repositories/character-relation-repository.js";
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

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new CharacterRelationRepository(database);
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
      const repository = new CharacterFactionRelationRepository(database);
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
}
