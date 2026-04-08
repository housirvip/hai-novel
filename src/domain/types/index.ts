/**
 * 应用级运行配置。
 * 这部分通常来自 `novel.config.json`，用于告诉 CLI 数据库和导出目录放在哪里。
 */
export interface AppConfig {
  /** SQLite 数据库文件路径，允许是相对工作区根目录的路径。 */
  dbPath: string;
  /** Markdown 导出目录路径，允许是相对工作区根目录的路径。 */
  exportsDir: string;
  /** AI 相关运行配置。 */
  ai: AIConfig;
}

/**
 * Prompt 模板唯一标识。
 * 当前覆盖章节规划、草稿生成、草稿修订和状态提取模板。
 */
export type PromptTemplateKey =
  | "chapter-plan"
  | "draft-write"
  | "draft-fix"
  | "state-extract";

/**
 * Prompt 模板元数据。
 * 这类信息既用于命令行展示，也会作为快照写入 `generation_runs`，
 * 方便后续追溯一次生成到底用了哪一版模板。
 */
export interface PromptTemplateMetadata {
  /** 模板唯一 key。 */
  key: PromptTemplateKey;
  /** 模板名称，偏向给人看。 */
  name: string;
  /** 模板版本号。 */
  version: string;
  /** 模板用途摘要。 */
  summary: string;
}

/**
 * Prompt 构建结果。
 * 统一承载模板元数据、system prompt、主 prompt 和可选上下文文本。
 */
export interface PromptBundle {
  /** 当前使用的模板元数据。 */
  template: PromptTemplateMetadata;
  /** 系统提示词。 */
  systemPrompt: string;
  /** 主提示词。 */
  prompt: string;
  /** 已格式化的上下文文本。 */
  contextText: string;
}

/**
 * AI provider 类型。
 * 当前支持本地 mock、OpenAI Responses API 和 Anthropic Messages API。
 */
export type AIProviderType = "mock" | "openai" | "anthropic";

/**
 * AI 运行配置。
 * 这里不直接保存密钥，只保存 provider、模型和可选的基础地址。
 * 真正的密钥统一从环境变量读取，避免落入配置文件。
 */
export interface AIConfig {
  /** 当前启用的 provider 类型。 */
  provider: AIProviderType;
  /** 默认模型名称。 */
  model: string;
  /** 可选的 provider 基础地址。 */
  baseUrl?: string;
}

/**
 * 项目实体的读取结果。
 * 对应数据库中的 `projects` 表，用于列表展示、详情查看和后续上下文拼装。
 */
export interface ProjectRecord {
  /** 项目自增主键。 */
  id: number;
  /** 小说项目名称。 */
  name: string;
  /** 题材，例如仙侠、悬疑、科幻。 */
  genre: string | null;
  /** 一句话简介或故事前提。 */
  premise: string | null;
  /** 文风描述。 */
  style: string | null;
  /** 目标总字数。 */
  target_word_count: number | null;
  /** 项目状态，例如 planning / writing / completed。 */
  status: string;
  /** 创建时间，使用 SQLite 文本时间格式。 */
  created_at: string;
  /** 最近更新时间，使用 SQLite 文本时间格式。 */
  updated_at: string;
}

/**
 * 创建项目时的输入结构。
 * 这里使用驼峰命名，方便在 TypeScript 代码内部传递；
 * 落库时再映射为数据库字段名。
 */
export interface CreateProjectInput {
  /** 必填，项目名称。 */
  name: string;
  /** 可选，题材。 */
  genre?: string;
  /** 可选，故事前提。 */
  premise?: string;
  /** 可选，文风。 */
  style?: string;
  /** 可选，目标总字数。 */
  targetWordCount?: number;
}

/**
 * 势力实体的读取结果。
 * 对应 `factions` 表，用来表示宗门、国家、组织、帮会等阵营单位。
 */
