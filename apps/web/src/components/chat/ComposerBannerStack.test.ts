import { expect, it } from "vite-plus/test";

import { orderComposerBanners } from "./ComposerBannerStack";

it("puts a critical notice ahead of urgent, activity, and plain notices", () => {
  const entry = (id: string, priority: "critical" | "activity" | "urgent" | "notice") => ({
    id,
    priority,
    variant: "default" as const,
    content: null,
  });
  const ordered = orderComposerBanners([
    entry("notice", "notice"),
    entry("activity", "activity"),
    entry("urgent", "urgent"),
    entry("critical", "critical"),
  ]);
  expect(ordered.map((item) => item.id)).toEqual(["critical", "urgent", "activity", "notice"]);
});
