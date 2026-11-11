import { ChevronRightIcon } from "lucide-react";

import { formatContextWindowTokens } from "../../lib/contextWindow";
import { cn } from "../../lib/utils";
import {
  parseTokenCount,
  type ContextUsageCategory,
  type ContextUsageReport,
  type ContextUsageTable,
} from "./contextUsageReport";

const CATEGORY_COLORS = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
];

function categoryColor(category: ContextUsageCategory, index: number): string {
  const name = category.name.toLowerCase();
  if (name === "free space") return "bg-muted-foreground/15";
  if (name.includes("buffer")) return "bg-muted-foreground/40";
  if (name === "messages") return "bg-primary";
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]!;
}

/** A `/context` report as one bar, a legend, and collapsed per-item breakdowns. */
export function ContextUsageCard(props: { readonly report: ContextUsageReport }) {
  const { report } = props;
  const inWindow = report.categories.filter((category) => !category.deferred);
  const deferred = report.categories.filter((category) => category.deferred);
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border/70 p-3 text-xs">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-foreground text-sm">Context</span>
        <span className="min-w-0 truncate text-muted-foreground">
          {report.model ? `${report.model} · ` : ""}
          <span className="tabular-nums">{report.tokens}</span>
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {inWindow.map((category, index) => (
          <span
            key={category.name}
            className={categoryColor(category, index)}
            style={{ width: `${Math.min(100, category.percentage)}%` }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1">
        {inWindow.map((category, index) => (
          <li key={category.name} className="contents">
            <span className={cn("size-2 rounded-sm", categoryColor(category, index))} />
            <span className="truncate text-foreground/85">{category.name}</span>
            <span className="text-right text-muted-foreground tabular-nums">{category.tokens}</span>
            <span className="w-12 text-right text-muted-foreground tabular-nums">
              {category.percentage}%
            </span>
          </li>
        ))}
      </ul>
      {deferred.length > 0 ? (
        <p className="text-muted-foreground">
          Loaded on demand, not in context:{" "}
          {deferred
            .map(
              (category) => `${category.name.replace(/\s*\(deferred\)/i, "")} ${category.tokens}`,
            )
            .join(", ")}
        </p>
      ) : null}
      {report.details.length > 0 ? (
        <div className="flex flex-col border-t border-border/60 pt-1.5">
          {report.details.map((table) => (
            <ContextUsageBreakdown key={table.title} table={table} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContextUsageBreakdown(props: { readonly table: ContextUsageTable }) {
  const { table } = props;
  const tokenColumn = table.columns.length - 1;
  const rows = table.rows.toSorted(
    (left, right) =>
      parseTokenCount(right[tokenColumn] ?? "") - parseTokenCount(left[tokenColumn] ?? ""),
  );
  const total = rows.reduce((sum, row) => sum + parseTokenCount(row[tokenColumn] ?? ""), 0);
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" />
        <span className="font-medium">{table.title}</span>
        <span className="tabular-nums">· {rows.length}</span>
        <span className="ms-auto tabular-nums">~{formatContextWindowTokens(total)}</span>
      </summary>
      <ul className="max-h-64 overflow-y-auto ps-5 pb-1">
        {rows.map((row) => (
          <li key={row.join("|")} className="flex items-center gap-2 py-0.5">
            <span className="min-w-0 flex-1 truncate font-mono text-foreground/85">{row[0]}</span>
            {row.slice(1, tokenColumn).map((cell, index) => (
              <span
                key={table.columns[index + 1] ?? index}
                className="max-w-[40%] shrink-0 truncate text-muted-foreground"
              >
                {cell}
              </span>
            ))}
            <span className="w-12 shrink-0 text-right text-muted-foreground tabular-nums">
              {row[tokenColumn]}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
