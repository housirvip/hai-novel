# AI 小说工具 V1 任务清单

基于当前 [v1-plan.md](/Users/housirvip/codex/hai-novel/docs/v1-plan.md) 拆出的可执行任务清单。

## 0. 当前进度快照

- 当前整体进度：
  - 按“主流程可用度”估算，约为 `80% ~ 85%`
  - 按“v1-plan 全量承诺项”估算，约为 `70% ~ 75%`
- 已基本完成的阶段：
  - `Phase 1` 到 `Phase 3`
  - `Phase 5` 到 `Phase 12`
- 部分完成的阶段：
  - `Phase 4`：已具备 `init / project / lore / outline:add / outline:list`，但 `outline:set / outline:show / volume:*` 还未补齐
  - `Phase 13`：日志体系和主要长流程日志已完成，但失败分类和覆盖范围仍可继续增强
- 主要未完成项：
  - `outline:set`
  - `outline:show`
  - `volume:plan`
  - `volume:list`
  - `plan:show`
  - 自动化测试与 README 收尾

建议把接下来的收口优先级定为：

1. 补齐大纲 / 分卷缺失命令
2. 补 `plan:show` 和历史导出增强
3. 补测试
4. 补 README 与帮助文本

## 1. 目标

交付一个基于 TypeScript + CLI + SQLite 的 AI 小说编写工具 V1，支持：

- 项目初始化
- 总纲、分卷、章节管理
- 人物、势力、关系管理
- 钩子管理
- 本章 plan 生成
- draft 生成
- review 的 `check`、`fix`、`approve`
- plan / draft / final 的 Markdown 导出
- 控制台日志输出

## 2. 执行原则

- 每个阶段都必须有可运行结果
- 先打通主流程，再补增强能力
- 优先做高频命令，不先做边角功能
- 每完成一阶段都补最小验证

## 3. 阶段拆分

### Phase 1：项目骨架

阶段状态：已完成

- [x] 初始化 Node.js + TypeScript 工程
- [x] 配置 `tsconfig.json`
- [x] 配置 `package.json` 脚本
- [x] 建立 `src/cli`、`src/app`、`src/db`、`src/domain`、`src/ai`、`src/utils` 目录
- [x] 选择并接入 CLI 框架
- [x] 选择并接入 SQLite 驱动
- [x] 创建 CLI 入口 `novel`

交付物：

- 可运行的 CLI 空骨架
- 可执行 `novel --help`

验收标准：

- `npm run build` 成功
- `novel` 命令可以启动

### Phase 2：数据库基础设施

阶段状态：已完成

- [x] 设计 SQLite 初始化流程
- [x] 建立 migration 机制
- [x] 建立数据库连接管理
- [x] 建立基础 repository 规范
- [x] 定义时间字段写入策略
- [x] 定义事务封装方式

交付物：

- SQLite 数据库初始化能力
- 可重复执行的 migration

验收标准：

- 多次执行初始化不会破坏数据库
- 新数据库可自动建表

### Phase 3：核心表落库

阶段状态：已完成

- [x] 创建 `projects`
- [x] 创建 `characters`
- [x] 创建 `factions`
- [x] 创建 `character_relations`
- [x] 创建 `character_faction_relations`
- [x] 创建 `lore_entries`
- [x] 创建 `outlines`
- [x] 创建 `chapters`
- [x] 创建 `chapter_plans`
- [x] 创建 `chapter_drafts`
- [x] 创建 `story_hooks`
- [x] 创建 `hook_chapter_links`
- [x] 创建 `generation_runs`
- [x] 配置必要索引和外键

交付物：

- V1 全部核心表

验收标准：

- 所有表可正常创建
- 外键关系符合当前设计
- `id` 全部为整数自增

### Phase 4：项目与基础设定命令

阶段状态：部分完成

- [x] 实现 `novel init`
- [x] 实现 `novel project:create`
- [x] 实现 `novel project:list`
- [ ] 实现 `novel outline:set`
- [ ] 实现 `novel outline:show`
- [ ] 实现 `novel volume:plan`
- [ ] 实现 `novel volume:list`
- [x] 实现 `novel lore:add`
- [x] 实现 `novel lore:list`

