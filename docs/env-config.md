# hai-novel 环境变量配置说明

这份文档说明项目当前支持的环境变量、默认值、优先级以及推荐用法。

## 1. 加载方式

项目启动时会自动加载工作区根目录下的 `.env` 文件。

实现位置：

- `src/config/runtime-env.ts`

特点：

- 使用 `dotenv` 自动加载
- 幂等加载，多次调用不会重复污染运行时
- 不会在 CLI 输出中打印额外 dotenv 提示

推荐做法：

1. 复制模板文件
2. 按需修改 provider 和调优参数

```bash
cp .env.example .env
```

## 2. 优先级规则

### AI Provider 相关

AI provider 类变量一般遵循下面的优先级：

1. 环境变量
2. `novel.config.json`
3. 代码内默认值

例如：

- `NOVEL_AI_PROVIDER` 会覆盖 `novel.config.json` 里的 `ai.provider`
- `NOVEL_AI_MODEL` 会覆盖 `novel.config.json` 里的 `ai.model`
- `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` / `CUSTOM_AI_BASE_URL` 会覆盖 `novel.config.json` 里的 `ai.baseUrl`

### 运行期调优参数

下面这几类参数只从环境变量读取：

- `NOVEL_DISPLAY_*`
- `NOVEL_CONTEXT_*`
- `NOVEL_RELEVANCE_*`
- `NOVEL_AI_*`
- `NOVEL_DRAFT_FIX_*`

如果未配置，或者配置值非法，会回退到代码默认值。

## 3. 默认配置来源

如果工作区还没有 `novel.config.json`，系统默认配置为：

```json
{
  "dbPath": "data/novel.db",
  "exportsDir": "exports",
  "ai": {
    "provider": "mock",
    "model": "gpt-4.1-mini"
  }
}
```

实现位置：

- `src/utils/paths.ts`

## 4. AI Provider 基础变量

### 通用变量

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_AI_PROVIDER` | `mock` | 当前启用的 provider，支持 `mock`、`openai`、`anthropic`、`custom` |
| `NOVEL_AI_MODEL` | `gpt-4.1-mini` | 当前默认模型名 |

推荐：

- 本地开发先用 `mock`
- 联调真实模型时再切 `openai / anthropic / custom`

### OpenAI

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 无 | OpenAI API Key，必填 |
| `OPENAI_BASE_URL` | `https://api.openai.com` | OpenAI 基础地址，可用于代理或兼容网关 |

说明：

- 当 provider 为 `openai` 时，未配置 `OPENAI_API_KEY` 会报错

### Anthropic

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 无 | Anthropic API Key，必填 |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Anthropic 基础地址 |

说明：

- 当 provider 为 `anthropic` 时，未配置 `ANTHROPIC_API_KEY` 会报错

### Custom

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `CUSTOM_AI_API_KEY` | 空 | 自定义网关使用的 API Key |
| `CUSTOM_AI_BASE_URL` | 无 | 自定义网关基础地址 |
| `CUSTOM_AI_CHAT_PATH` | `/v1/chat/completions` | 文本生成请求路径 |
| `CUSTOM_AI_MODELS_PATH` | `/v1/models` | `ai doctor` 联网探测路径 |
| `CUSTOM_AI_AUTH_HEADER` | `Authorization` | 鉴权请求头名称 |
| `CUSTOM_AI_AUTH_PREFIX` | `Bearer` | 鉴权请求头前缀 |
| `CUSTOM_AI_REQUIRE_API_KEY` | `false` | 是否强制要求必须提供 `CUSTOM_AI_API_KEY` |

说明：

- `custom` 默认按 OpenAI Chat Completions 兼容协议接入
- 如果网关不需要鉴权，可以把 `CUSTOM_AI_REQUIRE_API_KEY=false`
- 如果网关需要特殊头名或前缀，可以通过 `CUSTOM_AI_AUTH_HEADER / CUSTOM_AI_AUTH_PREFIX` 调整

## 5. 显示与日志截断参数

