# AI 小说编写工具 V1 计划

## 1. 项目目标

做一个基于 TypeScript 的 CLI 小说编写工具，使用 SQLite 作为本地数据库，帮助作者以结构化方式管理：

- 小说项目
- 世界观设定
- 角色资料
- 章节与大纲
- 写作素材
- AI 生成记录

V1 的目标不是“全自动写小说”，而是先做一个稳定、可扩展的创作操作台，让作者可以在命令行里完成项目管理、资料沉淀、章节组织和 AI 辅助写作。

核心创作闭环调整为：

- 设定总纲
- 设定分卷规划
- 设定人物和势力
- 生成本章规划 `plan`
- 基于 `plan` 生成草稿 `draft`
- 将 `draft` 丢弃 `drop` 或评审通过 `review` 后转为正式文稿

## 2. V1 核心原则

- 本地优先：所有核心数据落 SQLite，本地可离线管理。
- CLI 优先：先把命令流程打顺，后续再考虑 Web UI。
- 结构化创作：把设定、角色、章节、草稿、生成记录拆成独立实体。
- AI 可替换：模型接入层独立，后续可切 OpenAI、兼容本地模型或其他厂商。
- 可追溯：所有 AI 输出都要能回溯 prompt、输入上下文、生成时间和归属章节。

## 3. 目标用户

- 独立作者
- 网文作者
- 需要长期维护长篇设定的创作者
- 想用 AI 提高创作效率，但不希望内容散落在聊天记录里的人

## 4. V1 使用场景

### 场景 1：创建新小说项目

作者用 CLI 初始化一个项目，填写书名、题材、简介、写作风格和目标篇幅。

### 场景 2：维护世界观和角色设定

作者随时录入角色、势力、地点、规则、禁忌和人物关系。

### 场景 3：维护大纲

作者创建总纲、分卷规划、章纲、场景，记录每章目标、冲突、关键事件和伏笔。

### 场景 4：AI 辅助写作

作者指定某一章或某个场景，让系统自动拼装上下文，生成：

- 分卷规划
- 本章规划
- 章节草稿
- 场景扩写
- 对话润色
- 剧情续写
- 人设一致性检查

### 场景 5：保留版本和生成记录

作者可以查看某次生成使用了哪些资料、对应哪个章节、产出了什么结果。

## 5. V1 范围

### 5.1 必做

- 项目初始化
- SQLite 数据库初始化与迁移
- 小说项目管理
- 总纲管理
- 分卷规划管理
- 角色管理
- 势力管理
- 世界观资料管理
- 本章规划管理
- 草稿管理与转正流程
- 章节/大纲管理
- 素材片段管理
- AI 任务创建与结果存档
- 基础上下文拼装
- Markdown 导出正式章节文稿

### 5.2 可选但建议预留接口

- 标签系统
- 多模型配置
- Prompt 模板
- 章节版本管理
- review 审批意见模板

### 5.3 V1 不做

- Web 页面
- 多人协作
- 云同步
- 自动向量检索
- 富文本编辑器
- 复杂权限系统

## 6. 系统模块拆分

建议按以下模块组织 TypeScript 项目：

### 6.1 CLI 层

负责命令解析、参数校验、结果输出。

建议命令族：

- `novel init`
- `novel project:create`
- `novel project:list`
- `novel outline:set`
- `novel outline:show`
- `novel volume:plan`
- `novel volume:list`
- `novel character:add`
- `novel character:list`
- `novel faction:add`
- `novel faction:list`
- `novel relation:character:add`
- `novel relation:character:list`
- `novel relation:faction:add`
- `novel relation:faction:list`
- `novel lore:add`
- `novel lore:list`
- `novel chapter:create`
- `novel chapter:show`
- `novel chapter:plan`
- `novel plan:show`
- `novel draft:write`
- `novel draft:drop`
- `novel draft:review`
- `novel chapter:export`
- `novel run:history`

### 6.2 应用服务层

