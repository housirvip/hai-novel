import { createDatabase } from "../../db/client.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import type {
  CharacterListItem,
  CharacterRecord,
  CreateCharacterInput
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class CharacterService {
  constructor(private readonly context: RuntimeContext) {}

  createCharacter(input: CreateCharacterInput): CharacterRecord {
    logger.start(`character:add project=${input.projectId} name="${input.name}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new CharacterRepository(database);
      const character = repository.create(input);
      logger.success(`character:add id=${character.id} name="${character.name}"`);
      return character;
    } finally {
      database.close();
    }
  }

  listCharacters(projectId: number): CharacterListItem[] {
    logger.start(`character:list project=${projectId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new CharacterRepository(database);
      const characters = repository.findAllByProjectId(projectId);
      logger.success(`character:list count=${characters.length}`);
      return characters;
    } finally {
      database.close();
    }
  }
}