这些参数主要影响 CLI 输出长度，不改变业务逻辑。

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_DISPLAY_RUN_TEXT_PREVIEW_LENGTH` | `120` | `run history` 等命令里运行结果摘要的截断长度 |
| `NOVEL_DISPLAY_NETWORK_ERROR_PREVIEW_LENGTH` | `200` | `ai doctor` 网络错误响应体的截断长度 |
| `NOVEL_DISPLAY_GENERATION_PREVIEW_LENGTH` | `120` | `ai doctor` 生成成功后回显文本的截断长度 |
| `NOVEL_DISPLAY_MOCK_MENTION_SUMMARY_LENGTH` | `120` | mock 状态提取时命中句子的截断长度 |

建议：

- 平时保持默认值即可
- 排查 provider 返回异常时，可临时调大 `NOVEL_DISPLAY_NETWORK_ERROR_PREVIEW_LENGTH`

## 6. 上下文控长参数

这些参数决定 `ChapterContextBuilder` 在 prompt 中最多保留多少条信息。

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_CONTEXT_MAX_CHARACTER_ITEMS` | `8` | 最多保留多少个人物条目 |
| `NOVEL_CONTEXT_MAX_FACTION_ITEMS` | `6` | 最多保留多少个势力条目 |
| `NOVEL_CONTEXT_MAX_LORE_ITEMS` | `8` | 最多保留多少条设定 |
| `NOVEL_CONTEXT_MAX_RELATION_ITEMS` | `8` | 最多保留多少条人物关系 |
| `NOVEL_CONTEXT_MAX_CHARACTER_FACTION_ITEMS` | `8` | 最多保留多少条人物-势力关系 |
| `NOVEL_CONTEXT_MAX_ITEM_ITEMS` | `6` | 最多保留多少条关键物品上下文 |
| `NOVEL_CONTEXT_SQL_QUERY_LIMIT` | `64` | 上下文构建时，单次 SQL 查询的候选池上限 |
| `NOVEL_CONTEXT_MAX_CHAPTER_SNAPSHOT_ITEMS` | `5` | 最多保留多少条最近章节正式状态摘要 |
| `NOVEL_CONTEXT_MAX_HOOK_ITEMS` | `8` | 最多保留多少条钩子 |
| `NOVEL_CONTEXT_MAX_STATE_ITEMS` | `8` | 最多保留多少条人物 / 势力 / 钩子正式状态快照 |
| `NOVEL_CONTEXT_TEXT_FIELD_MAX_LENGTH` | `512` | 普通文本字段在 prompt 中的截断长度 |
| `NOVEL_CONTEXT_LONG_TEXT_FIELD_MAX_LENGTH` | `512` | 较长文本字段在 prompt 中的截断长度 |
| `NOVEL_CONTEXT_SNAPSHOT_RAW_PAYLOAD_PREVIEW_LENGTH` | `512` | 最近章节快照原始 JSON 预览的截断长度 |

什么时候需要改：

- 项目角色特别多、钩子特别多时，可适当增大
- 如果 prompt 太长、成本太高，可适当缩小
- 如果数据库很大、上下文构建变慢，可先尝试缩小 `NOVEL_CONTEXT_SQL_QUERY_LIMIT`

## 7. 相关性打分参数

这些参数决定上下文筛选和排序时的权重。