当前说明：

- 已实现 `novel outline:add`
- 已实现 `novel outline:list`
- 当前可以录入总纲和分卷节点，但命令命名与原计划略有偏移

交付物：

- 能创建项目并录入总纲、分卷、世界观

验收标准：

- 可以从零创建小说项目
- 总纲和分卷可落库并查询

### Phase 5：人物与势力系统

阶段状态：已完成

- [x] 实现 `novel faction:add`
- [x] 实现 `novel faction:list`
- [x] 实现 `novel character:add`
- [x] 实现 `novel character:list`
- [x] 支持 `profession`、`faction_id` 等字段录入
- [x] 实现 `novel relation:character:add`
- [x] 实现 `novel relation:character:list`
- [x] 实现 `novel relation:faction:add`
- [x] 实现 `novel relation:faction:list`

交付物：

- 可录入核心人物、势力、人物关系、人物与势力关系

验收标准：

- 能建立最小人物集合
- 能查询主角相关的人物网和阵营网

### Phase 6：章节与钩子系统

阶段状态：已完成

- [x] 实现 `novel outline:add`
- [x] 实现 `novel outline:list`
- [x] 实现 `novel chapter:create`
- [x] 实现 `novel chapter:show`
- [x] 实现 `novel hook:add`
- [x] 实现 `novel hook:list`
- [x] 实现 `novel hook:show`
- [x] 实现 `novel hook:bind`
- [x] 实现 `novel hook:update`

交付物：

- 可建立章纲、章节、钩子和钩子章节关联

验收标准：

- 能查看某章节绑定了哪些钩子
- 能查看某钩子的生命周期

### Phase 7：上下文构建

阶段状态：已完成

- [x] 实现 project context 聚合
- [x] 实现 outline context 聚合
- [x] 实现 character context 聚合
- [x] 实现 faction context 聚合
- [x] 实现 relation context 聚合
- [x] 实现 hook context 聚合
- [x] 实现 chapter context 聚合
- [x] 设计统一的 prompt 输入结构

交付物：

- 可供 AI 使用的上下文构建器

验收标准：

- 指定章节时能拉出完整上下文
- 上下文能覆盖 plan 和 draft 所需信息

### Phase 8：AI Provider 与生成闭环

阶段状态：已完成

- [x] 定义 `AIProvider` 抽象
- [x] 实现 `MockProvider`
- [x] 预留真实模型 Provider 接口
- [x] 实现 `generation_runs` 写入
- [x] 实现 prompt builder

当前说明：

- 已支持 `mock` 和 `openai`
- 已支持 prompt 查看与导出
- 已支持模板元数据和版本快照写入 `generation_runs`

交付物：

- 可替换的 AI 调用层

验收标准：

- 不接真实模型时也能跑通 mock 流程
- 每次生成都能留下生成记录

### Phase 9：章节计划生成

阶段状态：已完成

- [x] 实现 `novel chapter:plan`
- [x] 支持作者意图输入
- [x] 支持基于总纲 + 分卷 + 章纲自动生成
- [x] 保存 `chapter_plans`
- [x] 自动导出 `plan.md`

补充缺口：

- [ ] 实现 `novel plan:show`

交付物：

- 章节计划生成能力

验收标准：

- 能生成可读 plan
- plan 可回查、可重复导出

### Phase 10：草稿生成

阶段状态：已完成

- [x] 实现 `novel draft:write`
- [x] 基于当前有效 plan 生成 draft
- [x] 保存 `chapter_drafts`
- [x] 写入 `generation_runs`
- [x] 自动导出 `draft.md`

交付物：

- 草稿生成能力

验收标准：

- 每个 draft 都有 plan 来源
- draft 生成后可直接查看 Markdown

### Phase 11：草稿评审流

阶段状态：已完成