负责组织业务流程，不直接暴露给 CLI。

建议服务：

- `ProjectService`
- `StoryOutlineService`
- `VolumePlanService`
- `CharacterService`
- `FactionService`
- `CharacterRelationService`
- `CharacterFactionRelationService`
- `LoreService`
- `OutlineService`
- `ChapterService`
- `ChapterPlanService`
- `DraftService`
- `ReviewService`
- `PromptService`
- `GenerationService`
- `ExportService`

### 6.3 数据访问层

统一封装 SQLite 读写。

建议内容：

- 数据库连接管理
- migration 执行器
- repository 模式
- 事务封装

### 6.4 AI 适配层

负责模型调用和 prompt 输入输出格式统一。

建议抽象：

- `AIProvider`
- `OpenAIProvider`
- `MockProvider`

### 6.5 上下文构建层

根据章节和任务类型，从数据库中聚合上下文：

- 小说基础设定
- 总纲
- 分卷规划
- 世界观条目
- 当前章节大纲
- 关联角色资料
- 关联人物关系
- 关联势力资料
- 关联人物与势力关系
- 最近章节摘要
- 用户附加指令

## 7. 数据模型设计

V1 推荐最小可用表结构如下。

### 7.1 projects

存小说项目基础信息。

字段说明：

- `id`：项目主键，唯一标识一部小说项目。后续所有角色、章节、设定都通过它归属到同一个项目。
- `name`：小说名称，用于 CLI 列表展示、导出文件命名和 prompt 中的作品标识。
- `genre`：题材类型，例如仙侠、科幻、悬疑。用于帮助 AI 保持题材风格一致。
- `premise`：故事核心设定或一句话简介，概括作品的基本冲突和卖点。
- `style`：文风描述，例如冷峻、热血、轻松、克制。主要用于 plan 和 draft 生成时约束语言风格。
- `target_word_count`：目标总字数，用于辅助估算篇幅、分卷节奏和章节长度。
- `status`：项目当前状态，例如 `planning`、`writing`、`completed`。用于表示作品处于筹备、连载或完结阶段。
- `created_at`：项目创建时间，便于排序、审计和后续统计。
- `updated_at`：项目最后更新时间，用于判断最近一次被修改的时间。

### 7.2 characters

存角色设定。

字段说明：

