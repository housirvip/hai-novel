# hai-novel CLI 命令使用指南

这份文档按“从初始化到写完一章”的实际使用顺序，整理了当前项目里的所有 CLI 命令。

如果你想看“某条命令执行后到底会改哪些状态、写哪些表”，可以配合阅读：

- [command-state-matrix.md](/Users/housirvip/codex/hai-novel/docs/command-state-matrix.md)

约定：

- 开发态命令统一写成 `npm run dev -- ...`
- 如果你已经构建并把 CLI 链接为全局命令，也可以把前缀替换成 `novel ...`
- 所有 ID 都是数据库自增数字 ID

## 1. 基础准备

### 初始化工作区

```bash
npm run dev -- init
```

作用：

- 生成 `novel.config.json`
- 初始化 `data/novel.db`
- 创建 `exports/` 导出目录

建议：

- 每个小说项目使用一个独立工作区目录
- 先执行 `init`，再执行其他命令

## 2. 项目管理

### 创建项目

```bash
npm run dev -- project create \
  --name "测试小说" \
  --genre "仙侠" \
  --premise "少年卷入宗门纷争" \
  --style "热血克制" \
  --target-word-count 120000
```

常用参数：

- `--name`：必填，项目名
- `--genre`：题材
- `--premise`：故事前提
- `--style`：文风
- `--target-word-count`：目标总字数

### 查看项目列表

```bash
npm run dev -- project list
```

适用场景：

- 查看当前工作区已有项目
- 确认项目 ID

## 3. 总纲与分卷

### 设置总纲

```bash
npm run dev -- outline set \
  --project 1 \
  --title "测试小说总纲" \
  --summary "主角卷入宗门暗战，并逐步揭开黑玉佩秘密。" \
  --goal "完成主线开篇铺陈" \
  --conflict "宗门内外势力互相试探" \
  --outcome "主角正式卷入更大的暗线"
```

说明：

- `outline set` 用来设置项目级总纲
- 同一项目的故事级总纲会更新而不是重复新增

### 查看总纲与分卷

```bash
npm run dev -- outline show --project 1
```

### 手动增加大纲节点

```bash
npm run dev -- outline add \
  --project 1 \
  --type volume \
  --title "第一卷 入宗风雨" \
  --summary "主角进入青岚宗并初步立足" \
  --goal "完成入宗、试探与埋钩子" \
  --position 1
```

常用参数：

- `--type`：节点类型，例如 `story`、`volume`、`arc`
- `--parent`：父节点 ID
- `--position`：同级排序

### 列出全部大纲节点

```bash
npm run dev -- outline list --project 1
```

### 规划分卷

手动创建：

```bash
npm run dev -- volume plan \
  --project 1 \
  --title "第一卷 入宗风雨" \
  --summary "主角入宗并站稳脚跟" \
  --goal "完成世界与冲突开场" \
  --position 1
```

基于总纲自动生成：

```bash
npm run dev -- volume plan \
  --project 1 \
  --from-outline \
  --instruction "第一卷重点写主角入宗与立足"
```

### 查看分卷列表

```bash
npm run dev -- volume list --project 1
```

## 4. 设定管理

这一组命令用于沉淀世界基础事实，供后续 `plan / draft / state extract` 使用。

### 势力

新增势力：

```bash
npm run dev -- faction add \
  --project 1 \
  --name "青岚宗" \
  --type "宗门" \
  --leader "掌门沈玄舟" \
  --goal "稳定山门与扩张势力" \
  --stance "正道"
```

查看势力列表：

```bash
npm run dev -- faction list --project 1
```

### 角色

新增角色：

```bash
npm run dev -- character add \
  --project 1 \
  --name "林渡" \
  --role "protagonist" \
  --faction 1 \
  --profession "外门弟子" \
  --profession-detail "刚入宗，尚未站稳脚跟" \
  --goal "活下去并查清玉佩来历" \
  --conflict "被多方势力试探"
```

查看角色列表：

```bash
npm run dev -- character list --project 1
```

### 人物关系

人物与人物关系：

```bash
npm run dev -- relation character:add \
  --project 1 \
  --from 1 \
  --to 2 \
  --type "mentor" \
  --summary "表面提携，实则观察"
```

```bash
npm run dev -- relation character:list --project 1
npm run dev -- relation character:list --project 1 --character 1
```

人物与势力关系：

```bash
npm run dev -- relation faction:add \
  --project 1 \
  --character 1 \
  --faction 1 \
  --type "member" \
  --title "外门弟子" \
  --stance "loyal" \
  --primary
```

