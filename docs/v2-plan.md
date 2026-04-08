# AI 小说编写工具 V2 计划

## 1. V2 目标

V2 聚焦把当前 V1 的“生成工具”升级为“可编辑、可回写、可追踪状态的创作工作台”。

核心任务：

1. `plan` 和 `draft` 导出的 Markdown 文件允许作者手动修改，并支持回写到系统。
2. `plan` 和 `draft` 生成或修订后，不直接更新世界状态、人物状态、钩子状态；只有 `approve` 后才正式更新状态。
3. AI provider 增加 `anthropic` 支持，并保留 `custom` 扩展入口。
4. 角色拥有的物品需要结构化记录和查询。

V2 的重点不是增加更多命令数量，而是补齐“人机协作写作”的关键闭环：

- AI 先生成
- 作者在 Markdown 中手改
- 系统再把手改结果回写
- 只有正式批准后才沉淀世界状态

## 2. V2 设计原则

- 作者优先：导出的 Markdown 不是一次性产物，而是可编辑工作文件。
- 审批后生效：所有状态变更必须和 `approve` 绑定，避免草稿污染正式设定。
- 结构化与自由编辑并存：作者可以自由改文稿，但系统仍保留结构化数据。
- Provider 可扩展：OpenAI、Anthropic、Custom、Mock 走统一抽象。
- 可追溯：任何回写和状态更新都要能追溯来源。

## 3. V2 范围

### 3.1 必做

- `plan.md` / `draft.md` 导出文件回写
- 回写时的冲突检测与覆盖策略
- `approve` 驱动的状态更新机制
- 章节正式文本驱动的状态提取与落库
- `anthropic` provider 接入
- `custom` provider 配置化接入
- 人物物品系统
- 相应 CLI 命令、日志、测试与文档

### 3.2 建议预留

- 回写版本号或文件指纹
- 状态变更预览
- 物品转移记录
- 批量回写扫描

### 3.3 V2 不做

- 图形化编辑器
- 实时双向同步
- 多人并发协作编辑
- 自动处理复杂 Git merge

## 4. 关键能力设计

### 4.1 Markdown 可编辑与回写

目标：

- 导出的 `plan.md` 和 `draft.md` 可以被作者直接修改
- 系统支持把修改后的 Markdown 回写到数据库
- 回写后保留“来源于手工编辑”的标记

建议命令：

- `novel plan export --chapter <id>`
- `novel plan import --chapter <id> --input <path>`
- `novel draft export --draft <id>`
- `novel draft import --draft <id> --input <path>`

也可兼容别名：

- `novel chapter import --chapter <id> --source plan --input <path>`
- `novel chapter import --chapter <id> --source draft --input <path>`

建议行为：

- 导出时在 Markdown 头部写入最小元数据
- 回写时先校验元数据中的实体 ID、类型、导出时间、版本号
- 若数据库内容已变化，提示用户是否继续覆盖
- 回写成功后更新数据库正文，并记录“最近一次导出文件路径”和“最近一次回写时间”

建议 Markdown 头部元数据：

```md
---
entity_type: chapter_plan
entity_id: 12
chapter_id: 8
project_id: 1
source_version: 3
exported_at: 2026-04-07T10:00:00Z
---
```

建议新增字段：

- `chapter_plans.source_version`
- `chapter_plans.last_export_path`
- `chapter_plans.last_exported_at`
- `chapter_plans.last_imported_at`
- `chapter_plans.updated_from`
- `chapter_drafts.source_version`
- `chapter_drafts.last_export_path`
- `chapter_drafts.last_exported_at`
- `chapter_drafts.last_imported_at`
- `chapter_drafts.updated_from`

字段说明：

- `source_version`：正文版本号，每次生成、fix 或导入回写后递增，用于检测覆盖冲突。
- `last_export_path`：最近一次导出 Markdown 的路径，便于定位工作文件。
- `last_exported_at`：最近一次导出时间。
- `last_imported_at`：最近一次从 Markdown 回写的时间。
- `updated_from`：最近一次内容更新来源，建议取值 `ai_generate`、`ai_fix`、`manual_import`。

验收标准：

