import { describe, expect, it } from "vite-plus/test";

import { parseTodoFile, todoMemoryPath, todoRefreshPrompt } from "./todoFile.logic";

describe("todoMemoryPath", () => {
  it.each([
    ["/home/dev/projects/t3code", "-home-dev-projects-t3code"],
    ["/home/dev/model-v2.1-beta", "-home-dev-model-v2-1-beta"],
    ["/home/dev/.t3/scratch", "-home-dev--t3-scratch"],
    ["/home/dev/apps/My Sample App", "-home-dev-apps-My-Sample-App"],
  ])("slugs like Claude Code: %s", (workspaceRoot, slug) => {
    expect(todoMemoryPath(workspaceRoot)).toBe(`~/.claude/projects/${slug}/memory/todo.md`);
  });
});

describe("parseTodoFile", () => {
  it("parses the updated line", () => {
    const parsed = parseTodoFile("Updated: 2026-11-05T14:20:00Z\n\n## Todo\n- [ ] A", true);
    expect(parsed.updatedAt).toBe("2026-11-05T14:20:00Z");
    expect(parsed.body.startsWith("## Todo")).toBe(true);
    expect(parsed.empty).toBe(false);
  });

  it("parses a missing file as empty", () => {
    expect(parseTodoFile("", false)).toEqual({ updatedAt: null, body: "", empty: true });
  });

  it("treats a file with only the updated line as empty", () => {
    expect(parseTodoFile("Updated: 2026-11-05T14:20:00Z\n\n", true).empty).toBe(true);
  });

  it("keeps a file without an updated line", () => {
    expect(parseTodoFile("- [ ] A", true)).toEqual({
      updatedAt: null,
      body: "- [ ] A",
      empty: false,
    });
  });
});

describe("todoRefreshPrompt", () => {
  it("names the file the tab reads, so the skill writes exactly there", () => {
    expect(todoRefreshPrompt("/home/dev/projects/t3code-wt/apps/server")).toBe(
      "check what we have selected to do (list file: ~/.claude/projects/-home-dev-projects-t3code-wt-apps-server/memory/todo.md)",
    );
  });
});
