import path from "node:path";
import { createDatabase } from "../../db/client.js";
import { migrations } from "../../db/migrations/index.js";
import { runMigrations } from "../../db/migrator.js";
import { logger } from "../../utils/logger.js";
import {
  ensureDir,
  pathExists,
  resolveDefaultConfig,
  writeConfig
} from "../../utils/paths.js";
import type { RuntimeContext } from "./context-service.js";

export interface InitResult {
  createdConfig: boolean;
  appliedMigrations: number;
  dbPath: string;
}

export async function initializeWorkspace(context: RuntimeContext): Promise<InitResult> {
  logger.start("init workspace");

  // 先保证运行目录存在，后面写配置和创建 SQLite 文件才不会失败。
  await ensureDir(path.dirname(context.dbPath));
  await ensureDir(context.exportsDir);

  const createdConfig = !(await pathExists(context.configPath));
  if (createdConfig) {
    await writeConfig(context.appRoot, resolveDefaultConfig());
    logger.progress(`created config ${path.basename(context.configPath)}`);
  } else {
    logger.progress(`reused config ${path.basename(context.configPath)}`);
  }

  // 只要打开数据库连接，SQLite 就会先把数据库文件创建出来。
  const database = createDatabase(context.dbPath);
  const appliedMigrations = runMigrations(database, migrations);
  database.close();

  logger.success(
    `init complete db=${context.dbPath} migrations=${appliedMigrations}`
  );

  return {
    createdConfig,
    appliedMigrations,
    dbPath: context.dbPath
  };
}
