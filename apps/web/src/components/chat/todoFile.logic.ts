/**
 * A project's todo list lives in its Claude Code memory folder, which Claude names after the
 * workspace path with every non-alphanumeric character turned into "-".
 */
export function todoMemoryPath(workspaceRoot: string): string {
  return `~/.claude/projects/${workspaceRoot.replace(/[^a-zA-Z0-9]/g, "-")}/memory/todo.md`;
}

const UPDATED_LINE = /^Updated:\s*(\S+)\s*(?:\r?\n|$)/;

/** The skill writes `Updated: <ISO time>` first, since the file read returns no modified time. */
export function parseTodoFile(
  contents: string,
  exists: boolean,
): { readonly updatedAt: string | null; readonly body: string; readonly empty: boolean } {
  if (!exists) return { updatedAt: null, body: "", empty: true };
  const match = UPDATED_LINE.exec(contents);
  const body = (match ? contents.slice(match[0].length) : contents).trim();
  return { updatedAt: match?.[1] ?? null, body, empty: body.length === 0 };
}

/**
 * The message Refresh sends. The todo-list skill triggers on the phrase and writes to the named
 * file, so the tab and the skill never have to agree on how to find the project folder.
 */
export function todoRefreshPrompt(workspaceRoot: string): string {
  return `check what we have selected to do (list file: ${todoMemoryPath(workspaceRoot)})`;
}