- 作者手改 Markdown 后能成功回写
- 回写后 `show` 命令能看到最新文本
- 冲突场景下能给出明确提示

### 4.2 审批后才更新状态

目标：

- `plan`、`draft`、`fix` 阶段都只产生候选内容
- 只有 `approve` 之后，系统才更新正式状态

V2 明确拆分两类状态：

1. 文稿状态
2. 世界状态

文稿状态包含：

- `plan`
- `draft`
- `final`

世界状态包含：

- 人物当前状态
- 势力当前状态
- 钩子当前状态
- 关键世界事实
- 角色持有物
- 关键物品的章节级动态状态

建议流程：

1. `plan` 生成，仅写 `chapter_plans`
2. `draft` 生成，仅写 `chapter_drafts`
3. `draft review --action fix`，只更新 draft 文本
4. `draft review --action approve`，将草稿写为正式文稿
5. `approve` 后触发状态提取与状态更新

建议新增模块：

- `StateExtractionService`
- `StateUpdateService`
- `ApprovalService`

建议状态更新来源：

- 只从 `chapters.final_text` 提取
- 禁止直接从 `plan_text` 或 `draft_text` 更新正式状态

建议新增命令：

- `novel state chapter-preview --chapter <id>`
- `novel state approve-sync --chapter <id>`
- `novel state show --project <id>`

其中：

- `chapter-preview`：查看本章正式文稿将会影响哪些状态
- `approve-sync`：对历史正式章节补跑状态同步

建议数据层拆分：

- 保留原始设定表，继续存“静态资料”
- 新增状态快照表，存“动态变化”

推荐方案优先级：

1. V2 先上“章节状态快照 + 人物 / 势力 / 钩子对象快照”
2. 物品状态先走轻量方案，写入 `chapter_state_snapshots.raw_payload`
3. 如果后续查询需求明显增大，再把物品状态升格为独立表

推荐新表：

### `chapter_state_snapshots`

- `id`：主键，自增数字 ID。表示一条章节状态快照记录。
- `project_id`：所属项目 ID。说明这条状态快照属于哪本小说。
- `chapter_id`：来源章节 ID。说明状态是由哪一章正式文稿触发。
- `source_draft_id`：来源草稿 ID。用于回溯是哪份 draft 被 approve 后生成。
- `status`：状态快照执行结果。建议值为 `pending`、`applied`、`failed`。
- `summary`：本次状态快照摘要。用来快速查看本章改动了哪些对象。
- `raw_payload`：原始状态提取结果 JSON。用于调试和回放。
- `applied_at`：状态正式写入时间。
- `created_at`：记录创建时间。

### `character_state_snapshots`

- `id`：主键，自增数字 ID。表示一条角色状态快照。
- `project_id`：所属项目 ID。
- `character_id`：角色 ID。说明状态属于哪个人物。
- `chapter_id`：该快照对应的章节 ID。
- `chapter_snapshot_id`：来源章节状态快照 ID。用于追溯这条快照来自哪次章节状态同步。
- `status_summary`：人物当前状态摘要，例如伤势、立场、秘密暴露情况。
- `location`：人物当前所在地点。
- `goal`：人物当前阶段目标。
- `public_impression`：他人在故事内可见的印象或身份标签。
- `internal_state`：人物内在心理或隐藏状态。
- `created_at`：快照创建时间。

### `faction_state_snapshots`

- `id`：主键，自增数字 ID。表示一条势力状态快照。
- `project_id`：所属项目 ID。
- `faction_id`：势力 ID。说明状态属于哪个势力。
- `chapter_id`：该快照对应的章节 ID。
- `chapter_snapshot_id`：来源章节状态快照 ID。
- `status_summary`：势力当前状态摘要。
- `power_shift`：势力权力变化说明。
- `external_relation_summary`：对外关系变化摘要。
- `created_at`：快照创建时间。

### `hook_state_snapshots`

- `id`：主键，自增数字 ID。表示一条钩子状态快照。
- `project_id`：所属项目 ID。
- `hook_id`：钩子 ID。说明状态属于哪个钩子。
- `chapter_id`：该快照对应的章节 ID。
- `chapter_snapshot_id`：来源章节状态快照 ID。
- `progress_status`：钩子进度状态，建议值为 `pending`、`started`、`advanced`、`resolved`。
- `progress_note`：本章对钩子的推进说明。
- `created_at`：快照创建时间。

