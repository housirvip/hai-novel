import { createDatabase } from "../../db/client.js";
import { GenerationRunRepository } from "../../db/repositories/generation-run-repository.js";
import type {
  FindGenerationRunsInput,
  GenerationRunListItem,
  GenerationRunRecord
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class RunService {
  constructor(private readonly context: RuntimeContext) {}

  listRuns(filters?: FindGenerationRunsInput): GenerationRunListItem[] {
    logger.start(
      `run:history${
        filters?.projectId !== undefined ? ` project=${filters.projectId}` : ""
      }${filters?.chapterId !== undefined ? ` chapter=${filters.chapterId}` : ""}${
        filters?.runType !== undefined ? ` type=${filters.runType}` : ""
      }${filters?.limit !== undefined ? ` limit=${filters.limit}` : ""}`
    );

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new GenerationRunRepository(database);
      const runs = repository.findAll(filters);
      logger.success(`run:history count=${runs.length}`);
      return runs;
    } finally {
      database.close();
    }
  }

  showRun(runId: number): GenerationRunRecord {
    logger.start(`run:show id=${runId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new GenerationRunRepository(database);
      const run = repository.findById(runId);
      if (!run) {
        throw new Error(`Generation run ${runId} not found.`);
      }

      logger.success(`run:show id=${runId} type=${run.run_type}`);
      return run;
    } finally {
      database.close();
    }
  }
}

export function shortenRunText(value: string | null, maxLength = 120): string {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}