### 人物权重

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_RELEVANCE_CHARACTER_PROTAGONIST_BONUS` | `120` | 主角加分 |
| `NOVEL_RELEVANCE_CHARACTER_ANTAGONIST_BONUS` | `50` | 反派加分 |
| `NOVEL_RELEVANCE_CHARACTER_NAME_MATCH_BONUS` | `100` | 人名命中加分 |
| `NOVEL_RELEVANCE_CHARACTER_GOAL_MATCH_BONUS` | `40` | 目标命中加分 |
| `NOVEL_RELEVANCE_CHARACTER_CONFLICT_MATCH_BONUS` | `35` | 冲突命中加分 |
| `NOVEL_RELEVANCE_CHARACTER_FACTION_MATCH_BONUS` | `45` | 所属势力命中加分 |
| `NOVEL_RELEVANCE_CHARACTER_LATEST_STATE_BONUS` | `20` | 最近正式状态加分 |

### 势力权重

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_RELEVANCE_FACTION_NAME_MATCH_BONUS` | `110` | 势力名命中加分 |
| `NOVEL_RELEVANCE_FACTION_GOAL_MATCH_BONUS` | `35` | 势力目标命中加分 |
| `NOVEL_RELEVANCE_FACTION_STANCE_MATCH_BONUS` | `15` | 势力立场命中加分 |
| `NOVEL_RELEVANCE_FACTION_CHARACTER_MATCH_BONUS` | `60` | 相关人物命中带来的加分 |
| `NOVEL_RELEVANCE_FACTION_LATEST_STATE_BONUS` | `20` | 最近正式状态加分 |

### 钩子权重

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_RELEVANCE_HOOK_DIRECT_LINK_BONUS` | `140` | 已绑定到本章的钩子加分 |
| `NOVEL_RELEVANCE_HOOK_TARGET_CHAPTER_BONUS` | `120` | 目标回收章命中加分 |
| `NOVEL_RELEVANCE_HOOK_TITLE_MATCH_BONUS` | `80` | 钩子标题命中加分 |
| `NOVEL_RELEVANCE_HOOK_SUMMARY_MATCH_BONUS` | `35` | 钩子摘要命中加分 |
| `NOVEL_RELEVANCE_HOOK_LATEST_ADVANCED_BONUS` | `25` | 最近推进状态加分 |

### 快照排序权重

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_RELEVANCE_SNAPSHOT_BASE_SCORE` | `10000` | 状态快照排序基础分 |
| `NOVEL_RELEVANCE_HOOK_STATE_RESOLVED_BONUS` | `10` | 已 resolved 钩子的补充分 |
| `NOVEL_RELEVANCE_HOOK_STATE_ADVANCED_BONUS` | `20` | 已 advanced 钩子的补充分 |

建议：

- 正常使用不建议频繁修改
- 只有在你明确感觉“上下文总是选错对象”时，再做小步调优

## 8. AI 任务调优参数

这些参数控制不同 AI 任务的温度和输出预算。

### ai doctor

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_AI_DOCTOR_TEST_MAX_OUTPUT_TOKENS` | `60` | 最小生成测试输出上限 |
| `NOVEL_AI_DOCTOR_CHAPTER_PLAN_MAX_OUTPUT_TOKENS` | `600` | `chapter-plan` 联调输出上限 |
| `NOVEL_AI_DOCTOR_DRAFT_WRITE_MAX_OUTPUT_TOKENS` | `800` | `draft-write` 联调输出上限 |
| `NOVEL_AI_DOCTOR_DRAFT_FIX_MAX_OUTPUT_TOKENS` | `900` | `draft-fix` 联调输出上限 |

### chapter plan

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_AI_CHAPTER_PLAN_TEMPERATURE` | `0.7` | 章节规划温度 |
| `NOVEL_AI_CHAPTER_PLAN_MAX_OUTPUT_TOKENS` | `16384` | 章节规划输出上限 |

### draft write

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_AI_DRAFT_WRITE_TEMPERATURE` | `0.8` | 草稿生成温度 |
| `NOVEL_AI_DRAFT_WRITE_MAX_OUTPUT_TOKENS` | `16384` | 草稿生成输出上限 |

### draft fix

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_AI_DRAFT_FIX_TEMPERATURE` | `0.6` | 草稿修订温度 |
| `NOVEL_AI_DRAFT_FIX_MAX_OUTPUT_TOKENS` | `16384` | 草稿修订输出上限 |