- `id`：角色主键，唯一标识一个人物。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`，表示该角色属于哪部作品。
- `name`：角色名称，用于章节上下文拼装、人物检索和关系展示。
- `role`：角色定位，例如主角、反派、配角、导师。帮助系统理解角色在剧情中的职责。
- `faction_id`：所属势力 ID，可为空，外键关联 `factions.id`。用于标记角色当前主要归属的组织、阵营或国家，便于高频查询。
- `profession`：角色当前职业或社会身份，例如捕快、炼丹师、神官、镖师。用于塑造人物视角、语言习惯和专业行为。
- `profession_detail`：职业补充说明，例如职业等级、执业背景、职业禁忌、特殊能力范围。用于细化职业设定。
- `age`：角色年龄或年龄段，用于补充人物画像，辅助语言、经历和行为一致性。
- `profile`：角色简介，概括角色背景、身份和当前状态，是最核心的人设摘要。
- `personality`：角色性格特征，例如谨慎、多疑、骄傲。用于生成对话和行为逻辑。
- `goal`：角色当前目标或长期追求，是推动剧情的重要驱动力。
- `conflict`：角色主要矛盾，可以是外部冲突，也可以是内在挣扎，便于规划戏剧张力。
- `secret`：角色隐藏信息或未公开设定，用于伏笔和反转设计。
- `notes`：补充备注，存放暂时不适合结构化拆分的设定细节。
- `created_at`：角色创建时间。
- `updated_at`：角色最后更新时间。

### 7.3 factions

存势力、组织、宗门、国家、阵营等设定。

字段说明：

- `id`：势力主键，唯一标识一个组织或阵营。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `name`：势力名称，例如门派名、国家名、组织名。
- `type`：势力类型，例如宗门、朝廷、商会、邪教、佣兵团。便于分类展示和筛选。
- `leader`：当前首领或核心代表人物名称，可与角色表形成弱关联。
- `goal`：势力目标，例如扩张、复仇、守护、统治，用于驱动宏观剧情冲突。
- `stance`：势力立场，例如中立、敌对、同盟、摇摆。用于快速判断与主角阵营的关系。
- `summary`：势力摘要，简要描述势力定位、影响范围和故事作用。
- `details`：详细设定，记录历史、规则、资源、内部派系等深入信息。
- `created_at`：势力创建时间。
- `updated_at`：势力最后更新时间。

说明：

- `characters.faction_id` 表示角色“当前默认阵营”
- 更复杂的人物归属、合作、敌对、卧底、已脱离等状态，放到人物与势力关系表中维护

### 7.4 character\_relations

存人物与人物之间的关系。

字段说明：

- `id`：关系主键，唯一标识一条人物关系记录。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `character_id`：关系发起侧角色 ID，外键关联 `characters.id`。
- `related_character_id`：关系指向侧角色 ID，外键关联 `characters.id`。
- `relation_type`：关系类型，例如师徒、恋人、宿敌、盟友、血亲、上下级。
- `summary`：关系摘要，用一句话概括二人的主要关系状态。
- `details`：关系详细描述，用于记录关系成因、关键事件、隐藏真相和变化过程。
- `intensity`：关系强度，建议用 1 到 5 或 1 到 10 的整数，表示亲密或冲突程度。
- `visibility`：关系公开程度，例如 `public`、`private`、`secret`，用于区分明面关系和暗线关系。
- `status`：关系当前状态，例如 `active`、`broken`、`past`，用于表示该关系是否仍然成立。
- `created_at`：关系创建时间。
- `updated_at`：关系最后更新时间。

`relation_type` 可先支持：

- `ally`
- `enemy`
- `mentor`
- `student`
- `lover`
- `family`
- `subordinate`
- `rival`
- `custom`

说明：

- 默认按有向关系设计，适合表达“师父 -> 徒弟”“上级 -> 下属”这类非对称关系
- 若需要双向关系，可在写入时自动补一条反向记录，或由服务层统一处理

### 7.5 character\_faction\_relations

存人物与势力之间的关系。

字段说明：

- `id`：关系主键，唯一标识一条人物与势力关系记录。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `character_id`：角色 ID，外键关联 `characters.id`。
- `faction_id`：势力 ID，外键关联 `factions.id`。
- `relation_type`：关系类型，例如成员、领袖、盟友、敌对者、卧底、附庸、已脱离。
- `title`：角色在势力中的身份头衔，例如长老、圣女、客卿、统领。
- `stance`：该角色对该势力的主观立场，例如忠诚、利用、仇视、摇摆、中立。
- `summary`：关系摘要，概括人物与势力的当前联系。
- `details`：关系详细描述，用于记录加入原因、利益纠葛、历史变化和隐藏身份。
- `is_primary`：是否为当前主要归属，建议用布尔值。可与 `characters.faction_id` 保持一致。
- `status`：关系状态，例如 `active`、`left`、`hostile`、`hidden`。
- `created_at`：关系创建时间。
- `updated_at`：关系最后更新时间。

`relation_type` 可先支持：

- `member`
- `leader`
- `ally`
- `enemy`
- `undercover`
- `retainer`
- `former_member`
- `custom`

说明：

- `characters.faction_id` 适合快速取“当前主要归属”
- `character_faction_relations` 适合记录多势力关系、历史关系和隐性关系

### 7.6 lore\_entries

存世界观资料、地点、势力、规则等。

字段说明：

- `id`：设定条目主键，唯一标识一条世界观资料。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `type`：设定类型，用于区分世界规则、地点、历史事件、器物等类别。
- `title`：设定标题，用于列表展示和 prompt 中的引用。
- `summary`：设定摘要，简短说明这条资料是什么、为什么重要。
- `details`：设定详细内容，存完整背景说明、规则描述或补充细节。
- `tags`：标签集合，建议用逗号分隔字符串或 JSON 数组存储，便于按主题检索。
- `created_at`：设定创建时间。
- `updated_at`：设定最后更新时间。

`type` 可先支持：

- `world_rule`
- `profession_system`
- `location`
- `faction`
- `artifact`
- `history`
- `custom`

说明：

- 若“势力”需要独立维护和查询，优先使用 `factions`
- `lore_entries` 继续承担规则、地点、历史、器物等通用设定
- 职业体系、官职体系、修炼职业分工等世界层规则，建议放在 `profession_system`

### 7.7 outlines

存总纲、卷、章、场景的大纲节点。

字段说明：

- `id`：大纲节点主键，唯一标识一个故事结构节点。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `parent_id`：父节点 ID，用于表示树状层级关系。例如某个章节节点的父节点是某一卷。
- `node_type`：节点类型，用于区分总纲、分卷、章节、场景。
- `title`：节点标题，例如卷名、章名、场景标题。
- `summary`：节点摘要，概括这个节点发生了什么。
- `goal`：该节点的叙事目标，例如推进主线、展示关系变化、埋伏笔。
- `conflict`：该节点的核心冲突，是规划情节张力的重要字段。
- `outcome`：该节点预期结果，说明这段剧情最终导向什么变化。
- `position`：同级节点排序号，用于控制卷、章、场景的顺序。
- `created_at`：节点创建时间。
- `updated_at`：节点最后更新时间。

`node_type` 建议支持：

- `story`
- `volume`
- `chapter`
- `scene`

说明：

- `story` 节点表示整本小说总纲
- `volume` 节点表示分卷规划
- 形成 `story -> volume -> chapter -> scene` 的树状结构

### 7.8 chapters

存正式章节信息和当前正文。

字段说明：

- `id`：章节主键，唯一标识一个正式章节实体。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `outline_id`：关联的大纲节点 ID，通常对应 `outlines` 中的 `chapter` 类型节点。
- `title`：章节标题，允许和大纲标题一致，也允许在成稿阶段重新命名。
- `summary`：章节摘要，用于快速回顾本章内容，也可作为导出目录摘要。
- `status`：章节当前状态，表示本章处于待规划、已有 plan、草稿中、评审中还是已完稿。
- `final_text`：正式文稿正文，只有在草稿 review 通过后才写入这里。
- `approved_draft_id`：已转正草稿的 ID，指向最终被采纳的 `chapter_drafts` 记录，便于回溯来源。
- `created_at`：章节创建时间。
- `updated_at`：章节最后更新时间。

`status` 可先支持：

- `planned`
- `plan_ready`
- `drafting`
- `reviewing`
- `done`

### 7.9 chapter\_plans

存“本章规划 plan”。

字段说明：

- `id`：本章规划主键，唯一标识一次有效或历史规划。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `chapter_id`：对应章节 ID，外键关联 `chapters.id`，表示这是哪一章的 plan。
- `source_type`：plan 的生成来源，用于判断是纯作者输入、纯大纲推导，还是混合生成。
- `author_intent`：作者输入的即时意图，例如“这章重点写二人决裂，不要揭露真相”。没有时可为空。
- `plan_text`：最终生成或录入的本章规划正文，是后续生成草稿的直接依据。
- `status`：plan 状态，用于区分当前启用中的版本和历史归档版本。
- `created_at`：plan 创建时间。
- `updated_at`：plan 最后更新时间。

`source_type` 建议支持：

- `author_intent`
- `outline_only`
- `outline_with_intent`

`status` 建议支持：

- `active`
- `archived`

说明：

- `author_intent` 用于记录作者对本章的即时要求
- 若未提供作者意图，则依据总纲和分卷规划自动生成本章 plan

### 7.10 chapter\_drafts

存章节草稿 `draft`。

字段说明：

- `id`：草稿主键，唯一标识一次草稿输出。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `chapter_id`：对应章节 ID，外键关联 `chapters.id`。
- `plan_id`：关联的本章规划 ID，表示这份草稿基于哪个 plan 生成。
- `draft_text`：草稿正文内容，是 AI 生成或人工整理后的候选文本。
- `status`：草稿状态，用于表示该草稿当前是待处理、已丢弃还是已采纳。
- `review_notes`：评审意见，记录作者或系统对该草稿的评价、修改建议或驳回原因。
- `created_at`：草稿创建时间。
- `updated_at`：草稿最后更新时间。

`status` 建议支持：

- `generated`
- `dropped`
- `approved`

说明：

- `generated` 表示草稿已生成，待处理
- `dropped` 表示作者丢弃，不进入正式文稿
- `approved` 表示评审通过，并同步到 `chapters.final_text`

### 7.11 assets

存零散创作素材。

字段说明：

- `id`：素材主键，唯一标识一条素材记录。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `asset_type`：素材类型，用于区分灵感、对白片段、场景种子、参考资料等。
- `title`：素材标题，便于在列表中快速识别。
- `content`：素材正文，存储具体灵感内容、对白草句、场景描述或引用文本。
- `source`：素材来源，例如作者手记、AI 生成、外部资料整理。便于追溯出处。
- `created_at`：素材创建时间。

`asset_type` 可先支持：

- `idea`
- `dialogue`
- `scene_seed`
- `reference`

### 7.12 generation\_runs

记录每一次 AI 生成任务。

字段说明：

- `id`：生成任务主键，唯一标识一次模型调用。
- `project_id`：所属小说项目 ID，外键关联 `projects.id`。
- `chapter_id`：关联章节 ID，可为空。像分卷规划生成这类任务可能不直接对应单章。
- `run_type`：生成任务类型，用于区分是生成分卷规划、本章 plan、草稿，还是重写、润色。
- `prompt_text`：发送给模型的最终 prompt 文本，用于排查问题和复盘生成效果。
- `input_context`：结构化输入上下文，建议存 JSON，记录当时注入了哪些角色、设定、大纲和作者意图。
- `output_text`：模型返回的原始输出，作为生成结果留档。
- `model`：使用的模型标识，例如具体的 OpenAI 模型名或本地模型名。
- `status`：任务状态，例如 `success`、`failed`、`cancelled`，用于运维和审计。
- `created_at`：生成任务创建时间。

`run_type` 可先支持：

- `volume_plan`
- `chapter_plan`
- `draft`
- `rewrite`
- `expand`
- `summary`
- `style_polish`

## 8. V1 CLI 命令设计

### 8.1 初始化

`novel init`

作用：

- 初始化项目目录
- 创建 SQLite 文件
- 执行 migrations
- 创建默认配置文件

### 8.2 项目管理

`novel project:create`

参数建议：

- `--name`
- `--genre`
- `--premise`
- `--style`

`novel project:list`

作用：

- 列出所有小说项目

### 8.3 总纲与分卷规划

`novel outline:set`

作用：

- 设定或更新整本小说总纲

参数建议：

- `--project`
- `--title`
- `--summary`
- `--goal`
- `--conflict`
- `--outcome`

`novel outline:show --project <id>`

作用：

- 查看当前项目总纲

`novel volume:plan`

作用：

- 创建或生成分卷规划

参数建议：

- `--project`
- `--title`
- `--summary`
- `--parent`
- `--instruction`
- `--from-outline`

说明：

- 可由作者手写分卷规划
- 也可基于总纲自动拆分分卷规划

`novel volume:list --project <id>`

### 8.4 角色管理

`novel character:add`

参数建议：

- `--project`
- `--name`
- `--role`
- `--faction`
- `--profession`
- `--profile`
- `--goal`

`novel character:list --project <id>`

### 8.5 势力管理

`novel faction:add`

参数建议：

- `--project`
- `--name`
- `--type`
- `--leader`
- `--goal`
- `--summary`

`novel faction:list --project <id>`

### 8.6 关系管理

`novel relation:character:add`

作用：

- 添加人物与人物之间的关系

参数建议：

- `--project`
- `--from`
- `--to`
- `--type`
- `--summary`
- `--details`
- `--intensity`
- `--visibility`

`novel relation:character:list --project <id> [--character <characterId>]`

作用：

- 查看项目内的人物关系
- 可按某个角色筛选其关联关系

`novel relation:faction:add`

作用：

- 添加人物与势力之间的关系

参数建议：

- `--project`
- `--character`
- `--faction`
- `--type`
- `--title`
- `--stance`
- `--summary`
- `--details`
- `--primary`

`novel relation:faction:list --project <id> [--character <characterId>] [--faction <factionId>]`

作用：

- 查看人物与势力关系
- 可按人物或势力筛选

### 8.7 世界观管理

`novel lore:add`

参数建议：

- `--project`
- `--type`
- `--title`
- `--summary`
- `--details`

适用示例：

- 世界规则放 `--type world_rule`
- 职业体系、官职体系放 `--type profession_system`
- 地点设定放 `--type location`

### 8.8 章纲与章节管理

`novel outline:add`

参数建议：

- `--project`
- `--type`
- `--title`
- `--parent`
- `--summary`

`novel outline:list --project <id>`

`novel chapter:create`

参数建议：

- `--project`
- `--outline`
- `--title`
- `--summary`

`novel chapter:show --id <chapterId>`

说明：

- 若“职业”只是本章临时伪装、任务身份或桥段设定，例如“主角本章伪装成镖师混入商队”，应写在 `outline`，因为它属于情节事件，不是人物稳定设定。

### 8.9 本章规划 plan

`novel chapter:plan`

作用：

- 生成或更新“本章规划”

参数建议：

- `--project`
- `--chapter`
- `--intent`
- `--from-outline`
- `--from-volume`
- `--model`

生成规则：

1. 若传入 `--intent`，优先吸收作者意图
2. 读取整本小说总纲
3. 读取所属分卷规划
4. 读取章节节点和关联角色、势力、设定
5. 生成结构化本章 plan
6. 保存到 `chapter_plans`

`novel plan:show --chapter <chapterId>`

### 8.10 草稿 draft

`novel draft:write`

作用：

- 基于当前有效 `plan` 生成草稿

参数建议：

- `--project`
- `--chapter`
- `--plan`
- `--instruction`
- `--model`

系统流程：

1. 读取章节信息
2. 读取当前有效本章 plan
3. 汇总总纲、分卷规划、角色、势力、设定
4. 生成 prompt
5. 调用 AI provider
6. 保存到 `chapter_drafts`
7. 写入生成记录

`novel draft:drop --draft <draftId>`

作用：

- 丢弃指定草稿，不进入正式文稿

`novel draft:review --draft <draftId> --action approve`

作用：

- 评审草稿并转为正式文稿

建议扩展参数：

- `--notes`
- `--action approve|reject`

评审规则：

- `approve`：将 draft 状态置为 `approved`，同步到 `chapters.final_text`
- `reject`：保留草稿并记录 review 意见，后续可继续生成新 draft

### 8.11 导出

`novel chapter:export`

参数建议：

- `--project`
- `--chapter`
- `--format markdown`
- `--source final|draft`

## 9. 设定归属与具体用法

为了避免设定分散和重复，V1 约定“谁是什么”和“世界如何运转”分开存。

### 9.1 角色设定放 `characters`

适合放入角色表的内容：

- 长期稳定的人物身份
- 当前职业、头衔、常驻势力
- 性格、目标、秘密、个人冲突
- 会长期影响行为和对话风格的信息

典型例子：

- 主角职业是“镇妖司校尉”
- 女二是“宫廷医师”
- 反派曾是“前任祭司”

系统中的具体用法：

- 用于生成人物口吻、专业术语和行为习惯
- 用于判断角色在某个场景中的知识边界
- 用于 plan 阶段推断该角色会采取什么策略
- 用于 draft 阶段让角色行动更像“这个职业的人”

职业设定落库建议：

- 稳定职业放 `characters.profession`
- 职业细节放 `characters.profession_detail`

### 9.2 世界规则放 `lore_entries`

适合放入世界观表的内容：

- 职业体系
- 官职体系
- 修炼体系中的职业分工
- 行业规则、组织规则、禁忌和资格门槛
- 不属于某一个角色，而属于整个世界的通用知识

典型例子：

- 炼丹师分九品，每提升一品都要通过丹塔认证
- 帝国官职分文武两线，州牧有地方兵权
- 镇妖司内部有巡夜、缉妖、审录三条职业路径

系统中的具体用法：

- 用于让 AI 理解职业背后的制度和等级
- 用于生成更合理的世界规则和社会互动
- 用于校验角色职业是否与世界设定冲突
- 用于在分卷规划里安排职业晋升、派系斗争和规则冲突

落库建议：

- 使用 `lore_entries.type = profession_system`

### 9.3 剧情用途放 `outlines`

适合放入大纲的内容：

- 某一卷、某一章、某一场景临时发生的设定用途
- 角色伪装身份
- 当章任务职业
- 某次行动中的公开身份或潜伏身份

典型例子：

- 第 12 章主角伪装成镖师潜入商队
- 第 34 章女主以见习医师身份进入禁区
- 第 58 章反派假借朝廷使者身份接管城防

系统中的具体用法：

- 只影响对应章节或场景的剧情生成
- 优先影响本章 plan 和 draft 的事件安排
- 不应反向覆盖角色的长期职业设定

### 9.4 势力设定放 `factions`

适合放入势力表的内容：

- 宗门、国家、帮会、商会、组织、阵营
- 势力目标、立场、领袖、资源和内部结构

系统中的具体用法：

- 作为人物归属和阵营冲突的基础信息
- 在 plan 里生成组织博弈、资源争夺和立场碰撞
- 在 draft 里约束角色的公开立场和行动边界

### 9.5 人物关系放关系表

适合放入关系表的内容：

- 人物与人物之间的师徒、恋人、仇敌、血亲、上下级关系
- 人物与势力之间的成员、领袖、卧底、敌对、已脱离关系

系统中的具体用法：

- 在 plan 中推断角色冲突和合作结构
- 在 draft 中提升互动张力和关系一致性
- 在 review 阶段检查“人设是否写崩”“立场是否跳变过快”

### 9.6 一句话判断标准

- “这是这个人长期是谁” 放 `characters`
- “这是这个世界长期怎么运转” 放 `lore_entries`
- “这是这章要怎么演” 放 `outlines`
- “这是哪个组织以及它想做什么” 放 `factions`
- “这是谁和谁、谁和组织之间是什么关系” 放关系表

## 10. 推荐技术选型

### 10.1 语言与运行时

- TypeScript
- Node.js 20+

### 10.2 CLI 框架

二选一：

- `commander`
- `cac`

V1 倾向 `commander`，生态成熟，命令层清晰。

### 10.3 SQLite 访问

二选一：

- `better-sqlite3`
- `drizzle + sqlite`

V1 倾向 `better-sqlite3`，原因是：

- 本地 CLI 场景非常合适
- 同步 API 简洁
- migration 和事务控制更直接

### 10.4 输出展示

- `picocolors` 做 CLI 高亮
- `console.table` 或轻量表格库做列表展示

### 10.5 配置管理

- `dotenv`
- 项目根目录配置文件，例如 `novel.config.json`

## 11. 目录结构建议

```text
hai-novel/
  docs/
    v1-plan.md
  src/
    cli/
      index.ts
      commands/
    app/
      services/
    db/
      client.ts
      migrations/
      repositories/
    domain/
      types/
      entities/
    ai/
      providers/
      prompts/
    utils/
  data/
    novel.db
  exports/
  package.json
  tsconfig.json