```bash
npm run dev -- relation faction:list --project 1
npm run dev -- relation faction:list --project 1 --character 1
```

### 设定条目

```bash
npm run dev -- lore add \
  --project 1 \
  --type "profession_system" \
  --title "外门晋升规则" \
  --summary "外门弟子需要通过月试和师承考核晋升" \
  --details "月试成绩、贡献点与师门态度共同决定晋升资格" \
  --tags "宗门,晋升,外门"
```

```bash
npm run dev -- lore list --project 1
npm run dev -- lore list --project 1 --type profession_system
```

### 物品

新增物品：

```bash
npm run dev -- item add \
  --project 1 \
  --name "黑玉佩" \
  --category artifact \
  --rarity rare \
  --description "随身携带的神秘玉佩" \
  --origin "来历不明" \
  --status sealed
```

查看物品：

```bash
npm run dev -- item list --project 1
npm run dev -- item show --item 1
```

### 人物持有物关系

给人物绑定物品：

```bash
npm run dev -- character item:add \
  --project 1 \
  --character 1 \
  --item 1 \
  --type carry \
  --quantity 1 \
  --equipped \
  --note "贴身携带" \
  --start-chapter 1
```

查看持有关系：

```bash
npm run dev -- character item:list --project 1
npm run dev -- character item:list --project 1 --character 1 --active-only
```

结束一条持有关系：

```bash
npm run dev -- character item:remove --link 1
npm run dev -- character item:remove --link 1 --end-chapter 2 --note "暂交长老保管"
```

### 钩子

新增钩子：

```bash
npm run dev -- hook add \
  --project 1 \
  --title "黑玉佩的来历" \
  --type mystery \
  --summary "玉佩来源成谜" \
  --setup "第一卷先埋异动" \
  --payoff "第三卷揭示来源" \
  --priority 10 \
  --target-chapter 12
```

查看钩子：

```bash
npm run dev -- hook list --project 1
npm run dev -- hook list --project 1 --status active
npm run dev -- hook show --hook 1
```

绑定钩子到章节：

```bash
npm run dev -- hook bind \
  --project 1 \
  --hook 1 \
  --chapter 1 \
  --type setup \
  --planned-note "本章通过玉佩发热埋下异常" \
  --status planned
```

说明：

- `hook bind` 会新建一条 `hook_chapter_links`
- 某些 `link_type` 会自动推动 `story_hooks.status`

更新钩子生命周期：

```bash
npm run dev -- hook update --hook 1 --status active --start-chapter 1
npm run dev -- hook update --hook 1 --target-chapter 12
npm run dev -- hook update --hook 1 --status closed --end-chapter 20
```

## 5. 章节创作主链路

### 新建章节

```bash
npm run dev -- chapter create \
  --project 1 \
  --title "第001章 雨夜入宗" \
  --outline 5 \
  --summary "主角带着异物进入宗门"
```

章节状态初始为：

- `created`

### 生成章节 plan

```bash
npm run dev -- chapter plan \
  --project 1 \
  --chapter 1 \
  --intent "突出黑玉佩异常与宗门压迫感"
```

执行后会发生：

- 生成新的 `chapter_plans`
- 旧 active plan 归档为 `archived`
- 章节状态推进为 `planning`
- 自动导出 `exports/chapter-001-plan.md`

### 查看当前 plan

```bash
npm run dev -- plan show --chapter 1
```

### 手工修改 plan 后回写

```bash
npm run dev -- plan import --chapter 1 --input exports/chapter-001-plan.md
npm run dev -- plan import --chapter 1 --input exports/chapter-001-plan.md --force
```

说明：

- 正常情况下会校验 `source_version`
- `--force` 会忽略版本冲突，适合你明确知道风险时使用

### 生成 draft

```bash
npm run dev -- draft write --project 1 --chapter 1
npm run dev -- draft write --project 1 --chapter 1 --plan 3
npm run dev -- draft write --project 1 --chapter 1 --instruction "加强压迫感和对白冲突"
```

执行后会发生：

- 生成新的 `chapter_drafts`
- 章节状态推进为 `drafting`
- 自动导出 `exports/chapter-001-draft.md`

### review 草稿

检查问题：

```bash
npm run dev -- draft review --draft 1 --action check
```

修订草稿：

```bash
npm run dev -- draft review --draft 1 --action fix
npm run dev -- draft review --draft 1 --action fix --notes "强化结尾钩子"
```

正式批准：

```bash
npm run dev -- draft review --draft 1 --action approve
```

三种动作差异：

