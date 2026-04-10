import dotenv from "dotenv";

/**
 * 统一加载 `.env`。
 * 这里做成幂等函数，避免 CLI 入口、测试入口、服务层重复调用时产生副作用。
 */
let envLoaded = false;

export function ensureRuntimeEnvLoaded(): void {
  if (envLoaded) {
    return;
  }

  // CLI 本身已经有自己的日志体系，这里关闭 dotenv 的附加提示，避免污染命令输出。
  dotenv.config({ quiet: true });
  envLoaded = true;
}

ensureRuntimeEnvLoaded();

interface NumberEnvOptions {
  /** 允许的最小值，小于该值时回退到默认值。 */
  min?: number;
}

/**
 * 读取整数环境变量。
 * 适用于“数量上限”“排序基础分”“token 上限”这类必须是整数的配置项。
 */
function readIntegerEnv(
  name: string,
  fallback: number,
  options: NumberEnvOptions = {}
): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  if (options.min !== undefined && parsed < options.min) {
    return fallback;
  }

  return parsed;
}

/**
 * 读取浮点环境变量。
 * 适用于 temperature 这类允许小数的调优项。
 */
function readFloatEnv(
  name: string,
  fallback: number,
  options: NumberEnvOptions = {}
): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  if (options.min !== undefined && parsed < options.min) {
    return fallback;
  }

  return parsed;
}

/**
 * 项目运行时可通过 `.env` 调整的参数集合。
 * 这里聚合“prompt 控长阈值”“相关性打分权重”“AI 调优参数”，避免魔法数字散落各处。
 */
