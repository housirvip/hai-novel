# hai-novel 命令状态矩阵

这份文档专门回答一个问题：

`某条命令执行后，到底会不会写库、会改哪些状态、会不会写正式世界状态、会不会导出文件。`

它和 [command-guide.md](/Users/housirvip/codex/hai-novel/docs/command-guide.md) 的区别是：

- `command-guide.md` 更偏“怎么用”
- 本文更偏“执行后系统会发生什么”

## 1. 核心判定规则

先记住 5 条总规则：

1. 只有 `draft review --action approve` 和 `state approve-sync` 会写正式状态快照。
2. `chapter plan`、`draft write`、`draft review check/fix`、`plan import`、`draft import` 都不会写正式世界状态。
3. 章节创作状态只在章节主链路里推进：`created -> planning -> drafting -> reviewing -> done`。
4. `draft import` 会把导入后的草稿视为“新版本待审稿”，因此会重置为 `generated`，并清空旧 `review_notes / review_report`。
5. 只读命令可以导出文件，但不会因此修改主业务状态；导出类命令通常只更新“最近导出路径 / 时间”。

## 2. 状态对象速查

### 章节状态 `chapters.status`

- `created`
- `planning`
- `drafting`
- `reviewing`
- `done`

### Plan 状态 `chapter_plans.status`

- `active`
- `archived`

### Draft 状态 `chapter_drafts.status`

- `generated`
- `checked`
- `approved`
- `dropped`

### Hook 生命周期状态 `story_hooks.status`

- `pending`
- `active`
- `closed`

### Hook 章节推进状态 `hook_chapter_links.status`

- 命令允许自由传入业务值
- 常见搭配是 `planned / happened / skipped`

## 3. 初始化与项目层

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `init` | 初始化 `novel.config.json`、`data/novel.db`、migration 元数据、`exports/` 目录 | 无业务状态 | 无 | 不会创建项目、章节、设定 |
| `project create` | 新增 `projects` | 无章节状态变化 | 无 | 不会生成任何 plan / draft / snapshot |
| `project list` | 无 | 无 | 无 | 完全只读 |

## 4. 大纲层

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `outline set` | 新增或更新项目级 `outlines(node_type=story)` | 无章节状态变化 | 无 | 不会自动生成分卷或章节 |
| `outline show` | 无 | 无 | 无 | 完全只读 |
| `outline add` | 新增 `outlines` 节点 | 无章节状态变化 | 无 | 不会自动创建章节 |
| `outline list` | 无 | 无 | 无 | 完全只读 |
| `volume plan` | 新增 `outlines(node_type=volume)`；若 `--from-outline`，额外写入 `generation_runs(volume_plan)` | 无章节状态变化 | 无 | 不会写 `chapter_plans` |
| `volume list` | 无 | 无 | 无 | 完全只读 |

补充说明：

- `outline set / add / volume plan` 都只影响大纲树，不推动章节主链路状态。
- `volume plan --from-outline` 虽然带“plan”字样，但它写的是分卷节点，不是章节 `chapter_plans`。

## 5. 设定层

### 5.1 角色、势力、设定、物品

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `character add` | 新增 `characters` | 无章节状态变化 | 无 | 不会写人物正式状态快照 |
| `character list` | 无 | 无 | 无 | 完全只读 |
| `faction add` | 新增 `factions` | 无章节状态变化 | 无 | 不会写势力正式状态快照 |
| `faction list` | 无 | 无 | 无 | 完全只读 |
| `lore add` | 新增 `lore_entries` | 无章节状态变化 | 无 | 不会改章节上下文状态 |
| `lore list` | 无 | 无 | 无 | 完全只读 |
| `item add` | 新增 `items` | 无章节状态变化 | 无 | 不会写物品正式状态快照 |
| `item list` | 无 | 无 | 无 | 完全只读 |
| `item show` | 无 | 无 | 无 | 完全只读 |

### 5.2 关系与持有关系

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `relation character:add` | 新增 `character_relations` | 无章节状态变化 | 无 | 不会改人物正式状态快照 |
| `relation character:list` | 无 | 无 | 无 | 完全只读 |
| `relation faction:add` | 新增 `character_faction_relations` | 无章节状态变化 | 无 | 不会改势力正式状态快照 |
| `relation faction:list` | 无 | 无 | 无 | 完全只读 |
| `character item:add` | 新增 `character_items` | 无章节状态变化 | 无 | 不会直接写正式物品状态 |
| `character item:list` | 无 | 无 | 无 | 完全只读 |
| `character item:remove` | 更新 `character_items.end_chapter_id / note`，结束持有关系 | 无章节状态变化 | 无 | 不会删除历史持有记录 |

