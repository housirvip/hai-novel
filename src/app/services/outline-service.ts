import { createDatabase } from "../../db/client.js";
import { GenerationRunRepository } from "../../db/repositories/generation-run-repository.js";
import { OutlineRepository } from "../../db/repositories/outline-repository.js";
import { ProjectRepository } from "../../db/repositories/project-repository.js";
import type {
  CreateVolumePlanInput,
  CreateOutlineInput,
  OutlineListItem,
  OutlineRecord,
  SetStoryOutlineInput,
  StoryOutlineShowResult,
  VolumePlanResult
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
      if (input.parentId !== undefined) {
        this.assertOutlineIdBelongsToProject(repository, input.parentId, input.projectId);
      }
      const outline = repository.create(input);
      logger.success(`outline:add id=${outline.id} title="${outline.title}"`);
      return outline;
    } finally {
      database.close();
    }
  }

  setStoryOutline(input: SetStoryOutlineInput): OutlineRecord {
    logger.start(`outline:set project=${input.projectId} title="${input.title}"`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new OutlineRepository(database);
      const existing = repository.findFirstByProjectIdAndType(input.projectId, "story");

      const outline = existing
        ? repository.update({
            id: existing.id,
            title: input.title,
            summary: input.summary,
            goal: input.goal,
            conflict: input.conflict,
            outcome: input.outcome,
            position: existing.position
          })
        : repository.create({
            projectId: input.projectId,
            nodeType: "story",
            title: input.title,
            summary: input.summary,
            goal: input.goal,
            conflict: input.conflict,
            outcome: input.outcome,
            position: 0
          });

      logger.success(`outline:set id=${outline.id} title="${outline.title}"`);
      return outline;
    } finally {
      database.close();
    }
  }

  showStoryOutline(projectId: number): StoryOutlineShowResult {
    logger.start(`outline:show project=${projectId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const projectRepository = new ProjectRepository(database);
      const outlineRepository = new OutlineRepository(database);
      const project = projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found.`);
      }

      const outline = outlineRepository.findFirstByProjectIdAndType(projectId, "story") ?? null;
      const volumes = outlineRepository.findAllByProjectIdAndType(projectId, "volume");

      logger.success(`outline:show project=${projectId} volumes=${volumes.length}`);
      return {
        project,
        outline,
        volumes
      };
    } finally {
      database.close();
    }
  }

  planVolume(input: CreateVolumePlanInput): VolumePlanResult {
    logger.start(`volume:plan project=${input.projectId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const projectRepository = new ProjectRepository(database);
      const outlineRepository = new OutlineRepository(database);
      const runRepository = new GenerationRunRepository(database);
      const project = projectRepository.findById(input.projectId);
      if (!project) {
        throw new Error(`Project ${input.projectId} not found.`);
      }

      // 用户显式指定父节点时，需要保证仍挂在当前项目的大纲树下。
      if (input.parentId !== undefined) {
        this.assertOutlineIdBelongsToProject(outlineRepository, input.parentId, input.projectId);
      }

      const storyOutline = outlineRepository.findFirstByProjectIdAndType(input.projectId, "story");
      const volumes = outlineRepository.findAllByProjectIdAndType(input.projectId, "volume");
      const volumePosition = input.position ?? volumes.length + 1;
      const volumeInput = input.fromOutline
        ? this.buildVolumeFromStory({
            title: input.title,
            project: {
              id: project.id,
              name: project.name,
              genre: project.genre,
              premise: project.premise,
              style: project.style
            },
            storyOutline,
            volumeIndex: volumePosition,
            instruction: input.instruction
          })
        : {
            title: input.title,
            summary: input.summary,
            goal: input.goal,
            conflict: input.conflict,
            outcome: input.outcome
          };

      if (!volumeInput.title) {
        throw new Error("Volume title is required. Pass `--title` or use `--from-outline`.");
      }

      logger.progress(
        input.fromOutline === true ? "volume:plan 1/2 创建分卷节点" : "volume:plan 1/1 创建分卷节点"
      );
      const volume = outlineRepository.create({
        projectId: input.projectId,
        parentId: input.parentId ?? storyOutline?.id,
        nodeType: "volume",
        title: volumeInput.title,
        summary: volumeInput.summary,
        goal: volumeInput.goal,
        conflict: volumeInput.conflict,
        outcome: volumeInput.outcome,
        position: volumePosition
      });

      let generationRunId: number | undefined;
      if (input.fromOutline === true) {
        logger.progress("volume:plan 2/2 写入生成记录");
        const run = runRepository.create({
          projectId: input.projectId,
          runType: "volume_plan",
          inputContext: JSON.stringify(
            {
              project: {
                id: project.id,
                name: project.name,
                genre: project.genre,
                premise: project.premise,
                style: project.style
              },
              storyOutline,
              existingVolumeCount: volumes.length,
              instruction: input.instruction ?? null
            },
            null,
            2
          ),
          promptText: this.buildVolumePlanPrompt(storyOutline, input.instruction),
          outputText: JSON.stringify(volume, null, 2),
          model: "rule-planner-v1",
          status: "success"
        });
        generationRunId = run.id;
      }

      logger.success(`volume:plan id=${volume.id} title="${volume.title}"`);
      return {
        volume,
        generationRunId
      };
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

  listVolumes(projectId: number): OutlineListItem[] {
    logger.start(`volume:list project=${projectId}`);

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new OutlineRepository(database);
      const volumes = repository.findAllByProjectIdAndType(projectId, "volume");
      logger.success(`volume:list count=${volumes.length}`);
      return volumes;
    } finally {
      database.close();
    }
  }

  private buildVolumePlanPrompt(
    storyOutline: OutlineRecord | undefined,
    instruction: string | undefined
  ): string {
    return [
      "请依据当前项目总纲拆出下一卷规划。",
      `总纲标题：${storyOutline?.title ?? "未设置"}`,
      `总纲摘要：${storyOutline?.summary ?? "未设置"}`,
      `额外说明：${instruction ?? "未提供"}`
    ].join("\n");
  }

  private buildVolumeFromStory(input: {
    title?: string;
    project: {
      id: number;
      name: string;
      genre: string | null;
      premise: string | null;
      style: string | null;
    };
    storyOutline: OutlineRecord | undefined;
    volumeIndex: number;
    instruction?: string;
  }): {
    title: string;
    summary: string;
    goal: string;
    conflict: string;
    outcome: string;
  } {
    if (!input.storyOutline) {
      throw new Error(
        "No story outline found. Run `novel outline set` first or create volume manually with `--title`."
      );
    }

    const volumeTitle = `第${String(input.volumeIndex).padStart(2, "0")}卷`;
    const summary = [
      `${input.storyOutline.title} 的阶段性推进。`,
      input.storyOutline.summary ?? "",
      input.instruction ?? ""
    ]
      .filter((item) => item.trim().length > 0)
      .join(" ");

    return {
      title: input.title ?? volumeTitle,
      summary,
      goal:
        input.storyOutline.goal ??
        `${input.project.name}在这一卷完成一段阶段性主线推进。`,
      conflict:
        input.storyOutline.conflict ??
        "主角目标与外部阻力正面碰撞，局势在本卷持续升级。",
      outcome:
        input.storyOutline.outcome ??
        "本卷结尾应形成阶段性结果，并为下一卷留下新的局面变化。"
    };
  }

  private assertOutlineIdBelongsToProject(
    repository: OutlineRepository,
    outlineId: number,
    projectId: number
  ): void {
    const outline = repository.findById(outlineId);
    if (!outline) {
      throw new Error(`Outline ${outlineId} not found.`);
    }

    if (outline.project_id !== projectId) {
      throw new Error(`Outline ${outline.id} does not belong to project ${projectId}.`);
    }
  }
}