export interface FactionRecord {
  /** 势力自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 势力名称。 */
  name: string;
  /** 势力类型，例如宗门、组织、国家。 */
  type: string | null;
  /** 势力领袖名称。 */
  leader: string | null;
  /** 势力当前目标。 */
  goal: string | null;
  /** 势力立场，例如正道、敌对、中立。 */
  stance: string | null;
  /** 用于列表快速展示的短摘要。 */
  summary: string | null;
  /** 更完整的背景说明。 */
  details: string | null;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 创建势力时的输入结构。
 */
export interface CreateFactionInput {
  /** 势力归属的项目 ID。 */
  projectId: number;
  /** 势力名称。 */
  name: string;
  /** 势力类型。 */
  type?: string;
  /** 势力领袖。 */
  leader?: string;
  /** 势力目标。 */
  goal?: string;
  /** 势力立场。 */
  stance?: string;
  /** 短摘要。 */
  summary?: string;
  /** 详细描述。 */
  details?: string;
}

/**
 * 角色实体的读取结果。
 * 对应 `characters` 表，是人物系统的主表。
 */
export interface CharacterRecord {
  /** 角色自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 角色姓名。 */
  name: string;
  /** 角色叙事定位，例如 protagonist / antagonist / ally。 */
  role: string | null;
  /** 当前主要归属势力 ID，可为空。 */
  faction_id: number | null;
  /** 角色职业或社会身份。 */
  profession: string | null;
  /** 职业补充说明，例如等级、来历、禁忌。 */
  profession_detail: string | null;
  /** 年龄或年龄段。 */
  age: string | null;
  /** 对外人物简介。 */
  profile: string | null;
  /** 性格描述。 */
  personality: string | null;
  /** 当前核心目标。 */
  goal: string | null;
  /** 当前主要冲突。 */
  conflict: string | null;
  /** 暗线秘密或隐藏信息。 */
  secret: string | null;
  /** 暂时无法结构化的补充备注。 */
  notes: string | null;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 角色列表项。
 * 在基础角色信息上额外带出势力名，方便命令行直接展示。
 */
export interface CharacterListItem extends CharacterRecord {
  /** 角色当前主归属势力名称。 */
  faction_name: string | null;
}

/**
 * 创建角色时的输入结构。
 */
export interface CreateCharacterInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 角色姓名。 */
  name: string;
  /** 角色定位。 */
  role?: string;
  /** 主归属势力 ID。 */
  factionId?: number;
  /** 职业。 */
  profession?: string;
  /** 职业补充说明。 */
  professionDetail?: string;
  /** 年龄。 */
  age?: string;
  /** 人物简介。 */
  profile?: string;
  /** 性格。 */
  personality?: string;
  /** 目标。 */
  goal?: string;
  /** 冲突。 */
  conflict?: string;
  /** 秘密。 */
  secret?: string;
  /** 备注。 */
  notes?: string;
}

/**
 * 人物与人物关系的读取结果。
 * 对应 `character_relations` 表，用来描述师徒、敌对、恋人、盟友等关系。
 */
export interface CharacterRelationRecord {
  /** 关系记录主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 关系发起侧角色 ID。 */
  character_id: number;
  /** 关系指向侧角色 ID。 */
  related_character_id: number;
  /** 关系类型，例如 enemy / mentor / family。 */
  relation_type: string;
  /** 关系摘要。 */
  summary: string | null;
  /** 关系详细描述。 */
  details: string | null;
  /** 关系强度，用数字表示紧密度或冲突度。 */
  intensity: number | null;
  /** 关系可见性，例如 public / private / secret。 */
  visibility: string | null;
  /** 关系当前状态，例如 active / broken。 */
  status: string;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 人物关系列表项。
 * 在关系记录上补充两侧角色名称，方便列表展示。
 */
export interface CharacterRelationListItem extends CharacterRelationRecord {
  /** 发起侧角色名称。 */
  character_name: string;
  /** 指向侧角色名称。 */
  related_character_name: string;
}

/**
 * 创建人物关系时的输入结构。
 */
export interface CreateCharacterRelationInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 发起侧角色 ID。 */
  characterId: number;
  /** 指向侧角色 ID。 */
  relatedCharacterId: number;
  /** 关系类型。 */
  relationType: string;
  /** 关系摘要。 */
  summary?: string;
  /** 关系详细描述。 */
  details?: string;
  /** 关系强度。 */
  intensity?: number;
  /** 关系可见性。 */
  visibility?: string;
}

/**
 * 人物与势力关系的读取结果。
 * 对应 `character_faction_relations` 表，用来表达成员、领袖、卧底、已脱离等复杂归属关系。
 */
export interface CharacterFactionRelationRecord {
  /** 关系记录主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 角色 ID。 */
  character_id: number;
  /** 势力 ID。 */
  faction_id: number;
  /** 关系类型，例如 member / leader / undercover。 */
  relation_type: string;
  /** 在势力中的头衔。 */
  title: string | null;
  /** 角色对该势力的主观立场。 */
  stance: string | null;
  /** 关系摘要。 */
  summary: string | null;
  /** 关系详细描述。 */
  details: string | null;
  /** 是否是当前主归属，数据库里用 0/1 表示。 */
  is_primary: number;
  /** 关系当前状态。 */
  status: string;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 人物与势力关系列表项。
 * 在基础关系上带出人物名和势力名，方便命令行展示。
 */
export interface CharacterFactionRelationListItem
  extends CharacterFactionRelationRecord {
  /** 角色名称。 */
  character_name: string;
  /** 势力名称。 */
  faction_name: string;
}

/**
 * 创建人物与势力关系时的输入结构。
 */
export interface CreateCharacterFactionRelationInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 角色 ID。 */
  characterId: number;
  /** 势力 ID。 */
  factionId: number;
  /** 关系类型。 */
  relationType: string;
  /** 势力内头衔。 */
  title?: string;
  /** 角色对势力的主观立场。 */
  stance?: string;
  /** 关系摘要。 */
  summary?: string;
  /** 关系详细描述。 */
  details?: string;
  /** 是否设置为主归属。 */
  isPrimary?: boolean;
}

/**
 * 世界观设定实体的读取结果。
 * 对应 `lore_entries` 表，用于承载规则、体系、地点、历史、器物等长期设定。
 */
export interface LoreEntryRecord {
  /** 设定自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 设定类型，例如 world_rule / profession_system / location。 */
  type: string;
  /** 设定标题。 */
  title: string;
  /** 设定摘要。 */
  summary: string | null;
  /** 设定详细正文。 */
  details: string | null;
  /** 标签字符串，V1 先使用逗号分隔的纯文本。 */
  tags: string | null;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 创建世界观设定时的输入结构。
 */
export interface CreateLoreEntryInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 设定类型。 */
  type: string;
  /** 设定标题。 */
  title: string;
  /** 设定摘要。 */
  summary?: string;
  /** 设定详情。 */
  details?: string;
  /** 标签文本。 */
  tags?: string;
}

/**
 * 大纲节点的读取结果。
 * 对应 `outlines` 表，可表示总纲、分卷、章节节点或场景节点。
 */
export interface OutlineRecord {
  /** 大纲节点自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 父节点 ID，可为空。 */
  parent_id: number | null;
  /** 节点类型，例如 story / volume / chapter / scene。 */
  node_type: string;
  /** 节点标题。 */
  title: string;
  /** 节点摘要。 */
  summary: string | null;
  /** 该节点的叙事目标。 */
  goal: string | null;
  /** 该节点的主要冲突。 */
  conflict: string | null;
  /** 该节点的预期结果。 */
  outcome: string | null;
  /** 同级排序号。 */
  position: number;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 大纲列表项。
 * 额外带出父节点标题，方便命令行直接查看树形关系。
 */
export interface OutlineListItem extends OutlineRecord {
  /** 父节点标题，可为空。 */
  parent_title: string | null;
}

/**
 * 创建大纲节点时的输入结构。
 */
export interface CreateOutlineInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 父节点 ID。 */
  parentId?: number;
  /** 节点类型。 */
  nodeType: string;
  /** 节点标题。 */
  title: string;
  /** 节点摘要。 */
  summary?: string;
  /** 叙事目标。 */
  goal?: string;
  /** 主要冲突。 */
  conflict?: string;
  /** 结果。 */
  outcome?: string;
  /** 同级排序。 */
  position?: number;
}

/**
 * 更新大纲节点时的输入结构。
 * V1 主要用于 `outline:set` 更新项目总纲，也可为后续通用更新接口复用。
 */
export interface UpdateOutlineInput {
  /** 要更新的大纲节点 ID。 */
  id: number;
  /** 节点标题。 */
  title: string;
  /** 节点摘要。 */
  summary?: string;
  /** 叙事目标。 */
  goal?: string;
  /** 主要冲突。 */
  conflict?: string;
  /** 结果。 */
  outcome?: string;
  /** 同级排序。 */
  position?: number;
}

/**
 * 设置项目总纲时的输入结构。
 * 该命令语义上要求项目只保留一条主总纲，因此 service 会执行“存在则更新，不存在则创建”。
 */
export interface SetStoryOutlineInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 总纲标题。 */
  title: string;
  /** 总纲摘要。 */
  summary?: string;
  /** 总纲目标。 */
  goal?: string;
  /** 总纲主要冲突。 */
  conflict?: string;
  /** 总纲预期结果。 */
  outcome?: string;
}

