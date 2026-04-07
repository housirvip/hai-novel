import { createDatabase } from "../../db/client.js";
import { OutlineRepository } from "../../db/repositories/outline-repository.js";
import type {
  CreateOutlineInput,
  OutlineListItem,
  OutlineRecord
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class OutlineService {
  constructor(private readonly context: RuntimeContext) {}

  createOutline(input: CreateOutlineInput): OutlineRecord {
    logger.start(`outline:add project=${input.projectId} title="${input.title}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new OutlineRepository(database);
      const outline = repository.create(input);
      logger.success(`outline:add id=${outline.id} title="${outline.title}"`);
      return outline;
    } finally {
      database.close();
    }
  }

  listOutlines(projectId: number): OutlineListItem[] {
    logger.start(`outline:list project=${projectId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new OutlineRepository(database);
      const outlines = repository.findAllByProjectId(projectId);
      logger.success(`outline:list count=${outlines.length}`);
      return outlines;
    } finally {
      database.close();
    }
  }
}
