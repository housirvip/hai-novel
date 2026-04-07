/**
 * 解析出的 Markdown frontmatter。
 * V2 先只支持 `key: value` 这类最小可控格式，避免引入完整 YAML 解析器。
 */
export interface MarkdownFrontmatter {
  [key: string]: string;
}

/**
 * 已解析的 Markdown 文档。
 */
export interface ParsedMarkdownDocument {
  /** frontmatter 元数据。 */
  metadata: MarkdownFrontmatter;
  /** 去掉 frontmatter 之后的正文。 */
  content: string;
}

/**
 * Markdown 导入导出辅助服务。
 * 统一负责 frontmatter 解析、字段校验和正文 section 提取。
 */
export class MarkdownSyncService {
  parseDocument(markdown: string): ParsedMarkdownDocument {
    const matched = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!matched) {
      throw new Error("Markdown frontmatter is required.");
    }

    const metadataBlock = matched[1];
    const metadata: MarkdownFrontmatter = {};

    for (const rawLine of metadataBlock.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        throw new Error(`Invalid markdown metadata line: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      metadata[key] = value;
    }

    return {
      metadata,
      content: markdown.slice(matched[0].length)
    };
  }

  requireMetadataValue(metadata: MarkdownFrontmatter, key: string): string {
    const value = metadata[key];
    if (!value) {
      throw new Error(`Markdown metadata \`${key}\` is required.`);
    }

    return value;
  }

  requireIntegerMetadata(metadata: MarkdownFrontmatter, key: string): number {
    const rawValue = this.requireMetadataValue(metadata, key);
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`Markdown metadata \`${key}\` must be an integer.`);
    }

    return parsed;
  }

  expectEntityType(metadata: MarkdownFrontmatter, expected: string): void {
    const actual = this.requireMetadataValue(metadata, "entity_type");
    if (actual !== expected) {
      throw new Error(`Markdown entity_type mismatch: expected=${expected}, actual=${actual}.`);
    }
  }

  extractSection(content: string, heading: string): string {
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const headingPattern = new RegExp(`^##\\s+${escapedHeading}\\s*$`, "m");
    const headingMatched = headingPattern.exec(content);
    if (!headingMatched || headingMatched.index === undefined) {
      throw new Error(`Markdown section \`${heading}\` not found.`);
    }

    const sectionStart = headingMatched.index + headingMatched[0].length;
    const bodyStart = content
      .slice(sectionStart)
      .replace(/^\r?\n/, "");
    const nextHeadingIndex = bodyStart.search(/^##\s+/m);
    const sectionBody =
      nextHeadingIndex === -1 ? bodyStart : bodyStart.slice(0, nextHeadingIndex);

    return sectionBody.trim();
  }

  normalizeOptionalValue(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "未提供" || trimmed === "未设置") {
      return null;
    }

    return trimmed;
  }
}