/**
 * 查看项目总纲时的返回结构。
 * 除了总纲本体，也会顺带返回当前项目下的分卷列表，方便 CLI 一次性展示。
 */
export interface StoryOutlineShowResult {
  /** 所属项目。 */
  project: ProjectRecord;
  /** 当前项目总纲，可为空。 */
  outline: OutlineRecord | null;
  /** 当前项目已有分卷列表。 */
  volumes: OutlineListItem[];
}

/**
 * 创建或生成分卷规划时的输入结构。
 * 当 `fromOutline = true` 时，service 会优先依据项目总纲和附加指令生成分卷内容。
 */
export interface CreateVolumePlanInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 分卷标题。 */
  title?: string;
  /** 分卷摘要。 */
  summary?: string;
  /** 分卷目标。 */
  goal?: string;
  /** 分卷主要冲突。 */
  conflict?: string;
  /** 分卷预期结果。 */
  outcome?: string;
  /** 父大纲节点 ID；未传时默认挂到总纲下。 */
  parentId?: number;
  /** 额外生成指令。 */
  instruction?: string;
  /** 是否依据总纲自动生成。 */
  fromOutline?: boolean;
  /** 同级排序。 */
  position?: number;
}

/**
 * 分卷规划命令结果。
 * 如果本次是根据总纲生成，则会附带生成记录 ID，方便回查。
 */
export interface VolumePlanResult {
  /** 创建出的分卷大纲节点。 */
  volume: OutlineRecord;
  /** 生成记录 ID；纯手写创建时可为空。 */
  generationRunId?: number;
}

/**
 * 章节实体的读取结果。
 * 对应 `chapters` 表，表示进入实际写作流程的正式章节记录。
 */
