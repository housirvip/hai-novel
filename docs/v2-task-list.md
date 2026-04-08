# AI 小说工具 V2 任务清单

基于当前 [v2-plan.md](/Users/housirvip/codex/hai-novel/docs/v2-plan.md) 拆出的可执行任务清单。

## 0. 当前进度快照

- 当前基础状态：
  - V1 主流程已经可用，可作为 V2 的实现底座
  - `mock / openai / anthropic / custom`、`plan / draft / approve`、Markdown 导出、运行历史、prompt 查看均已具备
- V2 新能力进度：
  - 按“V2 主流程可用度”估算，约为 `78% ~ 86%`
  - 按“v2-plan 全量承诺项”估算，约为 `62% ~ 72%`
- 已具备的可复用能力：
  - 导出系统
  - review / approve 流程
  - provider 抽象
  - context builder
  - CLI 命令组织和错误提示体系
- 主要未完成项：
  - `state chapter-preview / approve-sync` 等状态工具命令
  - 人物物品系统
  - 物品上下文与物品状态快照
  - 少量文档和阶段状态未同步到最新代码
  - 少量补充测试与帮助文本仍可继续收口

建议把接下来的开发优先级定为：

1. 先完成人物物品系统基础表和 CLI
2. 再把物品接入 context、prompt、review 和状态快照
3. 再补 `state chapter-preview / approve-sync`
4. 最后继续补帮助文本、README 和回归测试

## 1. 目标

交付一个基于 TypeScript + CLI + SQLite 的 AI 小说编写工具 V2，支持：

- `plan.md` 和 `draft.md` 导出后手工编辑并回写
- `plan`、`draft`、`fix` 不直接更新正式世界状态
- 仅 `approve` 后更新章节状态快照、人物状态、势力状态、钩子状态、物品状态
- 新增 `anthropic` AI provider
- 新增人物物品管理与状态追踪

## 2. 执行原则

- 每个阶段都必须有可运行结果
- 先闭环，再扩展
- 优先保证数据一致性，再补体验增强
- 每完成一阶段都补最小自动化验证
- 新增字段、表和类型定义都保持中文注释

## 3. 阶段拆分

### Phase 1：Markdown 回写协议设计

阶段状态：已完成

- [x] 明确 `plan` / `draft` Markdown 的元数据头格式
- [x] 设计正文区与元数据区解析规则
- [x] 设计回写覆盖策略
- [x] 设计冲突检测策略
- [x] 明确 `source_version` 递增规则
- [x] 明确 `updated_from` 枚举值

交付物：

- Markdown 导出与回写协议文档
- 可复用的解析输入结构

验收标准：

- 可以区分 `chapter_plan` 与 `chapter_draft`
- 可以从 Markdown 中准确提取实体 ID、版本号和正文内容
- 冲突策略在 CLI 层有明确交互规则

### Phase 2：回写相关数据库变更

阶段状态：已完成

- [x] 为 `chapter_plans` 增加 `source_version`
- [x] 为 `chapter_plans` 增加 `last_export_path`
- [x] 为 `chapter_plans` 增加 `last_exported_at`
- [x] 为 `chapter_plans` 增加 `last_imported_at`
- [x] 为 `chapter_plans` 增加 `updated_from`
- [x] 为 `chapter_drafts` 增加 `source_version`
- [x] 为 `chapter_drafts` 增加 `last_export_path`
- [x] 为 `chapter_drafts` 增加 `last_exported_at`
- [x] 为 `chapter_drafts` 增加 `last_imported_at`
- [x] 为 `chapter_drafts` 增加 `updated_from`
- [x] 补 migration 测试

交付物：

- 可重复执行的数据库迁移
- 回写需要的版本与来源字段

验收标准：

- 新旧工作区都能顺利迁移
- 新字段在 repository 层可读可写

### Phase 3：Markdown 解析与导入基础设施

阶段状态：已完成

- [x] 实现 Markdown 元数据解析器
- [x] 实现正文提取器
- [x] 实现 `plan` 导入数据校验器
- [x] 实现 `draft` 导入数据校验器
- [x] 实现版本冲突检测器
- [x] 为导入错误类型补清晰提示和 hint

建议新增模块：

- `MarkdownSyncService`
- `MarkdownFrontmatterParser`
- `ImportConflictDetector`

交付物：

- Markdown 导入基础设施

验收标准：

- 能识别格式错误、类型错误、ID 不匹配、版本冲突
- 错误提示能明确指出修复方向

### Phase 4：Plan 回写命令闭环

阶段状态：已完成

