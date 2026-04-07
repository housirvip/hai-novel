import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, "..");

/**
 * 从 dist 目录动态导入已编译模块。
 * 测试脚本运行前会先执行 `npm run build`，因此这里统一走编译产物，避免引入 TS 运行器。
 */
export async function importDist(relativePath) {
  const targetPath = path.join(rootDir, "dist", relativePath);
  return import(pathToFileURL(targetPath).href);
}

/**
 * 创建独立临时工作区，避免测试之间互相污染数据库和导出文件。
 */
export function createWorkspace(prefix = "hai-novel-test-") {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * 初始化一个测试工作区，并返回运行时上下文。
 */
export async function initWorkspace(workspace) {
  const { loadRuntimeContext } = await importDist("app/services/context-service.js");
  const { initializeWorkspace } = await importDist("app/services/init-service.js");
  const context = await loadRuntimeContext(workspace);
  await initializeWorkspace(context);
  return context;
}

/**
 * 打开当前工作区数据库，供 repository 或 builder 直接测试使用。
 */
export async function openWorkspaceDatabase(workspace) {
  const { loadRuntimeContext } = await importDist("app/services/context-service.js");
  const { createDatabase } = await importDist("db/client.js");
  const context = await loadRuntimeContext(workspace);
  const database = createDatabase(context.dbPath);
  return { context, database };
}

/**
 * 判断工作区是否已生成某个导出文件。
 */
export function hasWorkspaceFile(workspace, ...segments) {
  return existsSync(path.join(workspace, ...segments));
}

/**
 * 运行编译后的 CLI，适合做端到端命令测试。
 */
export function runBuiltCli(cwd, args, options = {}) {
  const cliEntry = path.join(rootDir, "dist", "cli", "index.js");
  return execFileSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.env ?? {})
    }
  });
}

/**
 * 运行编译后的 CLI，并返回失败时的退出码与输出。
 * 用于验证错误提示、帮助文案和边界场景。
 */
export function runBuiltCliResult(cwd, args, options = {}) {
  const cliEntry = path.join(rootDir, "dist", "cli", "index.js");
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.env ?? {})
    }
  });

  return {
    status: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`
  };
}
