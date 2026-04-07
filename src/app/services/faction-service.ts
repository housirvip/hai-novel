import { createDatabase } from "../../db/client.js";
import { FactionRepository } from "../../db/repositories/faction-repository.js";
import type { CreateFactionInput, FactionRecord } from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class FactionService {
  constructor(private readonly context: RuntimeContext) {}

  createFaction(input: CreateFactionInput): FactionRecord {
    logger.start(`faction:add project=${input.projectId} name="${input.name}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new FactionRepository(database);
      const faction = repository.create(input);
      logger.success(`faction:add id=${faction.id} name="${faction.name}"`);
      return faction;
    } finally {
      database.close();
    }
  }

  listFactions(projectId: number): FactionRecord[] {
    logger.start(`faction:list project=${projectId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new FactionRepository(database);
      const factions = repository.findAllByProjectId(projectId);
      logger.success(`faction:list count=${factions.length}`);
      return factions;
    } finally {
      database.close();
    }
  }
}