export interface ChapterRecord {
  /** 章节自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 关联的大纲节点 ID，可为空。 */
  outline_id: number | null;
  /** 章节标题。 */
  title: string;
  /** 章节摘要。 */
  summary: string | null;
  /** 章节当前状态。 */
  status: string;
  /** 正式文稿正文，可为空。 */
  final_text: string | null;
  /** 已批准草稿 ID，可为空。 */
  approved_draft_id: number | null;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 章节详情项。
 * 额外带出关联大纲标题，方便 show 命令直接展示。
 */
export interface ChapterDetail extends ChapterRecord {
  /** 关联大纲标题，可为空。 */
  outline_title: string | null;
}

/**
 * 创建章节时的输入结构。
 */
export interface CreateChapterInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 关联大纲节点 ID。 */
  outlineId?: number;
  /** 章节标题。 */
  title: string;
  /** 章节摘要。 */
  summary?: string;
}

/**
 * 章节规划实体的读取结果。
 * 对应 `chapter_plans` 表，用于保存某一章当前生效或历史归档的写作规划。
 */
export interface ChapterPlanRecord {
  /** 规划自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 对应章节 ID。 */
  chapter_id: number;
  /** 规划来源类型，例如 author_intent / outline_only / outline_with_intent。 */
  source_type: string;
  /** 作者意图原文，可为空。 */
  author_intent: string | null;
  /** 最终生成出的规划正文。 */
  plan_text: string;
  /** 当前状态，例如 active / archived。 */
  status: string;
  /** 当前正文版本号；每次生成新正文或手工回写后递增。 */
  source_version: number;
  /** 最近一次导出文件的工作区相对路径，可为空。 */
  last_export_path: string | null;
  /** 最近一次导出时间，可为空。 */
  last_exported_at: string | null;
  /** 最近一次手工回写时间，可为空。 */
  last_imported_at: string | null;
  /** 最近一次正文更新来源，例如 ai_generate / manual_import。 */
  updated_from: string;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 创建章节规划时的输入结构。
 * 这里主要给 repository 使用，代表一条新的有效规划版本。
 */
export interface CreateChapterPlanInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 规划来源类型。 */
  sourceType: string;
  /** 作者意图。 */
  authorIntent?: string;
  /** 规划正文。 */
  planText: string;
}

/**
 * 生成章节规划时的输入结构。
 * 这里体现的是命令级语义，而不是数据库落库语义。
 */
export interface GenerateChapterPlanInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 可选的作者即时意图。 */
  intent?: string;
}

/**
 * 草稿实体的读取结果。
 * 对应 `chapter_drafts` 表，目前先用于导出能力和后续 review 流程预留。
 */
export interface ChapterDraftRecord {
  /** 草稿自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 对应章节 ID。 */
  chapter_id: number;
  /** 来源规划 ID，可为空。 */
  plan_id: number | null;
  /** 草稿正文。 */
  draft_text: string;
  /** 草稿状态，例如 generated / checked / approved / dropped。 */
  status: string;
  /** 当前正文版本号；每次生成新正文、fix 或手工回写后递增。 */
  source_version: number;
  /** 最近一次导出文件的工作区相对路径，可为空。 */
  last_export_path: string | null;
  /** 最近一次导出时间，可为空。 */
  last_exported_at: string | null;
  /** 最近一次手工回写时间，可为空。 */
  last_imported_at: string | null;
  /** 最近一次正文更新来源，例如 ai_generate / ai_fix / manual_import。 */
  updated_from: string;
  /** 评审备注，可为空。 */
  review_notes: string | null;
  /** 评审报告，可为空。 */
  review_report: string | null;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 创建草稿时的输入结构。
 * 这里用于 repository 层落库，表示一份新生成的章节草稿。
 */
export interface CreateChapterDraftInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 来源 plan ID，可为空。 */
  planId?: number;
  /** 草稿正文。 */
  draftText: string;
  /** 草稿状态。 */
  status?: string;
}

/**
 * 钩子实体的读取结果。
 * 对应 `story_hooks` 表，用于追踪伏笔、谜团和承诺线的生命周期。
 */
export interface StoryHookRecord {
  /** 钩子自增主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 钩子标题。 */
  title: string;
  /** 钩子类型。 */
  hook_type: string;
  /** 钩子摘要。 */
  summary: string | null;
  /** 设钩说明。 */
  setup_text: string | null;
  /** 回收目标说明。 */
  payoff_text: string | null;
  /** 钩子当前状态。 */
  status: string;
  /** 优先级。 */
  priority: number | null;
  /** 首次埋钩章节 ID。 */
  start_chapter_id: number | null;
  /** 计划回收章节 ID。 */
  target_chapter_id: number | null;
  /** 实际结束章节 ID。 */
  end_chapter_id: number | null;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 钩子列表项。
 * 额外带出起始章、目标章、结束章的标题，方便命令行查看状态。
 */
export interface StoryHookListItem extends StoryHookRecord {
  /** 首次埋钩章节标题。 */
  start_chapter_title: string | null;
  /** 目标回收章节标题。 */
  target_chapter_title: string | null;
  /** 实际结束章节标题。 */
  end_chapter_title: string | null;
}

/**
 * 创建钩子时的输入结构。
 */
export interface CreateStoryHookInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 钩子标题。 */
  title: string;
  /** 钩子类型。 */
  hookType: string;
  /** 钩子摘要。 */
  summary?: string;
  /** 设钩说明。 */
  setupText?: string;
  /** 回收目标说明。 */
  payoffText?: string;
  /** 优先级。 */
  priority?: number;
  /** 目标回收章节 ID。 */
  targetChapterId?: number;
}

