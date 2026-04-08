# hai-novel

一个基于 TypeScript、CLI 和 SQLite 的 AI 小说编写工具。

当前 V1 已支持：

- 项目初始化
- 总纲与分卷规划
- 人物、势力、关系、设定、钩子管理
- 本章 `plan` 生成
- 基于 `plan` 的 `draft` 生成
- `review check / fix / approve`
- `plan / draft / final` Markdown 导出
- 生成历史、prompt 查看、AI 状态检查
- 生成历史导出为 Markdown / JSON

## 环境要求

- Node.js `>= 20`
- npm

## 安装依赖

```bash
npm install
```

## 常用脚本

```bash
npm run dev -- --help
npm run build
npm run typecheck
npm run test
```

## 快速开始

### 1. 初始化工作区

```bash
npm run dev -- init
```

初始化后会生成：

- `novel.config.json`
- `data/novel.db`
- `exports/`

### 2. 创建项目

```bash
npm run dev -- project create \
  --name "测试小说" \
  --genre "仙侠" \
  --premise "少年卷入宗门纷争" \
  --style "热血克制"
```

### 3. 设定总纲与分卷

```bash
npm run dev -- outline set \
  --project 1 \
  --title "测试小说总纲" \
  --summary "主角卷入宗门暗战，并逐步揭开黑玉佩秘密。" \
  --goal "完成主线开篇铺陈"

npm run dev -- volume plan \
  --project 1 \
  --from-outline \
  --instruction "第一卷重点写主角入宗与立足"
```

查看：

```bash
npm run dev -- outline show --project 1
npm run dev -- volume list --project 1
```

### 4. 录入人物、势力与设定

```bash
npm run dev -- faction add --project 1 --name "青岚宗" --type "宗门"
npm run dev -- character add --project 1 --name "林渡" --role "protagonist" --profession "外门弟子"
npm run dev -- lore add --project 1 --type "profession_system" --title "外门晋升规则"
```

### 5. 建章节并生成 plan / draft

```bash
npm run dev -- chapter create \
  --project 1 \
  --title "第001章 雨夜入宗" \
  --summary "主角带着异物进入宗门"

npm run dev -- chapter plan \
  --project 1 \
  --chapter 1 \
  --intent "突出悬念感"

npm run dev -- plan show --chapter 1

npm run dev -- draft write \
  --project 1 \
  --chapter 1
```

### 6. 评审草稿并导出正式文稿

```bash
npm run dev -- draft review --draft 1 --action check
npm run dev -- draft review --draft 1 --action fix
npm run dev -- draft review --draft 1 --action approve
```

导出文件默认在 `exports/`：

- `exports/chapter-001-plan.md`
- `exports/chapter-001-draft.md`
- `exports/chapter-001-final.md`

## 常用命令

```bash
novel init
novel project create
novel project list
novel outline set
novel outline show
novel outline add
novel outline list
novel volume plan
novel volume list
novel faction add
novel faction list
novel character add
novel character list
novel relation character:add
novel relation character:list
novel relation faction:add
novel relation faction:list
novel lore add
novel lore list
novel hook add
novel hook list
novel hook show
novel hook bind
novel hook update
novel chapter create
novel chapter show
novel chapter plan
novel chapter export
novel plan show
novel draft write
novel draft review
novel draft drop
novel run history
novel run show
novel run export
novel prompt chapter-plan
novel prompt draft-write
novel prompt draft-fix
novel ai status
novel ai test
novel ai doctor
```

## AI Provider

默认使用 `mock` provider，适合本地开发和流程验证。

项目现在支持从项目根目录的 `.env` 自动加载环境变量，推荐先复制一份：

```bash
cp .env.example .env
```

然后手动指定当前使用的 provider：

```bash
# 可选：mock | openai | anthropic | custom
NOVEL_AI_PROVIDER=openai
NOVEL_AI_MODEL=gpt-4.1-mini
```

如需使用 OpenAI，需要在 `.env` 或运行环境里配置：

```bash
export OPENAI_API_KEY="your_key"
```

如需使用 Anthropic，需要配置：

```bash
export ANTHROPIC_API_KEY="your_key"
```

如需接入自定义模型网关，当前默认按“OpenAI Chat Completions 兼容协议”接入，至少配置：

```bash
export CUSTOM_AI_BASE_URL="https://your-custom-ai.example.com"
```

如果你的网关需要鉴权，再额外配置：

```bash
export CUSTOM_AI_API_KEY="your_key"
```

常见切换方式示例：

```bash
# OpenAI
NOVEL_AI_PROVIDER=openai
NOVEL_AI_MODEL=gpt-4.1-mini

# Anthropic
NOVEL_AI_PROVIDER=anthropic
NOVEL_AI_MODEL=claude-sonnet-4-20250514

# Custom
NOVEL_AI_PROVIDER=custom
NOVEL_AI_MODEL=your-model-name
CUSTOM_AI_BASE_URL=https://your-custom-ai.example.com
```

自定义 provider 还支持这些可选参数：

- `CUSTOM_AI_CHAT_PATH`：生成请求路径，默认 `/v1/chat/completions`
- `CUSTOM_AI_MODELS_PATH`：`ai doctor` 网络探测路径，默认 `/v1/models`
- `CUSTOM_AI_AUTH_HEADER`：认证头名称，默认 `Authorization`
- `CUSTOM_AI_AUTH_PREFIX`：认证头前缀，默认 `Bearer`
- `CUSTOM_AI_REQUIRE_API_KEY`：是否强制要求 `CUSTOM_AI_API_KEY`，默认 `false`

除了 Provider 相关配置外，下面这些参数也可以放进 `.env` 调优：

- 显示与日志截断长度：`NOVEL_DISPLAY_*`
- 上下文控长阈值：`NOVEL_CONTEXT_MAX_*`
- 相关性打分权重：`NOVEL_RELEVANCE_*`
- AI 温度与输出预算：`NOVEL_AI_*`
- `ai doctor` 联调输出上限：`NOVEL_AI_DOCTOR_*`

随后可用以下命令检查状态：

```bash
npm run dev -- ai status
npm run dev -- ai doctor
npm run dev -- ai doctor --section config
npm run dev -- ai doctor --section network
npm run dev -- ai doctor --section all --test-generate
npm run dev -- ai doctor --section all --test-generate --test-prompt "请只回复：联调通过"
npm run dev -- ai doctor --section all --test-generate --test-task chapter-plan --project 1 --chapter 1
npm run dev -- ai doctor --section all --test-generate --test-task draft-write --project 1 --chapter 1
npm run dev -- ai doctor --section all --test-generate --test-task draft-fix --draft 1 --notes "重点收紧节奏"
```

## 生成历史导出

查看历史：

```bash
npm run dev -- run history --project 1 --limit 10
npm run dev -- run show --id 3 --section all
```

导出历史：

```bash
npm run dev -- run export --id 3 --section all --format md
npm run dev -- run export --id 3 --section meta --format json --output exports/run-meta.json
```

默认导出目录：

- `exports/runs/run-003-all.md`
- `exports/runs/run-003-meta.json`

## 项目结构

```text
src/
  ai/
  app/
  cli/
  db/
  domain/
  utils/
docs/
  v1-plan.md
  v1-task-list.md
test/
  cli-flow.test.mjs
```

## 当前状态

当前已经可以跑通从项目创建到章节 `final` 导出的主流程。

仍在继续完善的方向：

- 更强的 review 语义检查
- 更完整的自动化测试
- 更多导出格式与历史回放能力
