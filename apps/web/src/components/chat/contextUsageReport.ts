/**
 * Claude's `/context` report arrives as one markdown message of large tables.
 * Parsing it back into data lets the timeline show a compact card instead;
 * anything that does not match the report's shape stays plain markdown.
 */

export interface ContextUsageTable {
  readonly title: string;
  readonly columns: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

export interface ContextUsageCategory {
  readonly name: string;
  readonly tokens: string;
  readonly percentage: number;
  /** Deferred tool schemas are listed but sit outside the context window. */
  readonly deferred: boolean;
}

export interface ContextUsageReport {
  readonly model: string | null;
  /** "710.6k / 1m (71%)" as reported. */
  readonly tokens: string | null;
  readonly percentage: number | null;
  readonly categories: ReadonlyArray<ContextUsageCategory>;
  /** The per-item breakdowns that follow: MCP tools, agents, memory files, skills. */
  readonly details: ReadonlyArray<ContextUsageTable>;
}

const REPORT_HEADING = /^#{1,3}\s+Context Usage\s*$/m;

function tableCells(line: string): ReadonlyArray<string> {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseTables(text: string): ReadonlyArray<ContextUsageTable> {
  const tables: ContextUsageTable[] = [];
  const lines = text.split("\n");
  let title: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    const heading = /^#{2,4}\s+(.+)$/.exec(line);
    if (heading) {
      title = heading[1]!.trim();
      continue;
    }
    const separator = lines[index + 1]?.trim() ?? "";
    if (title === null || !line.startsWith("|") || !/^\|[\s|:-]+\|$/.test(separator)) continue;
    const columns = tableCells(line);
    const rows: Array<ReadonlyArray<string>> = [];
    index += 2;
    while (index < lines.length && lines[index]!.trim().startsWith("|")) {
      rows.push(tableCells(lines[index]!));
      index += 1;
    }
    index -= 1;
    tables.push({ title, columns, rows });
    title = null;
  }
  return tables;
}

/** Reads token counts as the report prints them: "5.3k", "1m", "~60", "< 20". */
export function parseTokenCount(value: string): number {
  const match = /([\d.]+)\s*([km])?/i.exec(value.replaceAll(",", ""));
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  return amount * (unit === "k" ? 1_000 : unit === "m" ? 1_000_000 : 1);
}

export function parseContextUsageReport(text: string): ContextUsageReport | null {
  if (!REPORT_HEADING.test(text)) return null;
  const tables = parseTables(text);
  const categoryTable = tables.find((table) => /usage by category/i.test(table.title));
  if (!categoryTable || categoryTable.columns.length < 3) return null;
  const tokens = /\*\*Tokens:\*\*\s*(.+?)\s*$/m.exec(text)?.[1] ?? null;
  const percentage = tokens === null ? null : Number(/\((\d+(?:\.\d+)?)%\)/.exec(tokens)?.[1]);
  return {
    model: /\*\*Model:\*\*\s*(.+?)\s*$/m.exec(text)?.[1] ?? null,
    tokens,
    percentage: percentage === null || Number.isNaN(percentage) ? null : percentage,
    categories: categoryTable.rows.map(([name = "", tokenCount = "", share = ""]) => ({
      name,
      tokens: tokenCount,
      percentage: Number.parseFloat(share) || 0,
      deferred: /\(deferred\)/i.test(name),
    })),
    details: tables.filter((table) => table !== categoryTable && table.rows.length > 0),
  };
}