/**
 * 更新钩子整体状态时的输入结构。
 * 这里只允许更新状态和关键章节信息，避免 update 语义过于发散。
 */
export interface UpdateStoryHookInput {
  /** 钩子 ID。 */
  hookId: number;
  /** 更新后的状态。 */
  status?: string;
  /** 首次埋钩章节 ID。 */
  startChapterId?: number;
  /** 目标回收章节 ID。 */
  targetChapterId?: number;
  /** 实际结束章节 ID。 */
  endChapterId?: number;
}

/**
 * 钩子与章节关联记录。
 * 对应 `hook_chapter_links` 表，表示某章对钩子做了“准备埋 / 埋下 / 推进 / 回收”等动作。
 */
export interface HookChapterLinkRecord {
  /** 关联记录主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 钩子 ID。 */
  hook_id: number;
  /** 章节 ID。 */
  chapter_id: number;
  /** 关联类型，例如 setup / advance / reveal / close。 */
  link_type: string;
  /** 章节规划阶段的处理说明。 */
  planned_note: string | null;
  /** 正文实际落地说明。 */
  actual_note: string | null;
  /** 当前执行状态，例如 planned / done / skipped。 */
  status: string;
  /** 创建时间。 */
  created_at: string;
  /** 最近更新时间。 */
  updated_at: string;
}

/**
 * 钩子关联列表项。
 * 额外带出章节标题，方便在 hook show 时直接查看时间线。
 */
export interface HookChapterLinkListItem extends HookChapterLinkRecord {
  /** 章节标题。 */
  chapter_title: string;
}

/**
 * 从章节视角查看钩子关联时的列表项。
 * 这类结构主要用于 `chapter show`，让命令行可以直接看到本章涉及哪些钩子。
 */
export interface ChapterHookLinkListItem extends HookChapterLinkRecord {
  /** 钩子标题。 */
  hook_title: string;
  /** 钩子类型。 */
  hook_type: string;
  /** 钩子当前整体状态。 */
  hook_status: string;
}

/**
 * 创建钩子与章节关联时的输入结构。
 */
export interface CreateHookChapterLinkInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 钩子 ID。 */
  hookId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 关联类型。 */
  linkType: string;
  /** 计划说明。 */
  plannedNote?: string;
  /** 实际说明。 */
  actualNote?: string;
  /** 执行状态。 */
  status?: string;
}

/**
 * 章节详情的聚合结果。
 * 除了章节主记录外，还会把本章关联的钩子时间线一起带出来。
 */
export interface ChapterShowResult {
  /** 章节主体信息。 */
  chapter: ChapterDetail;
  /** 本章涉及的钩子关联列表。 */
  hook_links: ChapterHookLinkListItem[];
}

/**
 * 钩子详情的聚合结果。
 * 用于 `hook show`，一次性返回钩子主体与各章节关联时间线。
 */
export interface StoryHookDetail {
  /** 钩子主体信息。 */
  hook: StoryHookListItem;
  /** 钩子在各章节上的推进记录。 */
  chapter_links: HookChapterLinkListItem[];
}

/**
 * 构建章节上下文时的输入结构。
 * 用于在数据库层之上聚合出给 plan、draft、review 共用的统一上下文。
 */
export interface BuildChapterContextInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID。 */
  chapterId: number;
}

/**
 * 章节级统一上下文。
 * 这是 V1 的标准 prompt 输入骨架，后续无论接 Mock 还是真实模型，都优先使用这份结构。
 */
export interface ChapterGenerationContext {
  /** 项目基础信息。 */
  project: ProjectRecord;
  /** 当前目标章节信息。 */
  chapter: ChapterDetail;
  /** 与当前章节关联的大纲链，从高层到低层排序。 */
  outline_chain: OutlineRecord[];
  /** 项目内的根级大纲节点，用于在缺少直接章纲时仍能拿到总纲/分卷信息。 */
  root_outlines: OutlineListItem[];
  /** 项目内已录入的世界观设定。 */
  lore_entries: LoreEntryRecord[];
  /** 项目内可供调用的人物。 */
  characters: CharacterListItem[];
  /** 项目内可供调用的势力。 */
  factions: FactionRecord[];
  /** 项目内的人物关系网。 */
  character_relations: CharacterRelationListItem[];
  /** 项目内的人物与势力关系。 */
  character_faction_relations: CharacterFactionRelationListItem[];
  /** 当前章节已绑定的钩子动作。 */
  hook_links: ChapterHookLinkListItem[];
  /** 目标回收章节是当前章节的钩子。 */
  target_hooks: StoryHookListItem[];
  /** 当前仍处于 active 状态的钩子。 */
  active_hooks: StoryHookListItem[];
  /** 当前章节之前最近一次已批准的章节状态快照，可为空。 */
  latest_chapter_snapshot: ChapterStateSnapshotRecord | null;
  /** 当前章节之前各人物最近一次正式状态快照。 */
  latest_character_states: CharacterStateSnapshotRecord[];
  /** 当前章节之前各势力最近一次正式状态快照。 */
  latest_faction_states: FactionStateSnapshotRecord[];
  /** 当前章节之前各钩子最近一次正式状态快照。 */
  latest_hook_states: HookStateSnapshotRecord[];
}

