/**
 * 应用级运行配置。
 * 这部分通常来自 `novel.config.json`，用于告诉 CLI 数据库和导出目录放在哪里。
 */
export interface AppConfig {
  /** SQLite 数据库文件路径，允许是相对工作区根目录的路径。 */
  dbPath: string;
  /** Markdown 导出目录路径，允许是相对工作区根目录的路径。 */
  exportsDir: string;
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
 * 章节导出的来源类型。
 * V1 先统一使用字符串字面量约束，CLI 和 service 都使用同一套枚举值。
 */
export type ChapterExportSource = "plan" | "draft" | "final";

/**
 * 章节规划生成结果。
 * 用于把落库结果和自动导出的 Markdown 路径一起返回给命令层。
 */
export interface ChapterPlanGenerationResult {
  /** 新生成的章节规划记录。 */
  plan: ChapterPlanRecord;
  /** 自动导出的 Markdown 绝对路径。 */
  exportPath: string;
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
 * 创建生成记录时的输入结构。
 */
export interface CreateGenerationRunInput {
  /** 所属项目 ID。 */
  projectId: number;
  /** 章节 ID，可为空。 */
  chapterId?: number;
  /** 运行类型。 */
  runType: string;
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
