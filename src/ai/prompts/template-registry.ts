import type {
  PromptTemplateKey,
  PromptTemplateMetadata
} from "../../domain/types/index.js";

/**
 * Prompt 模板注册表。
 * 所有进入生成链路的模板都应该先在这里登记，避免版本和名称散落在各个 service 中。
 */
const promptTemplateRegistry: Record<PromptTemplateKey, PromptTemplateMetadata> = {
  "chapter-plan": {
    key: "chapter-plan",
    name: "章节规划模板",
    version: "1.0.0",
    summary: "依据章节上下文、整体大纲与作者意图生成本章可执行规划。"
  },
  "draft-write": {
    key: "draft-write",
    name: "草稿生成模板",
    version: "1.0.0",
    summary: "依据章节规划、钩子与上下文生成可继续修订的章节草稿。"
  },
  "draft-fix": {
    key: "draft-fix",
    name: "草稿修订模板",
    version: "1.0.0",
    summary: "依据 review 问题清单和上下文，对章节草稿做完整修订。"
  }
};

/**
 * 读取指定模板的元数据。
 * 返回拷贝而不是原始对象，避免调用方意外修改注册表内容。
 */
export function getPromptTemplateMetadata(
  key: PromptTemplateKey
): PromptTemplateMetadata {
  const metadata = promptTemplateRegistry[key];
  return { ...metadata };
}