/**
 * 章节导出的来源类型。
 * V1 先统一使用字符串字面量约束，CLI 和 service 都使用同一套枚举值。
 */
export type ChapterExportSource = "plan" | "draft" | "final";

/**
 * 正文更新来源类型。
 * 用于标记当前版本是 AI 生成、AI 修订还是作者手工回写得到的。
 */
export type ContentUpdateSource = "ai_generate" | "ai_fix" | "manual_import";

/**
 * 章节规划生成结果。
 * 用于把落库结果和自动导出的 Markdown 路径一起返回给命令层。
 */
export interface ChapterPlanGenerationResult {
  /** 新生成的章节规划记录。 */
  plan: ChapterPlanRecord;
  /** 本次生成记录 ID。 */
  generationRunId: number;
  /** 自动导出的 Markdown 绝对路径。 */
  exportPath: string;
}

/**
 * 查看章节规划时的返回结构。
 * 目前默认返回当前生效中的 active plan，并带出章节基础信息。
 */
export interface ChapterPlanShowResult {
  /** 所属章节详情。 */
  chapter: ChapterDetail;
  /** 当前查看到的规划记录。 */
  plan: ChapterPlanRecord;
}

/**
 * 手工回写章节规划时的输入结构。
 */
export interface ImportPlanInput {
  /** 目标章节 ID。 */
  chapterId: number;
  /** Markdown 文件路径。 */
  inputPath: string;
  /** 是否忽略版本冲突。 */
  force?: boolean;
}

/**
 * 章节规划回写结果。
 */
export interface ChapterPlanImportResult {
  /** 回写后的最新规划记录。 */
  plan: ChapterPlanRecord;
  /** 实际读取的 Markdown 绝对路径。 */
  importPath: string;
}

/**
 * 草稿生成命令的输入结构。
 */
export interface WriteDraftInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 指定使用的 plan ID；未传时默认取当前 active plan。 */
  planId?: number;
  /** 额外写作指令。 */
  instruction?: string;
}

/**
 * 草稿写入结果。
 * 包含草稿记录、生成记录以及导出路径，便于命令层直接展示。
 */
export interface DraftWriteResult {
  /** 新生成的草稿记录。 */
  draft: ChapterDraftRecord;
  /** 生成任务记录 ID。 */
  generationRunId: number;
  /** 自动导出的 Markdown 绝对路径。 */
  exportPath: string;
}

/**
 * 手工回写草稿时的输入结构。
 */
export interface ImportDraftInput {
  /** 草稿 ID。 */
  draftId: number;
  /** Markdown 文件路径。 */
  inputPath: string;
  /** 是否忽略版本冲突。 */
  force?: boolean;
}

/**
 * 草稿回写结果。
 */
export interface DraftImportResult {
  /** 回写后的最新草稿记录。 */
  draft: ChapterDraftRecord;
  /** 实际读取的 Markdown 绝对路径。 */
  importPath: string;
}

/**
 * 草稿评审动作类型。
 * V1 先支持检查、修复和批准三种动作。
 */
export type DraftReviewAction = "check" | "fix" | "approve";

/**
 * 草稿评审问题项。
 * `check` 动作会生成这类结构，并同时写入数据库与命令行输出。
 */
export interface DraftReviewIssue {
  /** 问题等级，只区分阻塞性的 error 和建议性的 warning。 */
  level: "error" | "warning";
  /** 问题标题。 */
  title: string;
  /** 问题说明。 */
  detail: string;
}

/**
 * 草稿评审命令的输入结构。
 */
export interface ReviewDraftInput {
  /** 草稿 ID。 */
  draftId: number;
  /** 评审动作。 */
  action: DraftReviewAction;
  /** 用户补充说明。 */
  notes?: string;
}

/**
 * 草稿评审结果。
 * 不同动作都会返回最新草稿、问题列表以及可能的导出路径。
 */
export interface DraftReviewResult {
  /** 执行的动作。 */
  action: DraftReviewAction;
  /** 最新草稿记录。 */
  draft: ChapterDraftRecord;
  /** 评审问题列表。 */
  issues: DraftReviewIssue[];
  /** 生成记录 ID。 */
  generationRunId: number;
  /** 导出路径；只有 fix 和 approve 成功时才会有。 */
  exportPath?: string;
}