补充说明：

- 这些命令会影响后续章节上下文，但不会直接推进章节主链路状态。
- 物品“正式状态”当前仍由 `approve` 后的状态提取结果写进 `chapter_state_snapshots.raw_payload`。

## 6. 钩子层

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `hook add` | 新增 `story_hooks` | `story_hooks.status` 初始为仓储默认值 | 无 | 不会改章节创作状态 |
| `hook list` | 无 | 无 | 无 | 完全只读 |
| `hook show` | 无 | 无 | 无 | 完全只读 |
| `hook bind` | 新增 `hook_chapter_links`；并按 `link_type` 可能自动更新 `story_hooks.status / start_chapter_id / end_chapter_id` | 可能触发钩子生命周期自动推进 | 无 | 不会改 `chapters.status` |
| `hook update` | 更新 `story_hooks.status / start_chapter_id / target_chapter_id / end_chapter_id` | 只改钩子状态 | 无 | 不会改章节创作状态 |

`hook bind` 的自动推进规则：

- `setup`：若钩子原来是 `pending`，自动变为 `active`，并补 `start_chapter_id`
- `advance / reveal`：若钩子原来是 `pending`，自动变为 `active`
- `close`：自动变为 `closed`，并写入 `end_chapter_id`

## 7. 章节创作主链路

### 7.1 章节与 plan

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `chapter create` | 新增 `chapters` | `chapters.status -> created` | 无 | 不会自动生成 plan |
| `chapter show` | 无 | 无 | 无 | 完全只读 |
| `chapter plan` | 新增新的 `chapter_plans(active)`；旧 active 归档为 `archived`；写 `generation_runs(chapter_plan)`；更新 plan 导出信息 | `chapters.status -> planning` | 自动导出 `chapter-xxx-plan.md` | 不会写正式状态快照 |
| `plan show` | 无 | 无 | 无 | 完全只读 |
| `plan import` | 更新 `chapter_plans.plan_text / author_intent / source_version / last_imported_at / updated_from=manual_import` | 无章节状态变化 | 无 | 不会写正式状态快照 |
| `chapter export --source plan` | 更新 `chapter_plans.last_export_path / last_exported_at` | 无 | 导出 `chapter-xxx-plan.md` | 不会改 plan 正文 |

### 7.2 draft、review、approve

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `draft write` | 新增 `chapter_drafts(status=generated)`；写 `generation_runs(draft_write)`；更新 draft 导出信息 | `chapters.status -> drafting` | 自动导出 `chapter-xxx-draft.md` | 不会写正式状态快照 |
| `draft review --action check` | 更新 `chapter_drafts.status -> checked`；写 `review_notes / review_report`；写 `generation_runs(draft_review_check)` | `chapters.status -> reviewing` | 无 | 不会写 `final_text` |
| `draft review --action fix` | 更新当前 draft：`draft_text`、`source_version +1`、`updated_from=ai_fix`、`status -> generated`；写 `generation_runs(draft_review_fix)`；更新 draft 导出信息 | `chapters.status -> reviewing` | 自动重导 `chapter-xxx-draft.md` | 不会写正式状态快照 |
| `draft import` | 更新当前 draft：`draft_text`、`status -> generated`、`source_version +1`、`last_imported_at`、`updated_from=manual_import`；清空 `review_notes / review_report` | 章节状态按最新草稿重新推导，通常回到 `drafting` | 无 | 不会写正式状态快照 |
| `chapter export --source draft` | 更新 `chapter_drafts.last_export_path / last_exported_at` | 无 | 导出 `chapter-xxx-draft.md` | 不会改 draft 正文 |
| `draft drop` | 更新 `chapter_drafts.status -> dropped` | 章节状态按剩余数据重新推导：`done / reviewing / drafting / planning / created` | 无 | 不会删稿，不会写正式状态快照 |
| `draft review --action approve` | 更新 `chapter_drafts.status -> approved`；更新 `chapters.final_text / approved_draft_id / status=done`；写 `chapter_state_snapshots`、`character_state_snapshots`、`faction_state_snapshots`、`hook_state_snapshots`；写 `generation_runs(state_extract / draft_review_approve)` | `chapters.status -> done` | 自动导出 `chapter-xxx-final.md` | 这是唯一默认正式落库点 |
| `chapter export --source final` | 无数据库主状态变化 | 无 | 导出 `chapter-xxx-final.md` | 不会重建正式状态 |

