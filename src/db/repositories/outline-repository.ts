import type Database from "better-sqlite3";
import type {
  CreateOutlineInput,
  OutlineListItem,
  OutlineRecord,
  UpdateOutlineInput
} from "../../domain/types/index.js";

export class OutlineRepository {
  constructor(private readonly database: Database.Database) {}

  create(input: CreateOutlineInput): OutlineRecord {
    const statement = this.database.prepare<
      [
        number,
        number | null,
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        number
      ],
      { id: number }
    >(
      `INSERT INTO outlines (
        project_id, parent_id, node_type, title, summary, goal, conflict, outcome, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = statement.run(
      input.projectId,
      input.parentId ?? null,
      input.nodeType,
      input.title,
      input.summary ?? null,
      input.goal ?? null,
      input.conflict ?? null,
      input.outcome ?? null,
      input.position ?? 0
    );

    // 创建后重新读取，保证返回结构和其他读取接口一致。
    const outline = this.findById(Number(result.lastInsertRowid));
    if (!outline) {
      throw new Error("Failed to load outline after creation.");
    }

    return outline;
  }

  update(input: UpdateOutlineInput): OutlineRecord {
    const statement = this.database.prepare<
      [
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
        number
      ]
    >(
      `UPDATE outlines
       SET title = ?,
           summary = ?,
           goal = ?,
           conflict = ?,
           outcome = ?,
           position = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );

    statement.run(
      input.title,
      input.summary ?? null,
      input.goal ?? null,
      input.conflict ?? null,
      input.outcome ?? null,
      input.position ?? 0,
      input.id
    );

    const outline = this.findById(input.id);
    if (!outline) {
      throw new Error(`Outline ${input.id} not found after update.`);
    }

    return outline;
  }

  findAllByProjectId(projectId: number): OutlineListItem[] {
    // 大纲列表需要带出父节点标题，方便在 CLI 里快速看树形关系。
    const statement = this.database.prepare<[number], OutlineListItem>(
      `SELECT
         o.id,
         o.project_id,
         o.parent_id,
         o.node_type,
         o.title,
         o.summary,
         o.goal,
         o.conflict,
         o.outcome,
         o.position,
         o.created_at,
         o.updated_at,
         parent.title AS parent_title
       FROM outlines o
       LEFT JOIN outlines parent ON parent.id = o.parent_id
       WHERE o.project_id = ?
       ORDER BY o.position ASC, o.id ASC`
    );
    return statement.all(projectId);
  }

  findRootByProjectId(projectId: number, limit?: number): OutlineListItem[] {
    if (limit === undefined) {
      const statement = this.database.prepare<[number], OutlineListItem>(
        `SELECT
           o.id,
           o.project_id,
           o.parent_id,
           o.node_type,
           o.title,
           o.summary,
           o.goal,
           o.conflict,
           o.outcome,
           o.position,
           o.created_at,
           o.updated_at,
           parent.title AS parent_title
         FROM outlines o
         LEFT JOIN outlines parent ON parent.id = o.parent_id
         WHERE o.project_id = ? AND o.parent_id IS NULL
         ORDER BY o.position ASC, o.id ASC`
      );
      return statement.all(projectId);
    }

    const statement = this.database.prepare<[number, number], OutlineListItem>(
      `SELECT
         o.id,
         o.project_id,
         o.parent_id,
         o.node_type,
         o.title,
         o.summary,
         o.goal,
         o.conflict,
         o.outcome,
         o.position,
         o.created_at,
         o.updated_at,
         parent.title AS parent_title
       FROM outlines o
       LEFT JOIN outlines parent ON parent.id = o.parent_id
       WHERE o.project_id = ? AND o.parent_id IS NULL
       ORDER BY o.position ASC, o.id ASC
       LIMIT ?`
    );
    return statement.all(projectId, limit);
  }

  findAllByProjectIdAndType(projectId: number, nodeType: string): OutlineListItem[] {
    const statement = this.database.prepare<[number, string], OutlineListItem>(
      `SELECT
         o.id,
         o.project_id,
         o.parent_id,
         o.node_type,
         o.title,
         o.summary,
         o.goal,
         o.conflict,
         o.outcome,
         o.position,
         o.created_at,
         o.updated_at,
         parent.title AS parent_title
       FROM outlines o
       LEFT JOIN outlines parent ON parent.id = o.parent_id
       WHERE o.project_id = ? AND o.node_type = ?
       ORDER BY o.position ASC, o.id ASC`
    );
    return statement.all(projectId, nodeType);
  }

  findById(id: number): OutlineRecord | undefined {
    const statement = this.database.prepare<[number], OutlineRecord>(
      `SELECT
         id,
         project_id,
         parent_id,
         node_type,
         title,
         summary,
         goal,
         conflict,
         outcome,
         position,
         created_at,
         updated_at
       FROM outlines
       WHERE id = ?`
    );
    return statement.get(id);
  }

  findFirstByProjectIdAndType(
    projectId: number,
    nodeType: string
  ): OutlineRecord | undefined {
    const statement = this.database.prepare<[number, string], OutlineRecord>(
      `SELECT
         id,
         project_id,
         parent_id,
         node_type,
         title,
         summary,
         goal,
         conflict,
         outcome,
         position,
         created_at,
         updated_at
       FROM outlines
       WHERE project_id = ? AND node_type = ?
       ORDER BY position ASC, id ASC
       LIMIT 1`
    );
    return statement.get(projectId, nodeType);
  }
}