- `check`：只做问题报告，不改正文
- `fix`：改写当前 draft，但不更新正式状态
- `approve`：把当前 draft 变成 `final`，并写入正式状态快照

状态变化：

- `check`：章节进入 `reviewing`
- `fix`：章节保持 `reviewing`
- `approve`：章节进入 `done`

重要约束：

- 已 `approved` 的 draft 会被冻结，不能再 `review / import / drop`

### 丢弃 draft

```bash
npm run dev -- draft drop --draft 3
```

说明：

- 被 `drop` 的 draft 不再参与默认导出
- 被 `drop` 的 draft 不再参与 `state chapter-preview`
- 如果它是最后一份可用 draft，章节状态会按剩余数据回退

### 手工修改 draft 后回写

```bash
npm run dev -- draft import --draft 1 --input exports/chapter-001-draft.md
npm run dev -- draft import --draft 1 --input exports/chapter-001-draft.md --force
```

说明：

- 只允许导入仍处于工作流中的 draft
- 已 `approved` 或 `dropped` 的 draft 禁止导入
- 导入后该 draft 会重置为 `generated`
- 旧的 `review_report / review_notes` 会被清空，需要重新执行 `check / fix / approve`
- 章节状态会按最新草稿重新推导，通常会回到 `drafting`

### 导出章节内容

导出 plan：

```bash
npm run dev -- chapter export --chapter 1 --source plan
```

导出 draft：

```bash
npm run dev -- chapter export --chapter 1 --source draft
npm run dev -- chapter export --chapter 1 --source draft --draft 3
```

导出 final：

```bash
npm run dev -- chapter export --chapter 1 --source final
```

说明：

- `plan / draft / final` 都会导出 Markdown
- `draft` 默认导出“最新且未 dropped”的草稿
- 需要精确导出某一版 draft 时，可额外传 `--draft <id>`
- `final` 只有在执行过 `approve` 后才存在

### 查看章节详情

```bash
npm run dev -- chapter show --id 1
```

可查看：

- 章节状态
- 对应大纲
- `approved_draft_id`
- 已绑定钩子
- 若已有正式文稿，还会直接显示 `final_text`

## 6. 上下文与 Prompt 调试

### 查看统一章节上下文

```bash
npm run dev -- context chapter --project 1 --chapter 1
npm run dev -- context chapter --project 1 --chapter 1 --format text
```

适合：

- 排查 plan / draft 写作时到底拿到了哪些上下文
- 检查人物、势力、物品、钩子是否真正进入了 AI 输入

### 查看章节 plan Prompt

```bash
npm run dev -- prompt chapter-plan --project 1 --chapter 1
npm run dev -- prompt chapter-plan --project 1 --chapter 1 --intent "强调门规压迫"
npm run dev -- prompt chapter-plan --project 1 --chapter 1 --save
```

### 查看 draft write Prompt

```bash
npm run dev -- prompt draft-write --project 1 --chapter 1
npm run dev -- prompt draft-write --project 1 --chapter 1 --plan 3 --instruction "加强冲突"
npm run dev -- prompt draft-write --project 1 --chapter 1 --save exports/prompts/draft-write.md
```

### 查看 draft fix Prompt

```bash
npm run dev -- prompt draft-fix --draft 1
npm run dev -- prompt draft-fix --draft 1 --notes "重点收紧节奏"
npm run dev -- prompt draft-fix --draft 1 --save
```

用途：

- 调试模板版本
- 查看 `systemPrompt / prompt / contextText`
- 把 prompt bundle 保存到文件审阅

## 7. 正式状态与快照

### 预览本章状态提取结果

```bash
npm run dev -- state chapter-preview --chapter 1
npm run dev -- state chapter-preview --chapter 1 --draft 2
```

说明：

- 只做预览，不会写数据库
- 默认优先取最新未 dropped 的 draft
- 没有 draft 时会退回 final 预览

### 对已批准章节补同步状态

```bash
npm run dev -- state approve-sync --chapter 1
```

用途：

- 重新基于 `final_text` 抽取状态
- 删除并重建该章节已有正式快照

### 查看正式状态

查看项目级正式状态：

```bash
npm run dev -- state show --project 1
```

查看单章正式状态：

```bash
npm run dev -- state show --project 1 --chapter 1
```

可以看到：

- `chapter_state_snapshots`
- 人物最新状态
- 势力最新状态
- 钩子最新状态
- 物品轻量状态

## 8. 生成历史

### 查看生成历史列表

```bash
npm run dev -- run history --project 1 --limit 10
npm run dev -- run history --chapter 1 --type draft_write
```

常见 `run_type`：

