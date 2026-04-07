import path from "node:path";
import { writeFile } from "node:fs/promises";
import { createDatabase } from "../../db/client.js";
import { GenerationRunRepository } from "../../db/repositories/generation-run-repository.js";
import type {
  ExportRunInput,
  FindGenerationRunsInput,
  GenerationRunRecord,
  GenerationRunListItem,
  RunExportResult,
  RunRecordSection
} from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import { ensureDir } from "../../utils/paths.js";
import { relativeToAppRoot, type RuntimeContext } from "./context-service.js";

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

  async exportRun(input: ExportRunInput): Promise<RunExportResult> {
    logger.start(
      `run:export id=${input.runId} section=${input.section} format=${input.format}`
    );

    const runRecord = this.showRun(input.runId);
    const exportPath = this.resolveRunExportPath(input);
    const content = this.renderRunExport(runRecord, input.section, input.format);

    await ensureDir(path.dirname(exportPath));
    await writeFile(exportPath, content, "utf8");

    logger.success(
      `run:export id=${input.runId} file=${relativeToAppRoot(
        this.context.appRoot,
        exportPath
      )}`
    );

    return {
      runId: input.runId,
      section: input.section,
      format: input.format,
      exportPath,
      content
    };
  }

  private resolveRunExportPath(input: ExportRunInput): string {
    if (input.outputPath) {
      return path.resolve(this.context.appRoot, input.outputPath);
    }

    return path.join(
      this.context.exportsDir,
      "runs",
      `run-${String(input.runId).padStart(3, "0")}-${input.section}.${input.format}`
    );
  }

  private renderRunExport(
    runRecord: GenerationRunRecord,
    section: RunRecordSection,
    format: "md" | "json"
  ): string {
    if (format === "json") {
      return JSON.stringify(this.buildRunExportPayload(runRecord, section), null, 2);
    }

    return this.renderRunMarkdown(runRecord, section);
  }

  private buildRunExportPayload(
    runRecord: GenerationRunRecord,
    section: RunRecordSection
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      meta: {
        id: runRecord.id,
        project_id: runRecord.project_id,
        chapter_id: runRecord.chapter_id,
        run_type: runRecord.run_type,
        template_key: runRecord.template_key,
        template_label: runRecord.template_label,
        template_version: runRecord.template_version,
        template_summary: runRecord.template_summary,
        model: runRecord.model,
        status: runRecord.status,
        created_at: runRecord.created_at
      }
    };

    if (section === "all" || section === "prompt") {
      payload.prompt_text = runRecord.prompt_text;
    }

    if (section === "all" || section === "input") {
      payload.input_context = this.parseMaybeJson(runRecord.input_context);
    }

    if (section === "all" || section === "output") {
      payload.output_text = runRecord.output_text;
    }

    return payload;
  }

  private renderRunMarkdown(
    runRecord: GenerationRunRecord,
    section: RunRecordSection
  ): string {
    const lines: string[] = [
      `# Run ${runRecord.id}`,
      "",
      "## meta",
      `- id: ${runRecord.id}`,
      `- project_id: ${runRecord.project_id}`,
      `- chapter_id: ${runRecord.chapter_id ?? ""}`,
      `- run_type: ${runRecord.run_type}`,
      `- template_key: ${runRecord.template_key ?? ""}`,
      `- template_label: ${runRecord.template_label ?? ""}`,
      `- template_version: ${runRecord.template_version ?? ""}`,
      `- template_summary: ${runRecord.template_summary ?? ""}`,
      `- model: ${runRecord.model ?? ""}`,
      `- status: ${runRecord.status}`,
      `- created_at: ${runRecord.created_at}`
    ];

    if (section === "all" || section === "prompt") {
      lines.push("", "## prompt_text", "", runRecord.prompt_text ?? "");
    }

    if (section === "all" || section === "input") {
      lines.push(
        "",
        "## input_context",
        "",
        "```json",
        formatRunValue(runRecord.input_context),
        "```"
      );
    }

    if (section === "all" || section === "output") {
      lines.push("", "## output_text", "", runRecord.output_text ?? "");
    }

    lines.push("");
    return lines.join("\n");
  }

  private parseMaybeJson(value: string | null): unknown {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
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

export function formatRunValue(value: string | null): string {
  if (!value) {
    return "";
  }

  try {
    // 输入上下文大多是结构化 JSON，这里优先做美化，方便命令查看与导出复用。
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
