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
