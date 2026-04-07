import path from "node:path";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import type { AppConfig } from "../domain/types/index.js";

export const CONFIG_FILENAME = "novel.config.json";
const DEFAULT_DB_PATH = path.join("data", "novel.db");
const DEFAULT_EXPORTS_DIR = "exports";

export function resolveAppRoot(cwd: string): string {
  return cwd;
}

export function resolveConfigPath(appRoot: string): string {
  return path.join(appRoot, CONFIG_FILENAME);
}

export function resolveDefaultConfig(): AppConfig {
  return {
    dbPath: DEFAULT_DB_PATH,
    exportsDir: DEFAULT_EXPORTS_DIR
  };
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function readConfig(appRoot: string): Promise<AppConfig> {
  const configPath = resolveConfigPath(appRoot);
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppConfig>;

  return {
    dbPath: parsed.dbPath ?? DEFAULT_DB_PATH,
    exportsDir: parsed.exportsDir ?? DEFAULT_EXPORTS_DIR
  };
}

export async function writeConfig(appRoot: string, config: AppConfig): Promise<void> {
  const configPath = resolveConfigPath(appRoot);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function resolveDbPath(appRoot: string, config: AppConfig): string {
  return path.resolve(appRoot, config.dbPath);
}

export function resolveExportsDir(appRoot: string, config: AppConfig): string {
  return path.resolve(appRoot, config.exportsDir);
}