export const runtimeEnv = {
  display: {
    /** run history 等列表里展示生成结果摘要时的默认截断长度。 */
    runTextPreviewLength: readIntegerEnv("NOVEL_DISPLAY_RUN_TEXT_PREVIEW_LENGTH", 120, {
      min: 1
    }),
    /** doctor 联网失败时，最多展示多少字符的响应体，避免错误输出刷屏。 */
    networkErrorPreviewLength: readIntegerEnv(
      "NOVEL_DISPLAY_NETWORK_ERROR_PREVIEW_LENGTH",
      200,
      { min: 1 }
    ),
    /** doctor 生成成功时，最多回显多少字符的生成结果摘要。 */
    generationPreviewLength: readIntegerEnv("NOVEL_DISPLAY_GENERATION_PREVIEW_LENGTH", 120, {
      min: 1
    }),
    /** mock 状态提取里，从正式文稿截取命中句子时的摘要长度。 */
    mockMentionSummaryLength: readIntegerEnv("NOVEL_DISPLAY_MOCK_MENTION_SUMMARY_LENGTH", 120, {
      min: 1
    })
  },
  context: {
    /** prompt 中最多保留多少个人物条目。 */
    maxCharacterItems: readIntegerEnv("NOVEL_CONTEXT_MAX_CHARACTER_ITEMS", 8, { min: 1 }),
    /** prompt 中最多保留多少个势力条目。 */
    maxFactionItems: readIntegerEnv("NOVEL_CONTEXT_MAX_FACTION_ITEMS", 6, { min: 1 }),
    /** prompt 中最多保留多少条世界观设定。 */
    maxLoreItems: readIntegerEnv("NOVEL_CONTEXT_MAX_LORE_ITEMS", 8, { min: 1 }),
    /** prompt 中最多保留多少条人物关系。 */
    maxRelationItems: readIntegerEnv("NOVEL_CONTEXT_MAX_RELATION_ITEMS", 8, { min: 1 }),
    /** prompt 中最多保留多少条人物-势力关系。 */
    maxCharacterFactionItems: readIntegerEnv(
      "NOVEL_CONTEXT_MAX_CHARACTER_FACTION_ITEMS",
      8,
      { min: 1 }
    ),
    /** prompt 中最多保留多少条关键物品上下文。 */
    maxItemItems: readIntegerEnv("NOVEL_CONTEXT_MAX_ITEM_ITEMS", 6, { min: 1 }),
    /** 上下文构建时，单次 SQL 查询的候选池上限。 */
    sqlQueryLimit: readIntegerEnv("NOVEL_CONTEXT_SQL_QUERY_LIMIT", 512, { min: 1 }),
    /** prompt 中最多保留多少条最近章节正式状态摘要。 */
    maxChapterSnapshotItems: readIntegerEnv("NOVEL_CONTEXT_MAX_CHAPTER_SNAPSHOT_ITEMS", 5, {
      min: 1
    }),
    /** prompt 中最多保留多少条活跃钩子。 */
    maxHookItems: readIntegerEnv("NOVEL_CONTEXT_MAX_HOOK_ITEMS", 8, { min: 1 }),
    /** prompt 中最多保留多少条状态快照。 */
    maxStateItems: readIntegerEnv("NOVEL_CONTEXT_MAX_STATE_ITEMS", 8, { min: 1 }),
    /** 普通文本字段在 prompt 中的默认截断长度。 */
    textFieldMaxLength: readIntegerEnv("NOVEL_CONTEXT_TEXT_FIELD_MAX_LENGTH", 512, {
      min: 1
    }),
    /** 较长文本字段在 prompt 中的默认截断长度。 */
    longTextFieldMaxLength: readIntegerEnv("NOVEL_CONTEXT_LONG_TEXT_FIELD_MAX_LENGTH", 512, {
      min: 1
    }),
    /** 最近章节快照 raw_payload 预览在 prompt 中的默认截断长度。 */
    snapshotRawPayloadPreviewLength: readIntegerEnv(
      "NOVEL_CONTEXT_SNAPSHOT_RAW_PAYLOAD_PREVIEW_LENGTH",
      512,
      { min: 1 }
    )
  },
  relevance: {
    character: {
      /** 主角默认要强制靠前，否则很容易在大项目里被次要人物淹没。 */
      protagonistBonus: readIntegerEnv(
        "NOVEL_RELEVANCE_CHARACTER_PROTAGONIST_BONUS",
        120,
        { min: 0 }
      ),
      /** 反派通常直接影响本章冲突强度，因此给予次高优先级。 */
      antagonistBonus: readIntegerEnv(
        "NOVEL_RELEVANCE_CHARACTER_ANTAGONIST_BONUS",
        50,
        { min: 0 }
      ),
      /** 角色名被章节文本显式命中时，说明这章大概率会直接写到他。 */
      nameMatchBonus: readIntegerEnv("NOVEL_RELEVANCE_CHARACTER_NAME_MATCH_BONUS", 100, {
        min: 0
      }),
      /** 角色目标被命中时，说明本章可能推进他的行动线。 */
      goalMatchBonus: readIntegerEnv("NOVEL_RELEVANCE_CHARACTER_GOAL_MATCH_BONUS", 40, {
        min: 0
      }),
      /** 角色冲突被命中时，说明本章可能继续拉扯这条矛盾线。 */
      conflictMatchBonus: readIntegerEnv(
        "NOVEL_RELEVANCE_CHARACTER_CONFLICT_MATCH_BONUS",
        35,
        { min: 0 }
      ),
      /** 当章节语义已经命中其所属势力时，该人物的上场概率也会同步提高。 */
      factionMatchBonus: readIntegerEnv(
        "NOVEL_RELEVANCE_CHARACTER_FACTION_MATCH_BONUS",
        45,
        { min: 0 }
      ),
      /** 最近正式状态里出现过的人物，通常仍在持续推进。 */
      latestStateBonus: readIntegerEnv(
        "NOVEL_RELEVANCE_CHARACTER_LATEST_STATE_BONUS",
        20,
        { min: 0 }
      )
    },
    faction: {
      /** 势力名被直接提及时，几乎可以判定它是本章显式舞台。 */
      nameMatchBonus: readIntegerEnv("NOVEL_RELEVANCE_FACTION_NAME_MATCH_BONUS", 110, {
        min: 0
      }),
      /** 势力目标命中时，说明本章可能会推进它的组织行动。 */
      goalMatchBonus: readIntegerEnv("NOVEL_RELEVANCE_FACTION_GOAL_MATCH_BONUS", 35, {
        min: 0
      }),
      /** 势力立场被命中时，主要用于补强阵营对抗类章节。 */
      stanceMatchBonus: readIntegerEnv("NOVEL_RELEVANCE_FACTION_STANCE_MATCH_BONUS", 15, {
        min: 0
      }),
      /** 关键人物命中后，其背后的势力也往往应该同步进入上下文。 */
      relatedCharacterBonus: readIntegerEnv(
        "NOVEL_RELEVANCE_FACTION_CHARACTER_MATCH_BONUS",
        60,
        { min: 0 }
      ),
      /** 最近出现过正式状态的势力，通常仍处于变化期。 */
      latestStateBonus: readIntegerEnv("NOVEL_RELEVANCE_FACTION_LATEST_STATE_BONUS", 20, {
        min: 0
      })
    },
    hook: {
      /** 已绑定到本章的钩子是最强信号，应优先进入 prompt。 */
      directLinkBonus: readIntegerEnv("NOVEL_RELEVANCE_HOOK_DIRECT_LINK_BONUS", 140, {
        min: 0
      }),
      /** 目标回收章意味着作者明确要在本章处理该钩子。 */
      targetChapterBonus: readIntegerEnv("NOVEL_RELEVANCE_HOOK_TARGET_CHAPTER_BONUS", 120, {
        min: 0
      }),
      /** 钩子标题被命中时，说明作者当前就在围绕它思考。 */
      titleMatchBonus: readIntegerEnv("NOVEL_RELEVANCE_HOOK_TITLE_MATCH_BONUS", 80, {
        min: 0
      }),
      /** 钩子摘要被命中时，用于补充语义接近但未直接点名的场景。 */
      summaryMatchBonus: readIntegerEnv("NOVEL_RELEVANCE_HOOK_SUMMARY_MATCH_BONUS", 35, {
        min: 0
      }),
      /** 最近推进过的钩子，下一章继续承接的概率更高。 */
      latestAdvancedBonus: readIntegerEnv(
        "NOVEL_RELEVANCE_HOOK_LATEST_ADVANCED_BONUS",
        25,
        { min: 0 }
      )
    },
    snapshotBaseScore: readIntegerEnv("NOVEL_RELEVANCE_SNAPSHOT_BASE_SCORE", 10_000, {
      min: 1
    }),
    hookStateResolvedBonus: readIntegerEnv(
      "NOVEL_RELEVANCE_HOOK_STATE_RESOLVED_BONUS",
      10,
      { min: 0 }
    ),
    hookStateAdvancedBonus: readIntegerEnv(
      "NOVEL_RELEVANCE_HOOK_STATE_ADVANCED_BONUS",
      20,
      { min: 0 }
    )
  },
  ai: {
    doctor: {
      /** 连通性测试只需要一句短回复，预算越小越能快速暴露 provider 是否可用。 */
      testMaxOutputTokens: readIntegerEnv("NOVEL_AI_DOCTOR_TEST_MAX_OUTPUT_TOKENS", 60, {
        min: 1
      }),
      /** doctor 的 plan 联调只验证链路是否可跑通，不追求完整规划正文。 */
      chapterPlanMaxOutputTokens: readIntegerEnv(
        "NOVEL_AI_DOCTOR_CHAPTER_PLAN_MAX_OUTPUT_TOKENS",
        600,
        { min: 1 }
      ),
      /** doctor 的 draft-write 联调只需要确认草稿生成链路可用，因此预算低于正式写稿。 */
      draftWriteMaxOutputTokens: readIntegerEnv(
        "NOVEL_AI_DOCTOR_DRAFT_WRITE_MAX_OUTPUT_TOKENS",
        800,
        { min: 1 }
      ),
      /** doctor 的 draft-fix 联调需要容纳一定改写空间，所以略高于 draft-write。 */
      draftFixMaxOutputTokens: readIntegerEnv(
        "NOVEL_AI_DOCTOR_DRAFT_FIX_MAX_OUTPUT_TOKENS",
        900,
        { min: 1 }
      )
    },
    chapterPlan: {
      /** 章规划偏创造性，但仍需要结构稳定，因此默认温度中等。 */
      temperature: readFloatEnv("NOVEL_AI_CHAPTER_PLAN_TEMPERATURE", 0.7, { min: 0 }),
      /** 默认放宽到 16384，具体可再由项目环境变量覆盖。 */
      maxOutputTokens: readIntegerEnv("NOVEL_AI_CHAPTER_PLAN_MAX_OUTPUT_TOKENS", 16384, {
        min: 1
      })
    },
    draftWrite: {
      /** 写稿兼顾发散与稳定，默认温度略高于修稿。 */
      temperature: readFloatEnv("NOVEL_AI_DRAFT_WRITE_TEMPERATURE", 0.8, { min: 0 }),
      /** 正式写稿默认放宽到 16384。 */
      maxOutputTokens: readIntegerEnv("NOVEL_AI_DRAFT_WRITE_MAX_OUTPUT_TOKENS", 16384, {
        min: 1
      })
    },
    draftFix: {
      /** 修稿需要在遵循问题清单和保留原意之间平衡，温度略低于规划。 */
      temperature: readFloatEnv("NOVEL_AI_DRAFT_FIX_TEMPERATURE", 0.6, { min: 0 }),
      /** 修稿默认放宽到 16384。 */
      maxOutputTokens: readIntegerEnv("NOVEL_AI_DRAFT_FIX_MAX_OUTPUT_TOKENS", 16384, {
        min: 1
      })
    },
    draftReview: {
      /** 审查更强调稳定与结构化，因此温度保持较低。 */
      temperature: readFloatEnv("NOVEL_AI_DRAFT_REVIEW_TEMPERATURE", 0.2, { min: 0 }),
      /** AI 审查默认放宽到 16384。 */
      maxOutputTokens: readIntegerEnv("NOVEL_AI_DRAFT_REVIEW_MAX_OUTPUT_TOKENS", 16384, {
        min: 1
      })
    },
    stateExtract: {
      /** 状态提取更强调稳定结构化输出，因此温度保持较低。 */
      temperature: readFloatEnv("NOVEL_AI_STATE_EXTRACT_TEMPERATURE", 0.2, { min: 0 }),
      /** 状态提取默认也统一放宽到 16384。 */
      maxOutputTokens: readIntegerEnv("NOVEL_AI_STATE_EXTRACT_MAX_OUTPUT_TOKENS", 16384, {
        min: 1
      })
    }
  },
  draft: {
    /** 规则修稿时，最多补入多少个高优先级势力名，避免兜底修补写得过散。 */
    importantFactionHintLimit: readIntegerEnv("NOVEL_DRAFT_FIX_IMPORTANT_FACTION_LIMIT", 2, {
      min: 1
    })
  }
} as const;