- `chapter_plan`
- `draft_write`
- `draft_review_check`
- `draft_review_fix`
- `draft_review_approve`
- `state_extract`

### 查看单次生成详情

```bash
npm run dev -- run show --id 8 --section all
npm run dev -- run show --id 8 --section meta
npm run dev -- run show --id 8 --section prompt
npm run dev -- run show --id 8 --section input
npm run dev -- run show --id 8 --section output
```

### 导出生成历史

```bash
npm run dev -- run export --id 8 --section all --format md
npm run dev -- run export --id 8 --section meta --format json --output exports/run-8.json
```

适合：

- 审阅某次生成到底用了什么输入
- 导出归档
- 做 prompt 调优回放

## 9. AI Provider 调试

### 查看当前 AI 配置

```bash
npm run dev -- ai status
```

### 直接发起一条最小生成请求

```bash
npm run dev -- ai test --prompt "请用一句话介绍这部小说"
npm run dev -- ai test --prompt "给我一个悬念开头" --context "题材：仙侠"
```

### AI 联调诊断

```bash
npm run dev -- ai doctor
npm run dev -- ai doctor --section config
npm run dev -- ai doctor --section all --test-generate
```

基于实际业务任务做自检：

```bash
npm run dev -- ai doctor --section all --test-generate --test-task chapter-plan --project 1 --chapter 1
npm run dev -- ai doctor --section all --test-generate --test-task draft-write --project 1 --chapter 1
npm run dev -- ai doctor --section all --test-generate --test-task draft-fix --draft 1 --notes "重点收紧节奏"
```

适合：

- 检查 `.env` 是否配置完整
- 验证 OpenAI / Anthropic / Custom provider 是否可连通
- 在真实任务上下文下做一次小规模联调

## 10. 常用工作流

### 最小创作闭环

```bash
npm run dev -- init
npm run dev -- project create --name "测试小说" --genre "仙侠"
npm run dev -- chapter create --project 1 --title "第001章 雨夜入宗" --summary "主角带着异物进入宗门"
npm run dev -- chapter plan --project 1 --chapter 1 --intent "突出悬念感"
npm run dev -- draft write --project 1 --chapter 1
npm run dev -- draft review --draft 1 --action check
npm run dev -- draft review --draft 1 --action fix --notes "强化结尾钩子"
npm run dev -- draft review --draft 1 --action approve
```

### 推荐的世界设定顺序

1. `project create`
2. `outline set`
3. `volume plan`
4. `faction add`
5. `character add`
6. `relation ...`
7. `lore add`
8. `item add`
9. `hook add`
10. `chapter create`

### 推荐的章节工作顺序

1. `chapter create`
2. `chapter plan`
3. 手工检查或 `plan import`
4. `draft write`
5. `draft review --action check`
6. `draft review --action fix`
7. 手工修改或 `draft import`
8. `draft review --action approve`
9. `state show --project ... --chapter ...`

## 11. 状态速查

### 章节状态

- `created`
- `planning`
- `drafting`
- `reviewing`
- `done`

### Plan 状态

- `active`
- `archived`

### Draft 状态

- `generated`
- `checked`
- `approved`
- `dropped`

### Hook 章节内执行状态

- `planned`
- `done`
- `skipped`

## 12. 常见注意事项

- `approve` 是正式落库点。只有执行 `draft review --action approve`，才会更新 `final_text` 和正式状态快照。
- `check / fix / import plan / import draft` 都属于中间态操作，不会更新正式世界状态。
- 已 `approved` 的 draft 会被冻结，不能再 `review / import / drop`。
- 被 `dropped` 的 draft 不再参与默认 draft 导出与默认状态预览。
- `state chapter-preview` 只做预览，不会写正式快照。
- `state approve-sync` 会重建正式快照，但不会改变章节工作流状态。
- 如果 AI 返回非 JSON 或坏 JSON，CLI 现在会尽量给出更明确的错误语义。

## 13. 命令总表

当前 CLI 命令总览如下：

```text
init
project create
project list
outline set
outline show
outline add
outline list
volume plan
volume list
faction add
faction list
character add
character list
character item:add
character item:list
character item:remove
relation character:add
relation character:list
relation faction:add
relation faction:list
lore add
lore list
item add
item list
item show
hook add
hook list
hook show
hook bind
hook update
chapter create
chapter plan
chapter show
chapter export
plan show
plan import
draft write
draft review
draft drop
draft import
context chapter
prompt chapter-plan
prompt draft-write
prompt draft-fix
state chapter-preview
state approve-sync
state show
run history
run show
run export
ai status
ai test
ai doctor
```
