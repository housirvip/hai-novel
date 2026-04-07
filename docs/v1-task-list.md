# AI 小说工具 V1 任务清单

基于当前 [v1-plan.md](/Users/housirvip/codex/hai-novel/docs/v1-plan.md) 拆出的可执行任务清单。

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

- [ ] 初始化 Node.js + TypeScript 工程
- [ ] 配置 `tsconfig.json`
- [ ] 配置 `package.json` 脚本
- [ ] 建立 `src/cli`、`src/app`、`src/db`、`src/domain`、`src/ai`、`src/utils` 目录
- [ ] 选择并接入 CLI 框架
- [ ] 选择并接入 SQLite 驱动
- [ ] 创建 CLI 入口 `novel`

交付物：

- 可运行的 CLI 空骨架
- 可执行 `novel --help`

验收标准：

- `npm run build` 成功
- `novel` 命令可以启动

### Phase 2：数据库基础设施

- [ ] 设计 SQLite 初始化流程
- [ ] 建立 migration 机制
- [ ] 建立数据库连接管理
- [ ] 建立基础 repository 规范
- [ ] 定义时间字段写入策略
- [ ] 定义事务封装方式

交付物：

- SQLite 数据库初始化能力
- 可重复执行的 migration

验收标准：

- 多次执行初始化不会破坏数据库
- 新数据库可自动建表

### Phase 3：核心表落库

- [ ] 创建 `projects`
- [ ] 创建 `characters`
- [ ] 创建 `factions`
- [ ] 创建 `character_relations`
- [ ] 创建 `character_faction_relations`
- [ ] 创建 `lore_entries`
- [ ] 创建 `outlines`
- [ ] 创建 `chapters`
- [ ] 创建 `chapter_plans`
- [ ] 创建 `chapter_drafts`
- [ ] 创建 `story_hooks`
- [ ] 创建 `hook_chapter_links`
- [ ] 创建 `generation_runs`
- [ ] 配置必要索引和外键

交付物：

- V1 全部核心表

验收标准：

- 所有表可正常创建
- 外键关系符合当前设计
- `id` 全部为整数自增

### Phase 4：项目与基础设定命令

- [ ] 实现 `novel init`
- [ ] 实现 `novel project:create`
- [ ] 实现 `novel project:list`
- [ ] 实现 `novel outline:set`
- [ ] 实现 `novel outline:show`
- [ ] 实现 `novel volume:plan`
- [ ] 实现 `novel volume:list`
- [ ] 实现 `novel lore:add`
- [ ] 实现 `novel lore:list`

交付物：

- 能创建项目并录入总纲、分卷、世界观

验收标准：

- 可以从零创建小说项目
- 总纲和分卷可落库并查询

### Phase 5：人物与势力系统

- [ ] 实现 `novel faction:add`
- [ ] 实现 `novel faction:list`
- [ ] 实现 `novel character:add`
- [ ] 实现 `novel character:list`
- [ ] 支持 `profession`、`faction_id` 等字段录入
- [ ] 实现 `novel relation:character:add`
- [ ] 实现 `novel relation:character:list`
- [ ] 实现 `novel relation:faction:add`
- [ ] 实现 `novel relation:faction:list`

交付物：

- 可录入核心人物、势力、人物关系、人物与势力关系

验收标准：

- 能建立最小人物集合
- 能查询主角相关的人物网和阵营网

### Phase 6：章节与钩子系统

- [ ] 实现 `novel outline:add`
- [ ] 实现 `novel outline:list`
- [ ] 实现 `novel chapter:create`
- [ ] 实现 `novel chapter:show`
- [ ] 实现 `novel hook:add`
- [ ] 实现 `novel hook:list`
- [ ] 实现 `novel hook:show`
- [ ] 实现 `novel hook:bind`
- [ ] 实现 `novel hook:update`

交付物：

- 可建立章纲、章节、钩子和钩子章节关联

验收标准：

- 能查看某章节绑定了哪些钩子
- 能查看某钩子的生命周期

### Phase 7：上下文构建

- [ ] 实现 project context 聚合
- [ ] 实现 outline context 聚合
- [ ] 实现 character context 聚合
- [ ] 实现 faction context 聚合
- [ ] 实现 relation context 聚合
- [ ] 实现 hook context 聚合
- [ ] 实现 chapter context 聚合
- [ ] 设计统一的 prompt 输入结构

