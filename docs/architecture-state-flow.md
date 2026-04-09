# hai-novel 模块责任与状态时序图

这份文档从工程实现角度解释两件事：

1. 各模块分别负责什么，不该负责什么
2. 一条章节创作链路里，状态是按什么顺序变化的

如果你在做下列事情，这份文档会更有用：

- 扩命令
- 改状态机
- 调整 `approve` 逻辑
- 排查“为什么这个命令没改状态”或“为什么它不该改状态”

相关文档：

- 用法说明见 [command-guide.md](command-guide.md)
- 命令状态矩阵见 [command-state-matrix.md](command-state-matrix.md)

## 1. 系统分层与责任边界

```mermaid
flowchart LR
  CLI["CLI Commands"] --> SERVICE["Application Services"]
  SERVICE --> REPO["Repositories"]
  SERVICE --> AI["AI Providers / Prompts"]
  SERVICE --> FS["Markdown Exports / Imports"]
  REPO --> DB["SQLite"]
```

### CLI 层

负责：

- 参数解析
- 选项校验
- 调用 service
- 打印表格、日志、错误

不负责：

- 业务状态推进
- 事务控制
- 跨表一致性判断
- AI prompt 组织

### Service 层

负责：

- 业务规则
- 状态推进
- Repository 编排
- 导入导出流程
- AI 调用与结果落库
- 事务边界

不负责：

- 复杂 SQL 查询优化
- 终端展示细节

### Repository 层

负责：

- 单表或轻量关联的读写
- 基本记录创建、更新、查询

不负责：

- 章节状态机
- 跨项目归属判断
- “哪个命令应该触发什么状态”

### AI 层

负责：

- prompt 模板
- provider 适配
- 输出解析

不负责：

- 业务主状态推进
- 直接写数据库

### Markdown 层

负责：

- 给作者可直接编辑的 plan / draft / final 文件
- 提供回写入口

不负责：

- 直接定义数据库主状态

## 2. 核心服务职责图

```mermaid
flowchart TD
  CS["ChapterService"] --> CCB["ChapterContextBuilder"]
  CS --> CPR["ChapterPlanRepository"]
  CS --> CDR["ChapterDraftRepository"]
  CS --> CR["ChapterRepository"]

  DS["DraftService"] --> CCB
  DS --> CDR
  DS --> CPR
  DS --> CR
  DS --> AS["ApprovalService"]

  AS --> SES["StateExtractionService"]
  AS --> SUS["StateUpdateService"]
  AS --> GR["GenerationRunRepository"]

  PS["PlanService"] --> CPR
  PS --> MSS["MarkdownSyncService"]

  SS["StateService"] --> SES
  SS --> SUS
```

### `ChapterService`

负责：

- `chapter create`
- `chapter plan`
- `chapter export`

关键边界：

- 只负责章节创建、规划生成和导出
- 不负责 review 语义
- 不负责正式状态快照写入

### `DraftService`

负责：

- `draft write`
- `draft review`
- `draft drop`
- `draft import`

关键边界：

- 负责草稿工作流
- 负责章节状态从 `drafting/reviewing` 之间推进
- 只有在 `approve` 时转交 `ApprovalService`

### `ApprovalService`

负责：

- 批准草稿
- 写 `chapters.final_text`
- 写正式状态快照
- 写审批相关生成记录

关键边界：

- 这是默认正式生效的唯一入口
- 这里必须保证事务一致性

### `StateExtractionService`

负责：

- 基于 final 或预览文本提取结构化状态

关键边界：

- 只产出结构化结果
- 不直接写正式状态表

### `StateUpdateService`

负责：

- 把已抽取好的正式状态写成快照

关键边界：

- 只落库
- 不做命令级状态机判断

### `PlanService`

负责：

- `plan show`
- `plan import`

关键边界：

- 只管理章节规划正文本身
- 不推进章节主状态

## 3. 章节主链路时序图

```mermaid
sequenceDiagram
  participant U as User
  participant CLI as CLI
  participant CS as ChapterService
  participant DS as DraftService
  participant AS as ApprovalService
  participant DB as SQLite

  U->>CLI: chapter create
  CLI->>CS: createChapter()
  CS->>DB: insert chapters
  Note over DB: chapters.status = created

  U->>CLI: chapter plan
  CLI->>CS: generatePlan()
  CS->>DB: insert chapter_plans(active)
  CS->>DB: archive old active plans
  CS->>DB: update chapters.status = planning
  CS->>DB: insert generation_runs(chapter_plan)
  Note over DB: 导出 chapter-xxx-plan.md

  U->>CLI: draft write
  CLI->>DS: writeDraft()
  DS->>DB: insert chapter_drafts(status=generated)
  DS->>DB: update chapters.status = drafting
  DS->>DB: insert generation_runs(draft_write)
  Note over DB: 导出 chapter-xxx-draft.md

  U->>CLI: draft review --action check/fix
  CLI->>DS: reviewDraft()
  DS->>DB: update draft / review data
  DS->>DB: update chapters.status = reviewing

  U->>CLI: draft review --action approve
  CLI->>DS: reviewDraft(approve)
  DS->>AS: approveDraft()
  AS->>DB: update chapter_drafts.status = approved
  AS->>DB: update chapters.final_text / approved_draft_id / status = done
  AS->>DB: insert chapter_state_snapshots
  AS->>DB: insert character/faction/hook snapshots
  AS->>DB: insert generation_runs(state_extract, draft_review_approve)
  Note over DB: 导出 chapter-xxx-final.md
```

