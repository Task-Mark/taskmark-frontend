import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  AGENT_INSTRUCTIONS_TEMPLATE,
  SECTION_BEGIN,
  SECTION_END,
  boardPathFromRepo,
  planAgentInstructions,
  previewChange,
  renderSection,
  upsertSection,
} from "../../bin/lib/agent-instructions.mjs"
import {
  BOARD_GITIGNORE,
  applyScaffold,
  boardPackageName,
  mergeGitignore,
  planScaffold,
} from "../../bin/lib/board-scaffold.mjs"

function tmp() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-scaffold-")))
}

test("a new board gets requests/, meetings/, package.json and .gitignore", () => {
  const board = path.join(tmp(), "shop-taskmark")
  const files = planScaffold({
    boardPath: board,
    name: boardPackageName("shop"),
    uiVersion: "2.0.1",
    kind: "none",
    writingLanguage: "Portuguese",
    repos: ["../shop-api"],
  })
  assert.deepEqual(files.map((f) => [f.path, f.action]), [
    ["package.json", "create"],
    [".gitignore", "create"],
    ["requests/.gitkeep", "create"],
    ["meetings/.gitkeep", "create"],
  ])
  const pkg = JSON.parse(files[0].content)
  assert.equal(pkg.name, "shop-taskmark")
  assert.equal(pkg.dependencies["@taskmark/ui"], "^2.0.1")
  assert.deepEqual(pkg.taskmark, { writingLanguage: "Portuguese", repos: ["../shop-api"] })
  assert.equal(pkg.scripts.dev, "taskmark dev")
  assert.equal(pkg.type, "module")
  const ignore = files[1].content.split("\n")
  for (const line of [".config", "out/", "REPOS.md", "node_modules/"]) assert.ok(ignore.includes(line), line)

  applyScaffold(board, files)
  assert.ok(fs.existsSync(path.join(board, "requests/.gitkeep")))
  assert.ok(fs.existsSync(path.join(board, "meetings/.gitkeep")))
  assert.ok(!fs.existsSync(path.join(board, "README.md")))
})

test("an existing board keeps its keys and only gains what is missing", () => {
  const board = tmp()
  fs.mkdirSync(path.join(board, "epics"))
  fs.writeFileSync(
    path.join(board, "package.json"),
    JSON.stringify({
      name: "mine",
      scripts: { dev: "custom" },
      devDependencies: { "@taskmark/ui": "^1.0.0" },
      taskmark: { writingLanguage: "pt", branches: { production: "main" } },
    }),
  )
  fs.writeFileSync(path.join(board, ".gitignore"), "node_modules\n.config\n")
  const files = planScaffold({ boardPath: board, name: "x", uiVersion: "2.0.1", kind: "legacy", writingLanguage: "pt" })
  assert.ok(!files.some((f) => f.path.startsWith("requests/")), "legacy boards get requests/ from the migration")
  const pkg = JSON.parse(files[0].content)
  assert.equal(files[0].action, "update")
  assert.equal(pkg.name, "mine")
  assert.equal(pkg.scripts.dev, "custom")
  assert.equal(pkg.dependencies["@taskmark/ui"], "^1.0.0")
  assert.equal(pkg.devDependencies, undefined)
  assert.deepEqual(pkg.taskmark.branches, { production: "main" })
  const ignore = files[1].content
  assert.ok(ignore.startsWith("node_modules\n.config\n"))
  assert.equal(ignore.match(/^\.config$/gm)?.length, 1)
  assert.equal(mergeGitignore(BOARD_GITIGNORE.join("\n") + "\n"), BOARD_GITIGNORE.join("\n") + "\n")
})

test("agent section: insert into a file, replace on re-run, create when empty", () => {
  const a = renderSection("taskmark/")
  const b = renderSection("../shop-taskmark/")
  const original = "# Project\n\nSome rules.\n"
  const once = upsertSection(original, a)
  assert.equal(once, `# Project\n\nSome rules.\n\n${a}\n`)
  const twice = upsertSection(once + "\n## After\nmore\n", b)
  assert.ok(twice.startsWith("# Project\n\nSome rules.\n\n"))
  assert.ok(twice.includes("`../shop-taskmark/`"))
  assert.ok(!twice.includes("`taskmark/`."))
  assert.ok(twice.endsWith("\n## After\nmore\n"))
  assert.equal(twice.split(SECTION_BEGIN).length, 2)
  assert.equal(upsertSection(null, a), `${a}\n`)
  assert.ok(a.startsWith(SECTION_BEGIN) && a.endsWith(SECTION_END))
  assert.ok(AGENT_INSTRUCTIONS_TEMPLATE.includes("{{board}}"))
  assert.ok(a.includes("Task: <id>"))
})

test("agent files: both files, created when missing; only AGENTS.md when CLAUDE.md imports it", () => {
  const root = tmp()
  const repoPath = path.join(root, "shop-api")
  const board = path.join(root, "shop-taskmark")
  fs.mkdirSync(repoPath)
  assert.equal(boardPathFromRepo(repoPath, board), "../shop-taskmark/")

  let plan = planAgentInstructions({ repoPath, boardPath: board })
  assert.deepEqual(plan.map((c) => [c.file, c.before, c.changed]), [
    ["AGENTS.md", null, true],
    ["CLAUDE.md", null, true],
  ])
  assert.match(previewChange(plan[0]), /AGENTS\.md \(new file\)\n\+ <!-- taskmark:begin -->/)

  fs.writeFileSync(path.join(repoPath, "CLAUDE.md"), "@AGENTS.md\n")
  plan = planAgentInstructions({ repoPath, boardPath: board })
  assert.deepEqual(plan.map((c) => c.file), ["AGENTS.md"])

  fs.writeFileSync(path.join(repoPath, "AGENTS.md"), plan[0].after)
  plan = planAgentInstructions({ repoPath, boardPath: board })
  assert.equal(plan[0].changed, false)
  assert.equal(previewChange(plan[0]), "AGENTS.md: up to date")

  const nested = planAgentInstructions({ repoPath, boardPath: path.join(repoPath, "taskmark") })
  assert.ok(nested[0].after.includes("`taskmark/`"))
  assert.match(previewChange(nested[0]), /^- .*shop-taskmark/m)
})
