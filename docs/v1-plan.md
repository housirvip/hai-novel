# AI 小说编写工具 V1 计划

## 1. 项目目标

做一个基于 TypeScript 的 CLI 小说编写工具，使用 SQLite 作为本地数据库，帮助作者以结构化方式管理：

- 小说项目
- 世界观设定
- 角色资料
- 章节与大纲
- AI 生成记录

V1 的目标不是“全自动写小说”，而是先做一个稳定、可扩展的创作操作台，让作者可以在命令行里完成项目管理、资料沉淀、章节组织和 AI 辅助写作。

核心创作闭环调整为：

- 设定总纲
- 设定分卷规划
- 设定人物和势力
- 生成本章规划 `plan`
- 基于 `plan` 生成草稿 `draft`
- 对 `draft` 执行 `check`、`fix` 或 `approve`
- 将 `draft` 丢弃 `drop` 或在 `approve` 后转为正式文稿

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
- 控制台操作日志与进度输出
- AI 任务创建与结果存档
- 基础上下文拼装
- Markdown 导出 plan、draft 和正式文稿

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

输出约定：

- 所有命令默认在控制台打印执行日志
- 短命令至少打印开始和结束结果
- 长流程命令需要按步骤打印当前进度
- 失败时在控制台打印错误原因和失败步骤

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
- `novel hook:add`
- `novel hook:list`
- `novel hook:show`
- `novel hook:bind`
- `novel hook:update`
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
- `HookService`
- `HookTrackingService`
- `LoreService`
- `OutlineService`
- `ChapterService`
- `ChapterPlanService`
- `DraftService`
- `ReviewService`
- `LoggingService`
- `PromptService`
- `GenerationService`
- `ExportService`

说明：

- `LoggingService` 在 V1 中负责统一控制台日志输出格式，不负责数据库持久化

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
- 当前待埋钩子
- 当前已埋未收钩子
- 最近章节摘要
- 用户附加指令

### 6.6 控制台日志规范

V1 的日志不落库，直接输出到控制台。

建议事件：

- `start`：命令开始执行
- `progress`：长流程中间进度
- `success`：命令成功结束
- `error`：命令失败

建议输出内容：

- 命令名
- 当前步骤名
- 当前步骤序号和总步骤数
- 目标对象，例如项目 ID、章节 ID、草稿 ID
- 简短结果说明

适用示例：

- `[start] chapter:plan chapter=12`
- `[progress] chapter:plan 2/6 读取分卷规划`
- `[success] chapter:plan chapter=12 plan=5`
- `[error] draft:write chapter=12 模型调用失败`

## 7. 数据模型设计

V1 推荐最小可用表结构如下。

统一约定：

- 所有表的 `id` 都使用 SQLite 整数自增主键，建议实现为 `INTEGER PRIMARY KEY AUTOINCREMENT`
- 所有外键字段也统一使用整数类型，例如 `project_id`、`chapter_id`、`faction_id`
- CLI 和服务层对外展示时，默认使用数字 ID 作为实体唯一标识
- 若后续需要对外公开稳定标识，可额外增加 `slug` 或 `code`，但不替代内部自增 `id`

### 7.1 projects

存小说项目基础信息。

字段说明：

- `id`：项目主键，使用数字自增。唯一标识一部小说项目，后续所有角色、章节、设定都通过它归属到同一个项目。
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