```

## 12. V1 业务流程

### 流程 A：从 0 到 1 建立小说项目

1. `novel init`
2. `novel project:create`
3. 设定小说总纲
4. 生成或录入分卷规划
5. 录入角色
6. 录入势力和世界观
7. 录入卷章大纲
8. 创建章节
9. 生成本章 plan
10. 基于 plan 生成 draft
11. 对 draft 执行 drop 或 review
12. 导出 Markdown 正式文稿

### 流程 B：按章节生成 plan 与 draft

1. 选择目标章节
2. 读取总纲与所属分卷规划
3. 读取关联章纲
4. 合并作者意图
5. 生成本章 plan
6. 基于 plan 拼装 draft prompt
7. 调用模型
8. 保存 draft
9. 决定 drop 或 review 转正

## 13. Prompt 体系建议

V1 不需要复杂提示词平台，但要先分层：

- `system prompt`：定义写作助手身份、输出规范、禁止事项
- `project context`：小说简介、风格、题材
- `story context`：总纲、分卷规划、大纲节点、最近剧情
- `character context`：人物目标、关系、口吻
- `faction context`：势力立场、目标、资源
- `task instruction`：本次生成要求

建议先内置 4 类模板：

- 分卷规划生成
- 本章规划生成
- 章节草稿生成
- 文风润色

## 14. 里程碑拆分

### Milestone 1：基础框架

- 初始化 TypeScript CLI 工程
- 接入 SQLite
- 建立 migration 机制
- 跑通 `novel init`

### Milestone 2：核心数据管理

- 项目管理命令
- 总纲与分卷规划命令
- 角色管理命令
- 势力管理命令
- 世界观管理命令
- 大纲管理命令
- 章节管理命令

### Milestone 3：AI 写作闭环

- PromptService
- AIProvider 抽象
- MockProvider
- `chapter:plan`
- `draft:write`
- `draft:review`
- generation\_runs 存档

### Milestone 4：输出与迭代

- Markdown 导出
- 章节状态流转
- 基础错误处理
- 基础测试

## 15. 测试计划

V1 先覆盖关键链路：

- migration 是否能重复执行
- 创建项目后是否能正确写入 SQLite
- 角色/势力/大纲/章节命令是否能正常 CRUD
- 本章 plan 是否能正确落库
- draft 的 drop/review 流程是否正确更新状态
- 生成任务是否能落库
- 导出命令是否能产出 Markdown 文件

测试层次建议：

- 单元测试：service 和 prompt builder
- 集成测试：CLI + SQLite 临时数据库

## 16. 风险与注意事项

### 风险 1：数据结构过早复杂化

V1 应避免一次性引入太多实体，比如关系图谱、版本树、向量库。

### 风险 2：AI 输出不可控

要通过保存生成记录、保留 prompt、支持 draft 丢弃和 review 转正来降低风险。

### 风险 3：上下文拼装过长

V1 先走规则式拼装，不做自动召回过多资料，避免 token 爆炸。

### 风险 4：CLI 体验过重

命令设计要围绕高频操作，避免每次都传很多参数。后续可以补交互式模式。

## 17. 下一步建议

按这个计划进入实现时，推荐顺序是：

1. 初始化 TypeScript 工程和 CLI 入口
2. 搭 SQLite 与 migration
3. 先实现 `project`、`outline`、`volume`、`character`、`faction`
4. 再实现 `chapter:plan`、`draft:write`、`draft:review`

如果继续推进，下一步可以直接开始做：

- 技术脚手架
- SQLite schema
- 命令清单细化
- SQLite schema
- 第一版 CLI 命令骨架