/**
 * 手动导出章节内容时的输入结构。
 */
export interface ExportChapterInput {
  /** 章节 ID。 */
  chapterId: number;
  /** 导出来源。 */
  source: ChapterExportSource;
}

/**
 * 导出结果。
 * 既返回路径，也返回最终写出的 Markdown 文本，便于后续复用或测试。
 */
export interface ChapterExportResult {
  /** 导出的来源类型。 */
  source: ChapterExportSource;
  /** 导出的 Markdown 绝对路径。 */
  exportPath: string;
  /** 实际写出的 Markdown 内容。 */
  markdown: string;
}

/**
 * 章节状态快照执行状态。
 * 用于标记 approve 后的状态提取结果是否已经成功落库。
 */
export type ChapterSnapshotStatus = "pending" | "applied" | "failed";

/**
 * 钩子进度快照状态。
 * V2 先只做轻量枚举，方便命令行查看章节推进结果。
 */
export type HookProgressStatus = "pending" | "started" | "advanced" | "resolved";

/**
 * 章节状态快照实体。
 * 对应 `chapter_state_snapshots` 表，表示某章正式文稿生效后的状态提取结果。
 */
export interface ChapterStateSnapshotRecord {
  /** 快照主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 来源章节 ID。 */
  chapter_id: number;
  /** 来源草稿 ID，可为空。 */
  source_draft_id: number | null;
  /** 快照状态。 */
  status: ChapterSnapshotStatus;
  /** 快照摘要，可为空。 */
  summary: string | null;
  /** 原始提取结果 JSON，可为空。 */
  raw_payload: string | null;
  /** 正式应用时间，可为空。 */
  applied_at: string | null;
  /** 创建时间。 */
  created_at: string;
}

/**
 * 角色状态快照实体。
 * 对应 `character_state_snapshots` 表，表示角色在某章正式文稿后的状态记录。
 */
export interface CharacterStateSnapshotRecord {
  /** 快照主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 角色 ID。 */
  character_id: number;
  /** 来源章节 ID。 */
  chapter_id: number;
  /** 关联章节快照 ID。 */
  chapter_snapshot_id: number;
  /** 状态摘要，可为空。 */
  status_summary: string | null;
  /** 当前地点，可为空。 */
  location: string | null;
  /** 当前目标，可为空。 */
  goal: string | null;
  /** 外部可见印象，可为空。 */
  public_impression: string | null;
  /** 内在状态，可为空。 */
  internal_state: string | null;
  /** 创建时间。 */
  created_at: string;
}

/**
 * 势力状态快照实体。
 * 对应 `faction_state_snapshots` 表，表示势力在某章正式文稿后的状态记录。
 */
export interface FactionStateSnapshotRecord {
  /** 快照主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 势力 ID。 */
  faction_id: number;
  /** 来源章节 ID。 */
  chapter_id: number;
  /** 关联章节快照 ID。 */
  chapter_snapshot_id: number;
  /** 状态摘要，可为空。 */
  status_summary: string | null;
  /** 权力变化说明，可为空。 */
  power_shift: string | null;
  /** 对外关系摘要，可为空。 */
  external_relation_summary: string | null;
  /** 创建时间。 */
  created_at: string;
}

/**
 * 钩子状态快照实体。
 * 对应 `hook_state_snapshots` 表，表示某个钩子在本章正式文稿后的推进状态。
 */
export interface HookStateSnapshotRecord {
  /** 快照主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 钩子 ID。 */
  hook_id: number;
  /** 来源章节 ID。 */
  chapter_id: number;
  /** 关联章节快照 ID。 */
  chapter_snapshot_id: number;
  /** 钩子推进状态。 */
  progress_status: HookProgressStatus;
  /** 推进说明，可为空。 */
  progress_note: string | null;
  /** 创建时间。 */
  created_at: string;
}

/**
 * 创建章节状态快照时的输入结构。
 */
export interface CreateChapterStateSnapshotInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 来源草稿 ID。 */
  sourceDraftId?: number;
  /** 快照状态。 */
  status: ChapterSnapshotStatus;
  /** 摘要。 */
  summary?: string;
  /** 原始 JSON 结果。 */
  rawPayload?: string;
  /** 是否立即标记为已应用。 */
  applied?: boolean;
}

/**
 * 创建角色状态快照时的输入结构。
 */
export interface CreateCharacterStateSnapshotInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 角色 ID。 */
  characterId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 关联章节快照 ID。 */
  chapterSnapshotId: number;
  /** 状态摘要。 */
  statusSummary?: string;
  /** 当前地点。 */
  location?: string;
  /** 当前目标。 */
  goal?: string;
  /** 外部印象。 */
  publicImpression?: string;
  /** 内在状态。 */
  internalState?: string;
}

/**
 * 创建势力状态快照时的输入结构。
 */
export interface CreateFactionStateSnapshotInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 势力 ID。 */
  factionId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 关联章节快照 ID。 */
  chapterSnapshotId: number;
  /** 状态摘要。 */
  statusSummary?: string;
  /** 权力变化说明。 */
  powerShift?: string;
  /** 对外关系摘要。 */
  externalRelationSummary?: string;
}

