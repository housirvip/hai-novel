import type Database from "better-sqlite3";
import type {
  CreateGenerationRunInput,
  GenerationRunRecord
} from "../../domain/types/index.js";

export class GenerationRunRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateGenerationRunInput): GenerationRunRecord {
    const statement = this.database.prepare<
      [
        number,
        number | null,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string
      ],
      { id: number }
    >(
      `INSERT INTO generation_runs (
        project_id, chapter_id, run_type, prompt_text, input_context, output_text, model, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.chapterId ?? null,
      input.runType,
      input.promptText ?? null,
      input.inputContext ?? null,
      input.outputText ?? null,
      input.model ?? null,
      input.status ?? "success"
    );

    const run = this.findById(Number(result.lastInsertRowid));
    if (!run) {
      throw new Error("Failed to load generation run after creation.");
    }

    return run;
  }

  findById(id: number): GenerationRunRecord | undefined {
    const statement = this.database.prepare<[number], GenerationRunRecord>(
      `SELECT
         id,
         project_id,
         chapter_id,
         run_type,
         prompt_text,
         input_context,
         output_text,
         model,
         status,
         created_at
       FROM generation_runs
       WHERE id = ?`
    );
    return statement.get(id);
  }
}