验收标准：

- `plan` 和 `draft` 阶段不更新正式状态
- `approve` 后能看到状态同步结果
- 状态更新可追溯到章节和草稿
- 物品状态可通过章节快照原始 JSON 与 `state show` 回看

### 4.3 AI Provider 增加 Anthropic

目标：

- 在现有 `mock`、`openai` 之外增加 `anthropic`
- 同时保留 `custom` 接入，便于对接自建兼容网关
- CLI、配置、诊断、生成闭环统一支持

建议新增配置：

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKeyEnvName": "ANTHROPIC_API_KEY",
    "baseUrl": "https://api.anthropic.com"
  }
}
```

建议实现：

- 新增 `AnthropicProvider`
- 适配统一 `AIProvider.generateText()`
- 在 `provider-factory` 中接入 `anthropic`
- 扩展 `ai status`
- 扩展 `ai doctor`
- 支持 `prompt`、`plan`、`draft`、`fix` 全流程

建议诊断增强：

- `ai doctor` 能识别 `ANTHROPIC_API_KEY`
- `ai doctor --test-generate` 支持在 `anthropic` 下跑最小自检
- 错误分类增加 `authentication_error`、`rate_limit`、`provider_error`

验收标准：

- 切换配置后可正常调用 Anthropic
- mock / openai / anthropic / custom 共用同一套命令
- `ai doctor` 能对 anthropic 输出清晰诊断

### 4.4 人物物品系统

目标：

- 记录角色当前拥有的物品
- 记录物品变化
- 支持在上下文中把关键物品喂给 AI
- 用轻量方式追踪正式章节里的物品动态状态

设计原则：

- 物品是独立实体，不只是一段文本
- “人物拥有哪些物品”与“物品本身是什么”分开建模
- V2 优先做轻量闭环，不急着把所有动态状态拆成独立表
- 后续可扩展为物品转移、损坏、升级

推荐新表：

### `items`

- `id`：主键，自增数字 ID。表示一个物品实体。
- `project_id`：所属项目 ID。说明这个物品属于哪本小说。
- `name`：物品名称，例如“黑玉佩”“掌门令”。
- `category`：物品分类，例如 `weapon`、`artifact`、`document`、`currency`。
- `rarity`：稀有度或重要级别，例如 `common`、`rare`、`legendary`。
- `description`：物品描述。说明外观、功能和叙事价值。
- `origin`：物品来源。记录它最初从哪里来。
- `status`：物品当前状态，例如 `normal`、`damaged`、`sealed`、`lost`。
- `created_at`：创建时间。
- `updated_at`：更新时间。

### `character_items`

- `id`：主键，自增数字 ID。表示一条人物与物品的关联记录。
- `project_id`：所属项目 ID。
- `character_id`：角色 ID。说明是谁拥有或持有该物品。
- `item_id`：物品 ID。说明关联的是哪个物品。
- `ownership_type`：持有关系类型，建议值 `own`、`carry`、`borrow`、`use`。
- `quantity`：数量。适合货币、丹药、箭矢等可堆叠物品。
- `is_equipped`：是否装备中。适合武器、防具、法器。
- `note`：补充说明，例如“暂由主角保管”“表面是赝品”。
- `start_chapter_id`：开始持有的章节 ID。
- `end_chapter_id`：结束持有的章节 ID。为空表示当前仍持有。
- `created_at`：创建时间。
- `updated_at`：更新时间。

### 物品动态状态的 V2 轻量方案

- 不单独创建 `item_state_snapshots`
- 物品的章节动态状态由 AI 在 `approve` 后统一提取
- 提取结果直接写入 `chapter_state_snapshots.raw_payload.items`
- `state show --project <id> --chapter <id>` 再把这些 JSON 解析成可读表格

这样做的原因：

- 先把“approve 后能追踪关键物品变化”的闭环做起来
- 避免一开始就把物品系统做得过重
- 等未来真的出现高频跨章节物品历史查询，再升级为独立表

建议命令：

- `novel item add`
- `novel item list`
- `novel item show`
- `novel character item:add`
- `novel character item:list`
- `novel character item:remove`

在上下文中的用途：

- 生成 `plan` 时提示“本章关键道具”
- 生成 `draft` 时约束人物随身物品和剧情触发条件
- `review check` 时检查关键物品是否无故消失、跳变或失真
- `approve` 后提取本章实际出现的关键物品状态，供正式状态查看

验收标准：

- 能录入关键物品
- 能查看某角色当前持有哪些物品
- 正式章节 approve 后，物品状态可更新
- 作者可通过 `state show` 查看本章提取到的轻量物品状态

## 5. V2 命令增量建议

建议新增或增强以下命令：

- `novel plan import --chapter <id> --input <path>`
- `novel draft import --draft <id> --input <path>`
- `novel ai doctor` 增加 `anthropic` 诊断
- `novel item add`
- `novel item list`
- `novel item show`
- `novel character item:add`
- `novel character item:list`
- `novel character item:remove`
- `novel state chapter-preview --chapter <id>`
- `novel state approve-sync --chapter <id>`
- `novel state show --project <id>`

## 6. 建议模块调整

V2 建议新增服务：

- `MarkdownSyncService`
- `PlanImportService`
- `DraftImportService`
- `ApprovalService`
- `StateExtractionService`
- `StateUpdateService`
- `ItemService`
- `CharacterItemService`
- `AnthropicProvider`

V2 建议新增 repository：

- `ItemRepository`
- `CharacterItemRepository`
- `ChapterStateUpdateRepository`
- `CharacterStateSnapshotRepository`
- `FactionStateSnapshotRepository`
- `HookStateSnapshotRepository`
- `ItemStateSnapshotRepository`

## 7. 分阶段实施建议

### Phase 1：Markdown 回写闭环

- 导出文件增加元数据头
- 新增 `plan import`
- 新增 `draft import`
- 加入版本冲突检测
- 增加回写日志和测试

阶段目标：

- 先让作者可在系统外编辑再回写

### Phase 2：审批后状态更新

- 梳理现有 `approve` 流程
- 拆出状态提取与状态更新逻辑
- 增加状态事件表或快照表
- 接入 `approve` 后置流程
- 增加状态预览命令

阶段目标：

- 明确“草稿不生效，批准后才生效”

### Phase 3：Anthropic 接入

- 新增 `AnthropicProvider`
- 扩展配置解析和 provider factory
- 扩展 `ai status`、`ai doctor`
- 增加 mock 和 anthropic 相关测试

阶段目标：

- 三种 provider 共存

### Phase 4：人物物品系统

- 新增 `items` 与 `character_items`
- 新增 CLI 命令
- 把物品接入上下文构建
- 把物品接入 approve 后状态更新

阶段目标：

- 把关键道具从文本资料升级为结构化要素

### Phase 5：收尾与回归

- 完善 README
- 完善 help examples
- 完善 migration / repository / service / CLI 测试
- 补齐导入回写异常场景

阶段目标：

- 确保 V2 主流程稳定

## 8. V2 主流程定义

推荐主流程：

1. 作者维护总纲、分卷、人物、势力、物品、钩子
2. 系统生成 `plan`
3. 作者可修改 `plan.md` 并回写
4. 系统基于最新 plan 生成 `draft`
5. 作者可修改 `draft.md` 并回写
6. 系统执行 `check / fix`
7. 作者执行 `approve`
8. 系统写入正式文稿并同步世界状态

## 9. 关键风险

- Markdown 回写容易出现格式漂移，需要最小元数据协议
- 状态同步如果直接写“最新状态”，后续回滚会困难
- Anthropic 和 OpenAI 的返回格式不同，需要 provider 层完全隔离
- 物品系统如果只建静态表，不建持有关系，很快会不够用

## 10. 验收标准

V2 可以视为达标，当且仅当以下条件成立：

- `plan` 和 `draft` 的 Markdown 可编辑且可回写
- 手工回写后的内容能继续参与后续生成流程
- `approve` 之前不会污染正式世界状态
- `approve` 之后能正确更新人物、势力、钩子、物品状态
- `anthropic` provider 可配置、可诊断、可生成
- 关键新增能力都有自动化测试覆盖
