import type { AIProvider, GenerateTextInput, GenerateTextResult } from "./provider.js";

export class MockProvider implements AIProvider {
  generateText(input: GenerateTextInput): GenerateTextResult {
    // Mock provider 先返回一版可阅读的演示正文，确保主流程无需真实模型也能跑通。
    return {
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
}