- [x] 实现 `novel draft:drop`
- [x] 实现 `novel draft:review --action check`
- [x] 实现 `novel draft:review --action fix`
- [x] 实现 `novel draft:review --action approve`
- [x] `check` 输出 `error` / `warning`
- [x] `fix` 改写当前 draft
- [x] `approve` 写入 `chapters.final_text`
- [x] `fix` 后重新导出 `draft.md`
- [x] `approve` 后导出 `final.md`

当前说明：

- 当前 review 主要基于 V1 规则检查
- 后续仍可增强对角色一致性、势力立场、钩子推进的语义检查

交付物：

- 完整的草稿评审闭环

验收标准：

- `check` 不改正文
- `fix` 会更新 draft
- `approve` 会生成 final

### Phase 12：导出系统

阶段状态：已完成

- [x] 实现 `novel chapter:export`
- [x] 支持 `--source plan|draft|final`
- [x] 统一导出文件命名规则
- [x] 统一导出文件目录规则
- [x] 保证自动导出与手动导出兼容

当前说明：

- 已支持 prompt Markdown 导出
- 后续可继续扩展 run 历史导出和 JSON 导出

交付物：

- 多阶段 Markdown 导出系统

验收标准：

- plan / draft / final 都可导出
- 同一章节可重复导出，不破坏已有结果

### Phase 13：控制台日志

阶段状态：部分完成

- [x] 定义统一日志输出格式
- [x] 实现 `start` 日志
- [x] 实现 `progress` 日志
- [x] 实现 `success` 日志
- [x] 实现 `error` 日志
- [x] 为长流程命令补步骤输出

优先覆盖命令：

- [x] `init`
- [x] `chapter:plan`
- [x] `draft:write`
- [x] `draft:review`
- [x] `chapter:export`

当前说明：

- 日志已覆盖主链路
- 后续可继续增强错误分类和更多命令的细粒度步骤日志

交付物：

- 统一的控制台执行日志

验收标准：

- 长任务执行时能看见清晰进度
- 失败时能看见失败步骤和原因

### Phase 14：测试与收尾

阶段状态：未完成

- [ ] 为 migration 补测试
- [ ] 为 repository 补测试
- [ ] 为 context builder 补测试
- [ ] 为 prompt builder 补测试
- [ ] 为核心 CLI 命令补集成测试
- [ ] 为导出逻辑补测试
- [ ] 为 review 流程补测试
- [ ] 清理命令帮助文本
- [ ] 补充 README 最小使用说明

当前说明：

- 已有手工验证链路和 `build / typecheck` 验证
- 但自动化测试体系还未建立，仍是 V1 目前最大的缺口

交付物：

- V1 可验证版本

验收标准：

- 关键主流程可自动验证
- 从项目创建到 final 导出能完整跑通

## 4. 关键依赖关系

- `Phase 1` 是全部工作的前置
- `Phase 2` 先于所有数据读写
- `Phase 3` 先于所有业务命令
- `Phase 7` 先于 `Phase 9` 和 `Phase 10`
- `Phase 8` 先于 `Phase 9`、`Phase 10`、`Phase 11`
- `Phase 10` 先于 `Phase 11`
- `Phase 12` 依赖 `Phase 9`、`Phase 10`、`Phase 11`

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

当前建议改为：

1. 先补 `outline:set`、`outline:show`
2. 再补 `volume:plan`、`volume:list`
3. 补 `plan:show`
4. 为 `chapter plan / draft write / review / export` 建最小集成测试
5. 最后补 README 与帮助文案

## 6. 第一周建议

如果按最短路径推进，第一周建议只做这些：

- [ ] Phase 1 全部
- [ ] Phase 2 全部
- [ ] Phase 3 全部
- [ ] Phase 4 的 `init` / `project:create` / `project:list`
- [ ] Phase 5 的 `character:add` / `character:list` / `faction:add` / `faction:list`

当前回看：

- [x] Phase 1 全部
- [x] Phase 2 全部
- [x] Phase 3 全部
- [x] Phase 4 的 `init` / `project:create` / `project:list`
- [x] Phase 5 的 `character:add` / `character:list` / `faction:add` / `faction:list`

这样第一周结束时，至少能：

- 初始化数据库
- 创建项目
- 录入人物和势力
- 为后续 plan / draft 铺好数据基础
