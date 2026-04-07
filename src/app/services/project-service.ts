import { createDatabase } from "../../db/client.js";
import { ProjectRepository } from "../../db/repositories/project-repository.js";
import type { CreateProjectInput, ProjectRecord } from "../../domain/types/index.js";
import { logger } from "../../utils/logger.js";
import type { RuntimeContext } from "./context-service.js";

export class ProjectService {
  constructor(private readonly context: RuntimeContext) {}

  createProject(input: CreateProjectInput): ProjectRecord {
    logger.start(`project:create name="${input.name}"`);

    // Service 层统一接管数据库生命周期，命令层只负责参数和输出。
    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new ProjectRepository(database);
      const project = repository.create(input);
      logger.success(`project:create id=${project.id} name="${project.name}"`);
      return project;
    } finally {
      database.close();
    }
  }

  listProjects(): ProjectRecord[] {
    logger.start("project:list");

    const database = createDatabase(this.context.dbPath);
    try {
      const repository = new ProjectRepository(database);
      const projects = repository.findAll();
      logger.success(`project:list count=${projects.length}`);
      return projects;
    } finally {
      database.close();
    }
  }
}
