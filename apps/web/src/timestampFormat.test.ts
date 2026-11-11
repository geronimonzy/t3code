import { describe, expect, it } from "vite-plus/test";

import {
  formatDayAwareTimestamp,
  formatResetTimestamp,
  formatShortTimestamp,
  formatUpcomingTimestamp,
} from "./timestampFormat";

describe("timestamps in an explicit time zone", () => {
  // 23:00 UTC on July 1 is 7 PM on July 1 in New York, whatever the host zone.
  const now = Date.parse("2026-07-01T23:00:00.000Z");
  const zone = "America/New_York";

  it("picks relative days from the calendar in that zone", () => {
    expect(formatUpcomingTimestamp("2026-07-02T00:30:00.000Z", "12-hour", now, zone)).not.toMatch(
      /tomorrow/,
    );
    expect(formatUpcomingTimestamp("2026-07-02T05:30:00.000Z", "12-hour", now, zone)).toMatch(
      /^tomorrow at /,
    );
    expect(formatDayAwareTimestamp("2026-07-01T03:30:00.000Z", "12-hour", now, zone)).toMatch(
      /^yesterday at /,
    );
  });
});

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