主链路不变量：

- `chapter create` 之后才能进入 `chapter plan`
- `chapter plan` 之后才能稳定进入 `draft write`
- `approve` 之前不能写正式状态快照
- `approve` 之后该 draft 必须冻结

## 4. Markdown 回写时序图

### plan 回写

```mermaid
sequenceDiagram
  participant U as User
  participant CLI as CLI
  participant PS as PlanService
  participant MSS as MarkdownSyncService
  participant DB as SQLite

  U->>CLI: plan import
  CLI->>PS: importPlan()
  PS->>MSS: parseDocument()
  PS->>MSS: check entity_id / chapter_id / source_version
  PS->>DB: update chapter_plans.plan_text
  PS->>DB: source_version + 1
  PS->>DB: updated_from = manual_import
```

结论：

- `plan import` 只更新规划正文
- 不推进 `chapters.status`
- 不写正式状态

### draft 回写

```mermaid
sequenceDiagram
  participant U as User
  participant CLI as CLI
  participant DS as DraftService
  participant MSS as MarkdownSyncService
  participant DB as SQLite

  U->>CLI: draft import
  CLI->>DS: importDraft()
  DS->>MSS: parseDocument()
  DS->>MSS: check entity_id / chapter_id / source_version
  DS->>DB: update chapter_drafts.draft_text
  DS->>DB: status = generated
  DS->>DB: clear review_notes / review_report
  DS->>DB: source_version + 1
  DS->>DB: updated_from = manual_import
  DS->>DB: recompute chapters.status
```

结论：

- 手工回写 draft 之后，旧 review 结论失效
- 系统会把它当作“新版本待审稿”
- 因此章节通常从 `reviewing` 回到 `drafting`

## 5. 正式状态同步时序图

### approve 默认同步

```mermaid
sequenceDiagram
  participant DS as DraftService
  participant AS as ApprovalService
  participant SES as StateExtractionService
  participant SUS as StateUpdateService
  participant DB as SQLite

  DS->>AS: approveDraft()
  AS->>SES: extractChapterState(finalText=draft_text)
  SES-->>AS: structured payload
  AS->>DB: begin transaction
  AS->>DB: update chapter_drafts.status = approved
  AS->>DB: update chapters.final_text / status = done
  AS->>SUS: applyChapterState(payload)
  SUS->>DB: insert chapter snapshot
  SUS->>DB: insert character/faction/hook snapshots
  AS->>DB: insert generation_runs
  AS->>DB: commit
```

### approve-sync 补同步

```mermaid
sequenceDiagram
  participant U as User
  participant CLI as CLI
  participant SS as StateService
  participant SES as StateExtractionService
  participant SUS as StateUpdateService
  participant DB as SQLite

  U->>CLI: state approve-sync
  CLI->>SS: approveSyncChapter()
  SS->>SES: extractChapterState(finalText=chapter.final_text)
  SES-->>SS: structured payload
  SS->>DB: begin transaction
  SS->>DB: delete old chapter snapshots of this chapter
  SS->>SUS: applyChapterState(payload)
  SUS->>DB: insert rebuilt snapshots
  SS->>DB: commit
```

结论：

- `approve-sync` 是重建正式状态，不是创作状态推进
- 它不能替代 `approve`
- 它也不应该改 `chapters.status`

## 6. 命令扩展时的判断清单

新增命令前，建议先问 6 个问题：

1. 这条命令是在改设定、改中间态，还是改正式状态？
2. 它是否应该推进 `chapters.status`？
3. 它是否应该写 `generation_runs`？
4. 它是否应该导出 Markdown？
5. 它是否会让旧 review 结果失效？
6. 它是否必须放进事务里？

### 什么时候应该改 `chapters.status`

可以改：

- 章节主链路命令
- 会明确改变当前章节创作阶段的命令

通常不该改：

- 设定命令
- 查询命令
- 只导出文件的命令
- 正式状态补同步命令

### 什么时候应该写正式状态快照

可以写：

- `approve`
- 明确的“重建正式状态”命令

通常不该写：

- `chapter plan`
- `draft write`
- `draft review check`
- `draft review fix`
- `plan import`
- `draft import`

## 7. 当前最重要的不变量

### 不变量 1：正式状态只能来源于已批准内容

正式状态快照要么来自：

- `draft review --action approve`
- `state approve-sync` 基于已有 `final_text` 的重建

不能来自：

- plan
- 未批准 draft
- 预览结果

### 不变量 2：Repository 不应该偷偷推进章节状态

原因：

- 章节状态推进属于业务规则
- 必须由 service 在完整上下文下决定

### 不变量 3：作者手工修改 draft 之后，旧 review 结论必须失效

原因：

- 文本版本已经变了
- 旧问题报告不再可信

### 不变量 4：跨项目引用必须在 service 层拦住

原因：

- Repository 很难知道命令语义
- service 最清楚当前命令的 project / chapter 上下文

## 8. 后续扩展建议

如果后面要做 v3，建议继续沿用现在的切分方式：

- 新的结构化设定先进入设定层
- 新的创作动作先判断它属于 `plan / draft / review` 哪一层
- 新的正式世界状态必须挂到 `approve` 或“正式重建”链路

这样可以持续保证：

- 创作中间态和正式状态不混
- Markdown 回写有边界
- 命令扩展后仍然容易 review 和回归测试