补充说明：

- `draft review --action fix` 虽然会把草稿状态写回 `generated`，但章节仍保持 `reviewing`，因为它在语义上仍处于 review 链路里。
- `draft import` 和 `fix` 不同：`fix` 是系统修稿，沿着 review 链路继续；`import` 是作者手工改稿，旧 review 结论失效，所以要重置为待重新审核的新版本。
- `approved` 的 draft 会被冻结，不能再 `review / drop / import`。

## 8. 正式状态与预览链路

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `state chapter-preview` | 无数据库写入 | 无 | 无 | 只预览“如果现在抽取状态，会得到什么” |
| `state approve-sync` | 删除并重建当前章节的正式状态快照 | 不改变 `chapters.status`，不改变 draft 状态 | 无 | 不会改 `final_text` |
| `state show` | 无 | 无 | 无 | 完全只读 |

补充说明：

- `state chapter-preview` 支持用最新 draft 或指定 draft 做抽取预览，但不会落正式库。
- `state approve-sync` 是“以当前 final 重新同步正式状态”的补救命令，不是主创作流程节点。

## 9. Prompt、Context、Run、AI 诊断

| 命令 | 主要写入 | 状态变化 | 导出文件 | 不会发生的事 |
| --- | --- | --- | --- | --- |
| `context chapter` | 无 | 无 | 无 | 只输出统一章节上下文 |
| `prompt chapter-plan` | 默认无；若 `--save`，只写 prompt Markdown 文件 | 无 | 可导出 prompt Markdown | 不会写 `generation_runs` |
| `prompt draft-write` | 默认无；若 `--save`，只写 prompt Markdown 文件 | 无 | 可导出 prompt Markdown | 不会生成 draft |
| `prompt draft-fix` | 默认无；若 `--save`，只写 prompt Markdown 文件 | 无 | 可导出 prompt Markdown | 不会真正修稿 |
| `run history` | 无 | 无 | 无 | 完全只读 |
| `run show` | 无 | 无 | 无 | 完全只读 |
| `run export` | 只写导出文件 | 无 | 导出 run 的 `md/json` | 不会修改 run 记录本身 |
| `ai status` | 无 | 无 | 无 | 只读配置 |
| `ai test` | 无数据库写入 | 无 | 无 | 只执行 provider 联调 |
| `ai doctor` | 无数据库写入 | 无 | 无 | 只执行诊断，不会改业务数据 |

## 10. 只读、写库、正式落库三类命令总览

### 10.1 完全只读

- `project list`
- `outline show`
- `outline list`
- `volume list`
- `character list`
- `faction list`
- `relation character:list`
- `relation faction:list`
- `lore list`
- `item list`
- `item show`
- `hook list`
- `hook show`
- `chapter show`
- `plan show`
- `state show`
- `state chapter-preview`
- `context chapter`
- `run history`
- `run show`
- `ai status`

### 10.2 会写库，但不会写正式状态

- `init`
- `project create`
- `outline set`
- `outline add`
- `volume plan`
- `character add`
- `faction add`
- `relation character:add`
- `relation faction:add`
- `lore add`
- `item add`
- `character item:add`
- `character item:remove`
- `hook add`
- `hook bind`
- `hook update`
- `chapter create`
- `chapter plan`
- `plan import`
- `draft write`
- `draft review --action check`
- `draft review --action fix`
- `draft import`
- `draft drop`

### 10.3 会写正式状态快照

- `draft review --action approve`
- `state approve-sync`

## 11. 设计结论

如果后面继续扩功能，建议优先保持下面这条边界不变：

- 设定命令负责沉淀“结构化事实”
- `plan / draft / review` 负责处理“创作中间态”
- 只有 `approve` 才负责“正式状态生效”

这样有 3 个好处：

- 作者可以放心地反复改 `plan`、改 `draft`，不会误污染正式世界状态
- 正式状态始终有明确来源章节，便于回看和补同步
- 后面扩人物状态、物品状态、长线钩子状态时，仍然能保持数据边界清晰
