import type Database from "better-sqlite3";
import type {
  CreateGenerationRunInput,
  FindGenerationRunsInput,
  GenerationRunListItem,
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

  findAll(filters?: FindGenerationRunsInput): GenerationRunListItem[] {
    // 历史查询默认倒序返回最新记录，并支持按项目、章节、运行类型逐步过滤。
    const conditions: string[] = [];
    const params: Array<number | string> = [];

    if (filters?.projectId !== undefined) {
      conditions.push("gr.project_id = ?");
      params.push(filters.projectId);
    }

    if (filters?.chapterId !== undefined) {
      conditions.push("gr.chapter_id = ?");
      params.push(filters.chapterId);
    }

    if (filters?.runType !== undefined) {
      conditions.push("gr.run_type = ?");
      params.push(filters.runType);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters?.limit ?? 20;

    const statement = this.database.prepare<
      Array<number | string>,
      GenerationRunListItem
    >(
      `SELECT
         gr.id,
         gr.project_id,
         gr.chapter_id,
         gr.run_type,
         gr.prompt_text,
         gr.input_context,
         gr.output_text,
         gr.model,
         gr.status,
         gr.created_at,
         c.title AS chapter_title
       FROM generation_runs gr
       LEFT JOIN chapters c ON c.id = gr.chapter_id
       ${whereClause}
       ORDER BY gr.id DESC
       LIMIT ${limit}`
    );

    return statement.all(...params);
  }
}
