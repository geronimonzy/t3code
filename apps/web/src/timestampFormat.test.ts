import { describe, expect, it } from "vite-plus/test";

import { formatResetTimestamp, formatShortTimestamp } from "./timestampFormat";

describe("formatResetTimestamp", () => {
  const now = new Date(2026, 7, 14, 12, 0).getTime();
  const weekday = (date: Date) =>
    new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);

  it("says only the time for a reset later today", () => {
    const resetAt = new Date(2026, 7, 14, 14, 30).toISOString();
    expect(formatResetTimestamp(resetAt, "12-hour", now)).toBe(
      `at ${formatShortTimestamp(resetAt, "12-hour")}`,
    );
  });

  it("names the weekday within the coming week", () => {
    const reset = new Date(2026, 7, 17, 22, 0);
    expect(formatResetTimestamp(reset.toISOString(), "12-hour", now)).toBe(
      `${weekday(reset)} ${formatShortTimestamp(reset.toISOString(), "12-hour")}`,
    );
  });

  it("falls back to a date a week or more out, and is empty for invalid input", () => {
    const resetAt = new Date(2026, 7, 21, 9, 0).toISOString();
    expect(formatResetTimestamp(resetAt, "12-hour", now)).not.toMatch(/day /);
    expect(formatResetTimestamp("not-a-date", "12-hour", now)).toBe("");
  });
});