- [x] 增强 `plan export`，导出元数据头
- [x] 记录 `chapter_plans.last_export_path`
- [x] 记录 `chapter_plans.last_exported_at`
- [x] 实现 `novel plan import --chapter <id> --input <path>`
- [x] 导入后更新 `plan_text`
- [x] 导入后递增 `source_version`
- [x] 导入后写入 `last_imported_at`
- [x] 导入后写入 `updated_from = manual_import`
- [x] 为 `plan import` 增加 help examples
- [x] 为 `plan export/import` 增加 CLI 测试

交付物：

- `plan` Markdown 导出与回写闭环

验收标准：

- 作者修改 `plan.md` 后可成功回写
- 回写后 `plan show` 能看到更新结果
- 回写不会污染其他章节的数据

### Phase 5：Draft 回写命令闭环

阶段状态：已完成

- [x] 增强 `draft` Markdown 导出，写入元数据头
- [x] 记录 `chapter_drafts.last_export_path`
- [x] 记录 `chapter_drafts.last_exported_at`
- [x] 实现 `novel draft import --draft <id> --input <path>`
- [x] 导入后更新 `draft_text`
- [x] 导入后递增 `source_version`
- [x] 导入后写入 `last_imported_at`
- [x] 导入后写入 `updated_from = manual_import`
- [x] 兼容 `draft review` 后的再次导出与再次回写
- [x] 为 `draft export/import` 增加 CLI 测试

交付物：

- `draft` Markdown 导出与回写闭环

验收标准：

- 作者修改 `draft.md` 后可成功回写
- 回写后的 draft 可以继续执行 `check / fix / approve`
- fix 后版本号会继续递增

### Phase 6：回写与生成流程一致性治理

阶段状态：已完成

- [x] 统一 `ai_generate / ai_fix / manual_import` 的版本更新规则
- [x] 梳理 `chapter plan` 对已有手工回写内容的覆盖规则
- [x] 梳理 `draft write` 对已有手工回写 draft 的覆盖规则
- [x] 增加 `--force` 或等效覆盖选项
- [x] 补回写后再次生成的回归测试
- [x] 明确 run history 对手工导入的记录策略

交付物：

- 回写和 AI 生成并存时的一致性规则

验收标准：

- 人工回写后的内容不会被静默覆盖
- 覆盖行为有显式提示或参数

### Phase 7：Approve 后状态快照表设计与迁移

阶段状态：部分完成

- [x] 创建 `chapter_state_snapshots`
- [x] 创建 `character_state_snapshots`
- [x] 创建 `faction_state_snapshots`
- [x] 创建 `hook_state_snapshots`
- [ ] 创建 `item_state_snapshots`
- [x] 为 `chapter_snapshot_id` 建立外键与索引
- [x] 明确 `status`、`progress_status` 等枚举
- [x] 为快照表补 migration 测试

交付物：

- 章节级与对象级状态快照表

验收标准：

- 所有快照表可正确建表
- 章节快照与人物 / 势力 / 钩子 / 物品快照可正确关联

### Phase 8：Approve 状态同步服务

阶段状态：部分完成

- [x] 梳理当前 `draft review --action approve` 调用链
- [ ] 抽出 `ApprovalService`
- [ ] 抽出 `StateExtractionService`
- [ ] 抽出 `StateUpdateService`
- [x] 在 `approve` 后创建 `chapter_state_snapshots`
- [x] 在 `approve` 后写入人物状态快照
- [x] 在 `approve` 后写入势力状态快照
- [x] 在 `approve` 后写入钩子状态快照
- [x] 保证失败时事务回滚
- [x] 补 approve 状态同步测试

交付物：

- 审批后状态同步闭环

验收标准：

- `approve` 前无正式状态快照写入
- `approve` 后能看到章节状态快照和关联对象快照
- 任一步失败不会产生部分写入

### Phase 9：状态命令与可视化查询

阶段状态：部分完成

- [ ] 实现 `novel state chapter-preview --chapter <id>`
- [ ] 实现 `novel state approve-sync --chapter <id>`
- [x] 实现 `novel state show --project <id>`
- [x] 为状态命令补 help examples
- [x] 为状态命令补 CLI 测试

交付物：

- 状态预览、补同步、查看命令

验收标准：

- 作者可以查看某章会影响哪些状态
- 可以对历史 final 章节补跑状态同步

### Phase 10：Anthropic Provider 接入

阶段状态：已完成

- [x] 扩展 `AIProviderType`
- [x] 实现 `AnthropicProvider`
- [x] 在 `provider-factory` 中接入 `anthropic`
- [x] 扩展配置解析
- [x] 扩展 `ai status`
- [x] 扩展 `ai doctor`
- [x] 为 `anthropic` 增加基础错误分类
- [x] 为 `anthropic` 补 mock 级和配置级测试

交付物：

