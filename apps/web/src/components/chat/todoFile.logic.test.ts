import { describe, expect, it } from "vite-plus/test";

import { parseTodoFile, todoMemoryPath } from "./todoFile.logic";

describe("todoMemoryPath", () => {
  it.each([
    ["/home/kiril/claudeStuff/t3code", "-home-kiril-claudeStuff-t3code"],
    ["/home/kiril/qwen-v4.1-flash", "-home-kiril-qwen-v4-1-flash"],
    ["/home/kiril/.t3/scratch", "-home-kiril--t3-scratch"],
    [
      "/home/kiril/receiptRecognition/ReMa Receipt Manager App",
      "-home-kiril-receiptRecognition-ReMa-Receipt-Manager-App",
    ],
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