交付物：

- 可供 AI 使用的上下文构建器

验收标准：

- 指定章节时能拉出完整上下文
- 上下文能覆盖 plan 和 draft 所需信息

### Phase 8：AI Provider 与生成闭环

- [ ] 定义 `AIProvider` 抽象
- [ ] 实现 `MockProvider`
- [ ] 预留真实模型 Provider 接口
- [ ] 实现 `generation_runs` 写入
- [ ] 实现 prompt builder

交付物：

- 可替换的 AI 调用层

验收标准：

- 不接真实模型时也能跑通 mock 流程
- 每次生成都能留下生成记录

### Phase 9：章节计划生成

- [ ] 实现 `novel chapter:plan`
- [ ] 支持作者意图输入
- [ ] 支持基于总纲 + 分卷 + 章纲自动生成
- [ ] 保存 `chapter_plans`
- [ ] 自动导出 `plan.md`

交付物：

- 章节计划生成能力

验收标准：

- 能生成可读 plan
- plan 可回查、可重复导出

### Phase 10：草稿生成

- [ ] 实现 `novel draft:write`
- [ ] 基于当前有效 plan 生成 draft
- [ ] 保存 `chapter_drafts`
- [ ] 写入 `generation_runs`
- [ ] 自动导出 `draft.md`

交付物：

- 草稿生成能力

验收标准：

- 每个 draft 都有 plan 来源
- draft 生成后可直接查看 Markdown

### Phase 11：草稿评审流

- [ ] 实现 `novel draft:drop`
- [ ] 实现 `novel draft:review --action check`
- [ ] 实现 `novel draft:review --action fix`
- [ ] 实现 `novel draft:review --action approve`
- [ ] `check` 输出 `error` / `warning`
- [ ] `fix` 改写当前 draft
- [ ] `approve` 写入 `chapters.final_text`
- [ ] `fix` 后重新导出 `draft.md`
- [ ] `approve` 后导出 `final.md`

交付物：

- 完整的草稿评审闭环

验收标准：

- `check` 不改正文
- `fix` 会更新 draft
- `approve` 会生成 final

### Phase 12：导出系统

- [ ] 实现 `novel chapter:export`
- [ ] 支持 `--source plan|draft|final`
- [ ] 统一导出文件命名规则
- [ ] 统一导出文件目录规则
- [ ] 保证自动导出与手动导出兼容

交付物：

- 多阶段 Markdown 导出系统

验收标准：

- plan / draft / final 都可导出
- 同一章节可重复导出，不破坏已有结果

### Phase 13：控制台日志

- [ ] 定义统一日志输出格式
- [ ] 实现 `start` 日志
- [ ] 实现 `progress` 日志
- [ ] 实现 `success` 日志
- [ ] 实现 `error` 日志
- [ ] 为长流程命令补步骤输出

优先覆盖命令：

- [ ] `init`
- [ ] `chapter:plan`
- [ ] `draft:write`
- [ ] `draft:review`
- [ ] `chapter:export`

交付物：

- 统一的控制台执行日志

验收标准：

- 长任务执行时能看见清晰进度
- 失败时能看见失败步骤和原因

### Phase 14：测试与收尾

- [ ] 为 migration 补测试
- [ ] 为 repository 补测试
- [ ] 为 context builder 补测试
- [ ] 为 prompt builder 补测试
- [ ] 为核心 CLI 命令补集成测试
- [ ] 为导出逻辑补测试
- [ ] 为 review 流程补测试
- [ ] 清理命令帮助文本
- [ ] 补充 README 最小使用说明

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

## 6. 第一周建议

如果按最短路径推进，第一周建议只做这些：

- [ ] Phase 1 全部
- [ ] Phase 2 全部
- [ ] Phase 3 全部
- [ ] Phase 4 的 `init` / `project:create` / `project:list`
- [ ] Phase 5 的 `character:add` / `character:list` / `faction:add` / `faction:list`

这样第一周结束时，至少能：

- 初始化数据库
- 创建项目
- 录入人物和势力
- 为后续 plan / draft 铺好数据基础