- `id`：角色主键，使用数字自增。唯一标识一个人物。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`，表示该角色属于哪部作品。
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

- `id`：势力主键，使用数字自增。唯一标识一个组织或阵营。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
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

- `id`：关系主键，使用数字自增。唯一标识一条人物关系记录。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `character_id`：关系发起侧角色 ID，使用数字类型，外键关联 `characters.id`。
- `related_character_id`：关系指向侧角色 ID，使用数字类型，外键关联 `characters.id`。
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

- `id`：关系主键，使用数字自增。唯一标识一条人物与势力关系记录。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `character_id`：角色 ID，使用数字类型，外键关联 `characters.id`。
- `faction_id`：势力 ID，使用数字类型，外键关联 `factions.id`。
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

- `id`：设定条目主键，使用数字自增。唯一标识一条世界观资料。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
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

- `id`：大纲节点主键，使用数字自增。唯一标识一个故事结构节点。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `parent_id`：父节点 ID，使用数字类型，用于表示树状层级关系。例如某个章节节点的父节点是某一卷。
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

- `id`：章节主键，使用数字自增。唯一标识一个正式章节实体。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `outline_id`：关联的大纲节点 ID，使用数字类型，通常对应 `outlines` 中的 `chapter` 类型节点。
- `title`：章节标题，允许和大纲标题一致，也允许在成稿阶段重新命名。
- `summary`：章节摘要，用于快速回顾本章内容，也可作为导出目录摘要。
- `status`：章节当前状态，表示本章处于待规划、已有 plan、草稿中、评审中还是已完稿。
- `final_text`：正式文稿正文，只有在草稿 review 通过后才写入这里。
- `approved_draft_id`：已转正草稿的 ID，使用数字类型，指向最终被采纳的 `chapter_drafts` 记录，便于回溯来源。
- `created_at`：章节创建时间。
- `updated_at`：章节最后更新时间。

`status` 可先支持：

- `created`
- `planning`
- `drafting`
- `reviewing`
- `done`

### 7.9 chapter\_plans

存“本章规划 plan”。

字段说明：

- `id`：本章规划主键，使用数字自增。唯一标识一次有效或历史规划。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `chapter_id`：对应章节 ID，使用数字类型，外键关联 `chapters.id`，表示这是哪一章的 plan。
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

- `id`：草稿主键，使用数字自增。唯一标识一次草稿输出。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `chapter_id`：对应章节 ID，使用数字类型，外键关联 `chapters.id`。
- `plan_id`：关联的本章规划 ID，使用数字类型，表示这份草稿基于哪个 plan 生成。
- `draft_text`：草稿正文内容，是 AI 生成或人工整理后的候选文本。
- `status`：草稿状态，用于表示该草稿当前是待处理、已丢弃还是已采纳。
- `review_notes`：评审意见摘要，记录作者或系统对该草稿的总体评价和修改建议。
- `review_report`：评审结果详情，建议存 JSON，记录 `check` 输出的问题列表、严重级别、定位片段和修复建议。
- `created_at`：草稿创建时间。
- `updated_at`：草稿最后更新时间。

`status` 建议支持：

- `generated`
- `checked`
- `dropped`
- `approved`

说明：

- `generated` 表示草稿已生成，待处理
- `checked` 表示草稿已完成问题检查，但尚未转正
- `dropped` 表示作者丢弃，不进入正式文稿
- `approved` 表示评审通过，并同步到 `chapters.final_text`

### 7.11 story\_hooks

存钩子本体，用于跟踪一条伏笔、悬念、谜团、承诺、隐患或情感线索的完整生命周期。

字段说明：

- `id`：钩子主键，使用数字自增。唯一标识一条钩子。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `title`：钩子标题，用一句短语概括这条钩子，例如“黑玉佩的来历”“大师兄真实立场”。
- `hook_type`：钩子类型，例如谜团、伏笔、情感承诺、危险预警、世界观悬念。
- `summary`：钩子摘要，简短说明这条钩子想让读者记住什么问题或期待什么结果。
- `setup_text`：钩子的设钩说明，记录最初准备怎么埋、要制造什么信息缺口。
- `payoff_text`：钩子的回收目标，记录未来预期如何揭晓、反转或兑现。
- `status`：钩子整体状态，用于表示它当前是未开始、已开始、已结束，或被放弃。
- `priority`：钩子优先级，例如 1 到 5。用于区分主线钩子和次级钩子。
- `start_chapter_id`：首次正式埋钩的章节 ID，使用数字类型，可为空。
- `target_chapter_id`：计划回收的目标章节 ID，使用数字类型，可为空。
- `end_chapter_id`：实际结束或回收的章节 ID，使用数字类型，可为空。
- `created_at`：钩子创建时间。
- `updated_at`：钩子最后更新时间。

`hook_type` 可先支持：

- `mystery`
- `foreshadow`
- `promise`
- `threat`
- `emotion`
- `world_secret`
- `custom`

`status` 建议支持：

- `pending`
- `active`
- `closed`
- `abandoned`

说明：

- `pending` 对应“未开始”，表示钩子已经设计，但还没正式埋进正文
- `active` 对应“已开始”，表示钩子已经埋下，后续还需要推进或回收
- `closed` 对应“已结束”，表示钩子已经兑现、揭晓或完成闭环
- `abandoned` 表示这条钩子作废，不再继续推进

### 7.12 hook\_chapter\_links

存钩子与章节之间的关联，用于记录“这章准备埋什么、实际埋了什么、推进了什么、回收了什么”。

字段说明：

- `id`：关联主键，使用数字自增。唯一标识一条钩子章节记录。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `hook_id`：钩子 ID，使用数字类型，外键关联 `story_hooks.id`。
- `chapter_id`：章节 ID，使用数字类型，外键关联 `chapters.id`。
- `link_type`：章节与钩子的关系类型，用于表示这章对钩子做了什么。
- `planned_note`：计划说明，记录在章节规划阶段想如何处理这条钩子。
- `actual_note`：实际说明，记录成稿里最终如何落地这条钩子。
- `status`：这条章节钩子记录的执行状态，用于区分只是计划、已经完成还是被取消。
- `created_at`：关联创建时间。
- `updated_at`：关联最后更新时间。

`link_type` 建议支持：

- `plan_setup`
- `setup`
- `advance`
- `reveal`
- `close`

`status` 建议支持：

- `planned`
- `done`
- `skipped`

说明：

- `plan_setup` 表示这章“准备埋”但尚未正式写入正文
- `setup` 表示这章已经正式埋下钩子
- `advance` 表示这章对钩子进行了推进，但还未回收
- `reveal` 表示这章揭示了关键真相
- `close` 表示这章完成最终回收，通常会同步把 `story_hooks.status` 更新为 `closed`

### 7.13 generation\_runs

记录每一次 AI 生成任务。

字段说明：

- `id`：生成任务主键，使用数字自增。唯一标识一次模型调用。
- `project_id`：所属小说项目 ID，使用数字类型，外键关联 `projects.id`。
- `chapter_id`：关联章节 ID，使用数字类型，可为空。像分卷规划生成这类任务可能不直接对应单章。
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
- `review_check`
- `review_fix`
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

### 8.7 钩子管理

`novel hook:add`

作用：

- 创建一条新的故事钩子

参数建议：

- `--project`
- `--title`
- `--type`
- `--summary`
- `--setup`
- `--payoff`
- `--target-chapter`

`novel hook:list --project <id> [--status <status>]`

作用：

- 查看项目内全部钩子
- 可按状态筛选，例如未开始、已开始、已结束

`novel hook:show --hook <hookId>`

作用：

- 查看某条钩子的完整生命周期和章节关联记录

`novel hook:bind`

作用：

- 把某条钩子绑定到某一章节，记录是“准备埋”“已埋”“推进”还是“回收”

参数建议：

- `--project`
- `--hook`
- `--chapter`
- `--type`
- `--planned-note`
- `--actual-note`
- `--status`

`novel hook:update`

作用：

- 更新钩子整体状态和关键章节

参数建议：

- `--hook`
- `--status`
- `--start-chapter`
- `--target-chapter`
- `--end-chapter`

### 8.8 世界观管理

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

### 8.9 章纲与章节管理

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

### 8.10 本章规划 plan

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
7. 自动导出本章 plan 的 Markdown 文件

`novel plan:show --chapter <chapterId>`

### 8.11 草稿 draft

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
8. 自动导出本章 draft 的 Markdown 文件

`novel draft:drop --draft <draftId>`

作用：

- 丢弃指定草稿，不进入正式文稿

`novel draft:review --draft <draftId> --action check`

作用：

- 检查、修复或批准草稿

建议扩展参数：

- `--notes`
- `--action check|fix|approve`

评审规则：

- `check`：只检查当前 draft，不改正文；输出问题清单，并按 `error` 和 `warning` 两类报告
- `check`：检查结果写入 `review_notes` 和 `review_report`，并将 draft 状态更新为 `checked`
- `fix`：基于检查结果改写当前 draft 正文，直接更新 `draft_text`
- `fix`：修复后自动重新导出本章 draft Markdown 文件
- `approve`：将 draft 状态置为 `approved`，同步到 `chapters.final_text`
- `approve`：同步后自动导出正式文稿 Markdown 文件

`check` 输出建议：

- `error`：结构性问题或阻塞性问题，例如剧情矛盾、人设崩坏、设定冲突、时间线错误、逻辑断裂
- `warning`：非阻塞性问题，例如文风不稳、节奏拖沓、信息重复、铺垫过弱、情绪不够

### 8.12 导出

`novel chapter:export`

参数建议：

- `--project`
- `--chapter`
- `--format markdown`
- `--source plan|draft|final`

导出规则：

- `chapter:plan` 成功后默认自动导出 `plan.md`
- `draft:write` 成功后默认自动导出 `draft.md`
- `draft:review --action fix` 成功后默认重新导出 `draft.md`
- `draft:review --action approve` 成功后默认自动导出 `final.md`
- `chapter:export` 用于手动重新导出任一阶段文件

建议导出文件命名：

- `exports/chapter-001-plan.md`
- `exports/chapter-001-draft.md`
- `exports/chapter-001-final.md`

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

### 9.6 钩子放独立实体

适合放入钩子实体的内容：

- 需要跨章节持续追踪的伏笔
- 读者会记住并期待回收的悬念
- 当前章节准备埋、已经埋、正在推进或已经回收的线索
- 需要明确生命周期状态的叙事承诺

典型例子：

- 主角体内黑印的真正来源
- 师尊留下的最后一句话到底是什么意思
- 玉佩背后的旧朝血脉秘密
- 女主答应“三月后回来”的承诺线

系统中的具体用法：

- 在 `chapter:plan` 阶段提醒本章要埋哪些钩子、推进哪些钩子
- 在 `draft:write` 阶段保证钩子落地，不会写丢
- 在 `review` 阶段检查钩子有没有误回收、漏推进、提前揭底
- 在后续章节生成时，优先注入仍处于 `active` 状态的钩子

存储建议：

- 钩子本体放 `story_hooks`
- 钩子与章节的计划和落地记录放 `hook_chapter_links`
- `outline` 可以提到“本章埋下某钩子”，但不应作为钩子的唯一事实来源

### 9.7 一句话判断标准

- “这是这个人长期是谁” 放 `characters`
- “这是这个世界长期怎么运转” 放 `lore_entries`
- “这是这章要怎么演” 放 `outlines`
- “这是哪个组织以及它想做什么” 放 `factions`
- “这是谁和谁、谁和组织之间是什么关系” 放关系表
- “这是一条要跨章节追踪和回收的伏笔/悬念” 放钩子实体

### 9.8 可执行的人物拆分

为了让人物系统能直接服务写作，V1 建议先按“叙事职责”拆人物，而不是一开始就无限铺角色。

#### 9.8.1 最小人物集合

一部小说建议先落这 6 类人物：

- 主角：负责推动主线，承接读者视角和成长弧线
- 主对手：负责制造主冲突，和主角形成价值观或利益对撞
- 核心同伴：负责协作、补位、制造互动张力
- 关键导师或引路人：负责传递规则、资源、方向或误导
- 势力代表：负责把某个阵营、组织或国家具象化
- 关键钩子人物：负责承载秘密、伏笔、反转或情感承诺

如果是长篇或网文，推荐起步先做 8 到 12 个核心人物，而不是一次性录入几十个配角。

#### 9.8.2 每个人物必须回答的 8 个问题

每个核心人物至少要明确：

- 他是谁：`name`、`role`、`profession`
- 他属于谁：`faction_id` 或人物与势力关系
- 他想要什么：`goal`
- 他卡在什么地方：`conflict`
- 他对外表现成什么样：`profile`、`personality`
- 他隐藏了什么：`secret`
- 他和主角是什么关系：人物关系表
- 他会在第几卷或哪类章节里起作用：写进卷纲、章纲或钩子

这 8 个问题没有答案时，不建议把该人物提升为核心人物。

#### 9.8.3 人物分层方法

建议把人物分成 3 层：

- A 层核心人物：长期推动主线，必须完整录入 `characters`、关系表、势力关系、关键钩子
- B 层功能人物：负责某卷或某段剧情，录入 `characters` + 必要关系即可
- C 层过场人物：只服务局部桥段，可先只出现在 `outlines`，必要时再升级进 `characters`

判断标准：

- 会反复影响剧情走向的人物，进 A 层
- 只在一卷里重要的人物，进 B 层
- 只在一两章中承担情节功能的人物，先放 C 层

#### 9.8.4 可执行录入顺序

建议按下面顺序录入人物：

1. 先建主角和主对手
2. 再建主角所在势力和主对手所在势力
3. 再建核心同伴和关键导师
4. 补人物与人物关系
5. 补人物与势力关系
6. 最后补关键钩子人物

这样做的好处是：

- 先把主冲突立住
- 再把阵营结构立住
- 最后再把人物网和悬念网织起来

#### 9.8.5 每类人物的最小录入模板

主角建议至少录入：

- `name`
- `role = protagonist`
- `profession`
- `faction_id`
- `profile`
- `personality`
- `goal`
- `conflict`
- `secret`

主对手建议至少录入：

- `name`
- `role = antagonist`
- `profession`
- `faction_id`
- `profile`
- `goal`
- `conflict`
- `secret`

核心同伴建议至少录入：

- `name`
- `role = ally`
- `profession`
- `profile`
- `personality`
- `goal`

导师或引路人建议至少录入：

- `name`
- `role = mentor`
- `profession`
- `profile`
- `goal`
- `secret`

势力代表建议至少录入：

- `name`
- `role = faction_representative`
- `faction_id`
- `profession`
- `profile`
- `stance`

说明：

- `stance` 可通过人物与势力关系表表达
- 若角色对多个势力有复杂立场，优先补 `character_faction_relations`

#### 9.8.6 和系统实体的映射关系

人物拆分后，建议这样落到系统中：

- 人物基础信息落 `characters`
- 人物归属落 `factions` + `character_faction_relations`
- 人物之间的爱恨合作落 `character_relations`
- 人物携带的秘密和承诺落 `story_hooks`
- 某一章人物要干什么，落 `outlines` 和 `chapter_plans`

#### 9.8.7 一部小说开局的推荐人物包

如果从 0 到 1 开写，推荐先建：

- 1 个主角
- 1 个主对手
- 2 个核心同伴
- 1 个导师
- 2 个势力代表
- 2 到 3 个关键钩子人物

这样通常已经足够支撑前 1 到 2 卷的 plan 和 draft 生成。

#### 9.8.8 CLI 落地步骤

示例顺序：

1. 用 `novel faction:add` 建主角阵营和敌对阵营
2. 用 `novel character:add` 建主角、反派、同伴、导师
3. 用 `novel relation:character:add` 建主角和其他核心人物的关系
4. 用 `novel relation:faction:add` 建人物与势力关系
5. 用 `novel hook:add` 建人物身上的秘密、承诺和悬念
6. 在 `novel chapter:plan` 时把这些人物关系和钩子注入进去

#### 9.8.9 人物拆分完成的验收标准

当下面这些条件满足时，可以认为人物拆分已经可执行：

- 主角和主对手都已建档
- 至少存在一组清晰的人物关系冲突
- 至少存在一组清晰的阵营关系冲突
- 至少存在两条由人物承载的关键钩子
- 每个 A 层核心人物都具备 `goal`、`conflict`、`secret`
- 系统已经能基于这些人物生成稳定的 chapter plan

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
8. 录入或创建钩子
9. 创建章节
10. 生成本章 plan
11. 自动导出本章 plan Markdown
12. 绑定本章要埋/推进/回收的钩子
13. 基于 plan 生成 draft
14. 自动导出本章 draft Markdown
15. 对 draft 执行 drop、check、fix 或 approve
16. 若执行 fix，则重新导出 draft Markdown
17. 若执行 approve，则自动导出正式文稿 Markdown
18. 更新钩子状态并输出控制台日志

### 流程 B：按章节生成 plan 与 draft

1. 选择目标章节
2. 读取总纲与所属分卷规划
3. 读取关联章纲
4. 读取当前待埋和未回收钩子
5. 合并作者意图
6. 生成本章 plan
7. 导出本章 plan Markdown
8. 基于 plan 拼装 draft prompt
9. 调用模型
10. 保存 draft
11. 导出本章 draft Markdown
12. 决定 drop、check、fix 或 approve
13. 若执行 fix，则重新导出 draft Markdown
14. 若执行 approve，则导出正式文稿 Markdown
15. 根据结果更新钩子进度
16. 输出命令执行进度与结果日志

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
- 控制台日志输出
- 基础错误处理
- 基础测试

## 15. 测试计划

V1 先覆盖关键链路：

- migration 是否能重复执行
- 创建项目后是否能正确写入 SQLite
- 角色/势力/大纲/章节命令是否能正常 CRUD
- 本章 plan 是否能正确落库
- draft 的 `check`/`fix`/`approve`/`drop` 流程是否正确更新状态
- `check` 是否能输出 `error` 和 `warning` 两类问题
- `fix` 是否能正确改写并保存当前 draft
- 生成任务是否能落库
- 命令开始、进度、成功、失败是否都能正确打印到控制台
- plan、draft、final 是否都能正确导出 Markdown 文件
- 手动导出命令是否能重新导出指定阶段文件

测试层次建议：

- 单元测试：service 和 prompt builder
- 集成测试：CLI + SQLite 临时数据库

## 16. 风险与注意事项

### 风险 1：数据结构过早复杂化

V1 应避免一次性引入太多实体，比如关系图谱、版本树、向量库。

### 风险 2：AI 输出不可控

要通过保存生成记录、保留 prompt、支持 draft 的 `check`/`fix`/`approve` 分段处理来降低风险。

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
