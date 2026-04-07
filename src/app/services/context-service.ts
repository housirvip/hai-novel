import path from "node:path";
import type { AppConfig } from "../../domain/types/index.js";
import {
  pathExists,
  readConfig,
  resolveAppRoot,
  resolveConfigPath,
  resolveDbPath,
  resolveDefaultConfig,
  resolveExportsDir
} from "../../utils/paths.js";

export interface RuntimeContext {
  appRoot: string;
  configPath: string;
  config: AppConfig;
  dbPath: string;
  exportsDir: string;
}

export async function loadRuntimeContext(cwd: string): Promise<RuntimeContext> {
  const appRoot = resolveAppRoot(cwd);
  const configPath = resolveConfigPath(appRoot);
  const hasConfig = await pathExists(configPath);
  const config = hasConfig ? await readConfig(appRoot) : resolveDefaultConfig();

  return {
    appRoot,
    configPath,
    config,
    dbPath: resolveDbPath(appRoot, config),
    exportsDir: resolveExportsDir(appRoot, config)
  };
}

export function relativeToAppRoot(appRoot: string, absolutePath: string): string {
  return path.relative(appRoot, absolutePath) || ".";
}
