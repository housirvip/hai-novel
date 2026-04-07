import { createDatabase } from "../../db/client.js";
import { LoreRepository } from "../../db/repositories/lore-repository.js";
import type {
  CreateLoreEntryInput,
  LoreEntryRecord
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class LoreService {
  constructor(private readonly context: RuntimeContext) {}

  createLoreEntry(input: CreateLoreEntryInput): LoreEntryRecord {
    logger.start(`lore:add project=${input.projectId} type=${input.type} title="${input.title}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new LoreRepository(database);
      const lore = repository.create(input);
      logger.success(`lore:add id=${lore.id} title="${lore.title}"`);
      return lore;
    } finally {
      database.close();
    }
  }

  listLoreEntries(projectId: number, type?: string): LoreEntryRecord[] {
    logger.start(
      type ? `lore:list project=${projectId} type=${type}` : `lore:list project=${projectId}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new LoreRepository(database);
      const entries = repository.findAllByProjectId(projectId, type);
      logger.success(`lore:list count=${entries.length}`);
      return entries;
    } finally {
      database.close();
    }
  }
}