/**
 * 创建钩子状态快照时的输入结构。
 */
export interface CreateHookStateSnapshotInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 钩子 ID。 */
  hookId: number;
  /** 章节 ID。 */
  chapterId: number;
  /** 关联章节快照 ID。 */
  chapterSnapshotId: number;
  /** 推进状态。 */
  progressStatus: HookProgressStatus;
  /** 推进说明。 */
  progressNote?: string;
}

/**
 * 查询状态快照时的输入结构。
 */
export interface ShowStateInput {
  /** 项目 ID。 */
  projectId: number;
  /** 可选章节 ID。 */
  chapterId?: number;
}

/**
 * 状态快照查看结果。
 * 命令层可直接把章节快照和关联对象快照一起输出。
 */
export interface StateShowResult {
  /** 匹配到的章节状态快照。 */
  chapterSnapshots: ChapterStateSnapshotRecord[];
  /** 匹配到的角色状态快照。 */
  characterSnapshots: CharacterStateSnapshotRecord[];
  /** 匹配到的势力状态快照。 */
  factionSnapshots: FactionStateSnapshotRecord[];
  /** 匹配到的钩子状态快照。 */
  hookSnapshots: HookStateSnapshotRecord[];
}

/**
 * 生成记录实体的读取结果。
 * 对应 `generation_runs` 表，用于追踪每次 plan/draft/review 等 AI 生成动作。
 */
export interface GenerationRunRecord {
  /** 生成记录主键。 */
  id: number;
  /** 所属项目 ID。 */
  project_id: number;
  /** 关联章节 ID，可为空。 */
  chapter_id: number | null;
  /** 运行类型，例如 chapter_plan / draft_write / draft_review_fix。 */
  run_type: string;
  /** 使用的模板 key，可为空。 */
  template_key: string | null;
  /** 使用的模板名称快照，可为空。 */
  template_label: string | null;
  /** 使用的模板版本快照，可为空。 */
  template_version: string | null;
  /** 使用的模板用途摘要快照，可为空。 */
  template_summary: string | null;
  /** 传给模型的 prompt 文本。 */
  prompt_text: string | null;
  /** 输入上下文摘要。 */
  input_context: string | null;
  /** 模型输出结果。 */
  output_text: string | null;
  /** 使用的模型标识。 */
  model: string | null;
  /** 运行状态，例如 success / failed。 */
  status: string;
  /** 创建时间。 */
  created_at: string;
}

/**
 * 生成记录列表项。
 * 在基础记录上带出章节标题，方便历史查询时直接定位是哪一章触发的。
 */
export interface GenerationRunListItem extends GenerationRunRecord {
  /** 章节标题，可为空。 */
  chapter_title: string | null;
}

/**
 * 查询生成记录列表时的过滤条件。
 */
export interface FindGenerationRunsInput {
  /** 项目 ID。 */
  projectId?: number;
  /** 章节 ID。 */
  chapterId?: number;
  /** 运行类型。 */
  runType?: string;
  /** 最大返回条数。 */
  limit?: number;
}

/**
 * 生成记录查看分区。
 * 与 CLI 的 `run show/export --section` 保持一致，便于历史回放和导出复用同一套语义。
 */
export type RunRecordSection = "all" | "meta" | "prompt" | "input" | "output";

/**
 * 生成记录导出格式。
 * V1 先支持 Markdown 和 JSON，分别面向人工阅读和程序处理。
 */
export type RunExportFormat = "md" | "json";

/**
 * 导出生成记录时的输入结构。
 */
export interface ExportRunInput {
  /** 生成记录 ID。 */
  runId: number;
  /** 要导出的分区。 */
  section: RunRecordSection;
  /** 导出格式。 */
  format: RunExportFormat;
  /** 可选自定义导出路径。 */
  outputPath?: string;
}

/**
 * 导出生成记录后的结果。
 */
export interface RunExportResult {
  /** 生成记录 ID。 */
  runId: number;
  /** 导出的分区。 */
  section: RunRecordSection;
  /** 导出格式。 */
  format: RunExportFormat;
  /** 实际写入的绝对路径。 */
  exportPath: string;
  /** 实际写出的内容。 */
  content: string;
}

/**
 * 创建生成记录时的输入结构。
 */
export interface CreateGenerationRunInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID，可为空。 */
  chapterId?: number;
  /** 运行类型。 */
  runType: string;
  /** 模板 key，可为空。 */
  templateKey?: string;
  /** 模板名称快照，可为空。 */
  templateLabel?: string;
  /** 模板版本快照，可为空。 */
  templateVersion?: string;
  /** 模板用途摘要快照，可为空。 */
  templateSummary?: string;
  /** Prompt 文本。 */
  promptText?: string;
  /** 上下文摘要。 */
  inputContext?: string;
  /** 输出文本。 */
  outputText?: string;
  /** 模型标识。 */
  model?: string;
  /** 状态。 */
  status?: string;
}
