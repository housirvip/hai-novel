import { loadRuntimeContext } from "../app/services/context-service.js";
import { pathExists } from "../utils/paths.js";

export function parseRequiredIntegerOption(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`\`${label}\` must be an integer.`);
  }
  return parsed;
}

export function parseOptionalIntegerOption(value: string, label: string): number {
  return parseRequiredIntegerOption(value, label);
}

export async function assertInitialized(cwd: string): Promise<void> {
  const context = await loadRuntimeContext(cwd);
  const hasConfig = await pathExists(context.configPath);
  const hasDb = await pathExists(context.dbPath);

  if (!hasConfig || !hasDb) {
    throw new Error("Workspace is not initialized. Run `novel init` first.");
  }
}
