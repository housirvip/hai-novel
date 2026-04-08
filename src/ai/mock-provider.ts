import type { AIProvider, GenerateTextInput, GenerateTextResult } from "./provider.js";
import { runtimeEnv } from "../config/runtime-env.js";

export class MockProvider implements AIProvider {
  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    if (input.taskType === "ai_test") {
      return {
        provider: "mock",
        model: "mock-provider-v1",
        text: `Mock provider 已收到请求：${input.prompt}`
      };
    }

    if (input.taskType === "state_snapshot_extract") {
      return {
        provider: "mock",
        model: "mock-provider-v1",
        text: this.buildStateExtractionJson(input.prompt)
      };
    }

    // Mock provider 先返回一版可阅读的演示正文，确保主流程无需真实模型也能跑通。
    return {
      provider: "mock",
      model: "mock-provider-v1",
      text: [
        `【${input.taskType} / Mock 输出】`,
        "",
        "夜色压着山门，雨水像细针一样落下来。",
        "主角在外部环境的逼迫中向前，被迫做出比平时更快的判断，这能自然带出章节的第一波 tension。",
        "人物之间的试探不要一次说透，让信息差先存在，读者才会跟着往下追。",
        "中段把冲突落到具体动作和对话里，不只交代设定，也要让情绪推动事件。",
        "结尾留下一道更大的疑问，或让原本以为稳定的关系出现轻微裂缝，为下一章续上动力。",
        "",
        "以下为本次生成参考上下文：",
        input.prompt,
        "",
        input.contextText
      ].join("\n")
    };
  }

  private buildStateExtractionJson(prompt: string): string {
    const finalText = this.extractBlock(prompt, "正式文稿：", "请输出 JSON，对象结构必须严格如下：");
    const characterMatches = Array.from(
      prompt.matchAll(/CHARACTER\|id=(\d+)\|name=([^|\n]+)\|goal=([^\n]*)/g)
    );
    const factionMatches = Array.from(
      prompt.matchAll(/FACTION\|id=(\d+)\|name=([^|\n]+)\|stance=([^\n]*)/g)
    );
    const hookMatches = Array.from(
      prompt.matchAll(/HOOK\|id=(\d+)\|title=([^|\n]+)\|summary=([^|\n]*)\|status=([^\n]*)/g)
    );
    const itemMatches = Array.from(
      prompt.matchAll(
        /ITEM\|id=(\d+)\|name=([^|\n]+)\|owner_character_id=([^|\n]*)\|owner_name=([^|\n]*)\|note=([^\n]*)/g
      )
    );

    const characters = characterMatches
      .filter(([, , name]) => finalText.includes(name))
      .map(([, id, name, goal]) => ({
        character_id: Number(id),
        status_summary: this.findMentionSummary(finalText, name),
        location: "",
        goal: goal.trim(),
        public_impression: `本章正式文稿明确出现人物“${name}”。`,
        internal_state: ""
      }));

    const factions = factionMatches
      .filter(([, , name]) => finalText.includes(name))
      .map(([, id, name, stance]) => ({
        faction_id: Number(id),
        status_summary: this.findMentionSummary(finalText, name),
        power_shift: "",
        external_relation_summary: stance.trim()
      }));

    const hooks = hookMatches.map(([, id, title, summary]) => {
      const keywords = [title, summary]
        .flatMap((value) => value.split(/[，。！？；、\s]+/))
        .map((value) => value.trim())
        .filter((value) => value.length >= 2);
      const detected = keywords.some((keyword) => finalText.includes(keyword));
      return {
        hook_id: Number(id),
        progress_status: detected ? "advanced" : "pending",
        progress_note: detected
          ? `本章正式文稿已检测到钩子“${title}”的推进痕迹。`
          : `本章已关联钩子“${title}”，但正文中未检测到明显推进痕迹。`
      };
    });

    const items = itemMatches
      .filter(([, , name, , , note]) => {
        const keywords = this.extractItemKeywords(name, note);
        return keywords.some((keyword) => finalText.includes(keyword));
      })
      .map(([, id, name, ownerCharacterId, ownerName, note]) => {
        const keywords = this.extractItemKeywords(name, note);
        const matchedKeyword = keywords.find((keyword) => finalText.includes(keyword)) ?? name;

        return {
          item_id: Number(id),
          owner_character_id:
            ownerCharacterId.trim().length > 0 &&
            (ownerName.trim().length === 0 || finalText.includes(ownerName))
              ? Number(ownerCharacterId)
              : undefined,
          status_summary: this.findMentionSummary(finalText, matchedKeyword),
          location:
            ownerName.trim().length > 0 && finalText.includes(ownerName) ? `${ownerName}身边` : ""
        };
      });

    return JSON.stringify(
      {
        chapter_summary: `角色提及 ${characters.length} 个，势力提及 ${factions.length} 个，钩子跟踪 ${hooks.length} 条，物品提及 ${items.length} 个`,
        characters,
        factions,
        hooks,
        items
      },
      null,
      2
    );
  }

  private extractItemKeywords(name: string, note: string): string[] {
    const keywords = new Set(
      [name, note]
        .flatMap((value) => value.split(/[，。！？；、\s]+/))
        .map((value) => value.trim())
        .filter((value) => value.length >= 2)
    );

    // 中文道具名在正文里常会退化成简称，例如“黑玉佩”后续只写“玉佩”。
    if (name.trim().length >= 3) {
      keywords.add(name.trim().slice(1));
      keywords.add(name.trim().slice(-2));
    }

    return [...keywords].filter((value) => value.length >= 2);
  }

  private extractBlock(prompt: string, startMarker: string, endMarker: string): string {
    const startIndex = prompt.indexOf(startMarker);
    const endIndex = prompt.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return "";
    }

    return prompt
      .slice(startIndex + startMarker.length, endIndex)
      .trim();
  }

  private findMentionSummary(finalText: string, keyword: string): string {
    const sentences = finalText
      .split(/(?<=[。！？\n])/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const matched = sentences.find((sentence) => sentence.includes(keyword));
    // 这里是 mock 场景下的人类可读摘要，不影响正式状态结构，因此只控制展示长度即可。
    return matched
      ? matched.slice(0, runtimeEnv.display.mockMentionSummaryLength)
      : `本章正式文稿提到了“${keyword}”。`;
  }
}