### draft review

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_AI_DRAFT_REVIEW_TEMPERATURE` | `0.2` | 草稿审查温度 |
| `NOVEL_AI_DRAFT_REVIEW_MAX_OUTPUT_TOKENS` | `16384` | 草稿审查输出上限 |

### state extract

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_AI_STATE_EXTRACT_TEMPERATURE` | `0.2` | 状态提取温度 |
| `NOVEL_AI_STATE_EXTRACT_MAX_OUTPUT_TOKENS` | `16384` | 状态提取输出上限 |

说明：

- 温度越高，生成越发散；温度越低，生成越稳定
- `state extract` 更追求结构稳定，因此默认温度更低

## 9. Draft 修稿辅助参数

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NOVEL_DRAFT_FIX_IMPORTANT_FACTION_LIMIT` | `2` | 规则修稿时，最多补入多少个高优先级势力名 |

作用：

- 这是规则修稿阶段的辅助限制，避免修稿提示扩散得太散

## 10. 非法值处理规则

### 数字变量

整数和浮点环境变量都遵循下面的规则：

- 未配置：回退默认值
- 不是合法数字：回退默认值
- 小于最小值：回退默认值

例如：

- `NOVEL_CONTEXT_MAX_CHARACTER_ITEMS=abc` 会回退到默认值 `8`
- `NOVEL_AI_STATE_EXTRACT_MAX_OUTPUT_TOKENS=0` 会回退到默认值 `16384`

### 布尔变量

当前布尔变量主要是：

- `CUSTOM_AI_REQUIRE_API_KEY`

支持值：

- 真：`1`、`true`、`yes`、`on`
- 假：`0`、`false`、`no`、`off`

非法值会回退默认值。

## 11. 常见配置示例

### 本地开发

```env
NOVEL_AI_PROVIDER=mock
NOVEL_AI_MODEL=gpt-4.1-mini
```

### OpenAI

```env
NOVEL_AI_PROVIDER=openai
NOVEL_AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=your_openai_api_key
```

### Anthropic

```env
NOVEL_AI_PROVIDER=anthropic
NOVEL_AI_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Custom 网关

```env
NOVEL_AI_PROVIDER=custom
NOVEL_AI_MODEL=your-model-name
CUSTOM_AI_BASE_URL=https://your-custom-ai.example.com
CUSTOM_AI_API_KEY=your_custom_ai_api_key
CUSTOM_AI_CHAT_PATH=/v1/chat/completions
CUSTOM_AI_MODELS_PATH=/v1/models
CUSTOM_AI_AUTH_HEADER=Authorization
CUSTOM_AI_AUTH_PREFIX=Bearer
CUSTOM_AI_REQUIRE_API_KEY=true
```

### 长篇项目，适当放宽上下文

```env
NOVEL_CONTEXT_MAX_CHARACTER_ITEMS=12
NOVEL_CONTEXT_MAX_FACTION_ITEMS=8
NOVEL_CONTEXT_MAX_ITEM_ITEMS=6
NOVEL_CONTEXT_SQL_QUERY_LIMIT=96
NOVEL_CONTEXT_MAX_CHAPTER_SNAPSHOT_ITEMS=8
NOVEL_CONTEXT_MAX_HOOK_ITEMS=12
NOVEL_CONTEXT_MAX_STATE_ITEMS=12
```

## 12. 推荐使用方式

建议按下面顺序配置：

1. 先只配置 provider 相关变量，保证流程能跑通
2. 再按需要调节 `NOVEL_AI_*` 输出预算
3. 最后才去改 `NOVEL_CONTEXT_*` 和 `NOVEL_RELEVANCE_*`

原因：

- provider 配错会直接无法联调
- token 预算影响成本和输出稳定性
- 上下文和相关性权重属于更细的行为调优，应该最后再动

## 13. 相关文件

- 模板文件：[.env.example](../.env.example)
- 运行时读取实现：[src/config/runtime-env.ts](../src/config/runtime-env.ts)
- provider 解析实现：[src/ai/provider-factory.ts](../src/ai/provider-factory.ts)
- 默认配置实现：[src/utils/paths.ts](../src/utils/paths.ts)