- `mock / openai / anthropic` 三 provider 共存

当前补充说明：

- 实际上已额外支持 `custom` provider
- provider 配置解析、网络探测和错误提示已经统一收口

验收标准：

- 切换 `provider=anthropic` 后命令链路可正常运行
- 缺少 `ANTHROPIC_API_KEY` 时有清晰诊断

### Phase 11：人物物品系统表与基础命令

阶段状态：部分完成

- [ ] 创建 `items`
- [ ] 创建 `character_items`
- [ ] 为物品相关表补索引与外键
- [ ] 实现 `novel item add`
- [ ] 实现 `novel item list`
- [ ] 实现 `novel item show`
- [ ] 实现 `novel character item:add`
- [ ] 实现 `novel character item:list`
- [ ] 实现 `novel character item:remove`
- [ ] 补 repository 和 CLI 测试

交付物：

- 人物物品系统基础闭环

验收标准：

- 能录入物品
- 能建立角色与物品的持有关系
- 能移除或结束持有关系

### Phase 12：物品接入上下文与状态快照

阶段状态：未开始

- [ ] 将当前持有物接入 chapter context
- [ ] 将关键物品接入 `plan` prompt
- [ ] 将关键物品接入 `draft` prompt
- [ ] `approve` 后生成 `item_state_snapshots`
- [ ] 在 `review check` 中增加关键物品一致性检查
- [ ] 补 context、prompt、review 测试

交付物：

- 物品进入 AI 上下文和正式状态同步链路

验收标准：

- 生成 `plan / draft` 时可看到关键物品上下文
- `approve` 后可以查询物品状态变化

### Phase 13：日志、帮助文案与 README

阶段状态：未开始

- [x] 为 `plan import` 增加日志
- [x] 为 `draft import` 增加日志
- [x] 为状态同步命令增加日志
- [ ] 为 `item` 命令增加日志
- [x] 为 `anthropic` 使用方式补 README
- [x] 为回写流程补 README 示例
- [ ] 统一 help examples 与错误提示

交付物：

- 完整的命令说明与日志体验

验收标准：

- 所有新增命令都有最小示例
- 用户遇到常见错误时有明确提示

### Phase 14：测试与收尾

阶段状态：部分完成

- [x] 为 Markdown 回写补单元测试
- [x] 为导入冲突补测试
- [x] 为状态快照 repository 补测试
- [x] 为 approve 状态同步补服务测试
- [x] 为 anthropic 配置与 doctor 补测试
- [ ] 为 item 与 character_items 补测试
- [x] 跑通全量 `build / typecheck / test`
- [ ] 补齐剩余文档

交付物：

- V2 可验证版本

验收标准：

- 关键新增主流程可自动验证
- 从导出、手改、回写、approve、状态同步可完整跑通

## 4. 关键依赖关系

- `Phase 1` 先于 `Phase 2`、`Phase 3`
- `Phase 2` 先于 `Phase 4`、`Phase 5`
- `Phase 3` 先于 `Phase 4`、`Phase 5`
- `Phase 4` 先于依赖最新 plan 的后续写作流程验证
- `Phase 5` 先于 `Phase 8`
- `Phase 7` 先于 `Phase 8`、`Phase 9`、`Phase 12`
- `Phase 8` 先于 `Phase 9`
- `Phase 10` 可与 `Phase 11` 并行
- `Phase 11` 先于 `Phase 12`
- `Phase 13`、`Phase 14` 贯穿全程，但最后统一收口

## 5. 建议执行顺序

推荐按这个顺序推进：

1. `Phase 1`
2. `Phase 2`
3. `Phase 3`
4. `Phase 4`
5. `Phase 5`
6. `Phase 6`
7. `Phase 7`
8. `Phase 8`
9. `Phase 9`
10. `Phase 10`
11. `Phase 11`
12. `Phase 12`
13. `Phase 13`
14. `Phase 14`

当前更推荐的现实开发节奏：

1. 先完成人物物品系统基础表和 CLI
2. 再把物品接入 context、prompt、review 和状态快照
3. 再补 `state chapter-preview / approve-sync`
4. 最后继续补帮助文本、README 和测试收口

## 6. 第一批开发建议

如果要尽快进入编码，建议第一批只做下面这些：

1. `Phase 1`
2. `Phase 2`
3. `Phase 3`
4. `Phase 4`
5. `Phase 5`

第一批完成后，V2 就会先拥有最重要的作者体验提升：

- 可以导出
- 可以手改
- 可以回写
- 可以继续生成和审批

当前这批已经完成，下一批最值得进入编码的是：

1. `Phase 11`
2. `Phase 12`
3. `Phase 9` 中剩余的两个状态命令
