import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"

import {
  boardAssetUrl,
  collectMarkdownImageSrcs,
  resolveBoardAssetPath,
} from "@taskmark/components/board-model"

import {
  allowedBoardRelative,
  copyReferencedBoardAssets,
} from "@/lib/taskmark/board-assets"

test("resolveBoardAssetPath resolves relative images next to the markdown", () => {
  assert.equal(
    resolveBoardAssetPath("/b/epics/E-1/epic.md", "./img/mock up.png"),
    "/b/epics/E-1/img/mock up.png"
  )
  assert.equal(
    resolveBoardAssetPath("/b/epics/E-1/stories/S-1.md", "../shot.PNG?v=2#x"),
    "/b/epics/E-1/shot.PNG"
  )
  assert.equal(
    resolveBoardAssetPath("epics/E-1/epic.md", "mock%20up.jpg"),
    "epics/E-1/mock up.jpg"
  )
  assert.equal(
    resolveBoardAssetPath("C:\\b\\epics\\E-1\\epic.md", "a.png"),
    "C:/b/epics/E-1/a.png"
  )
})

test("resolveBoardAssetPath leaves non-relative, non-image and escaping srcs", () => {
  const source = "epics/E-1/epic.md"
  for (const src of [
    "https://x.dev/a.png",
    "data:image/png;base64,AA",
    "//cdn/a.png",
    "/a.png",
    "#a",
    "./notes.md",
    "../../../a.png",
  ]) {
    assert.equal(resolveBoardAssetPath(source, src), null, src)
  }
  assert.equal(resolveBoardAssetPath("/b.md", "../a.png"), null)
})

test("boardAssetUrl builds live and static URLs", () => {
  assert.equal(
    boardAssetUrl("live", "/b/epics/a b.png"),
    "/api/board-asset?path=%2Fb%2Fepics%2Fa%20b.png"
  )
  assert.equal(
    boardAssetUrl("static", "epics/E-1/a b.png"),
    "/board-assets/epics/E-1/a%20b.png"
  )
})

test("collectMarkdownImageSrcs finds inline and reference images", () => {
  const md = [
    '![one](./one.png "title")',
    "![two](<two words.png>)",
    "text ![x][ref] and [link](./doc.md)",
    "[ref]: ./three.webp",
  ].join("\n")
  assert.deepEqual(collectMarkdownImageSrcs(md).sort(), [
    "./one.png",
    "./three.webp",
    "<two words.png>",
  ])
})

test("allowedBoardRelative blocks escapes, dot folders and build output", () => {
  const b = path.resolve("/board")
  const ok = (rel: string) => allowedBoardRelative(b, path.join(b, rel))
  assert.equal(ok("epics/E-1/a.png"), path.join("epics", "E-1", "a.png"))
  assert.equal(ok(".reports/a.png"), path.join(".reports", "a.png"))
  assert.equal(ok(".git/a.png"), null)
  assert.equal(ok("epics/.hidden/a.png"), null)
  assert.equal(ok("node_modules/x/a.png"), null)
  assert.equal(ok("out/a.png"), null)
  assert.equal(allowedBoardRelative(b, path.resolve("/elsewhere/a.png")), null)
})

test("copyReferencedBoardAssets copies only referenced, allowed images", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tm-assets-"))
  try {
    const board = path.join(tmp, "board")
    const epic = path.join(board, "epics", "E-1")
    fs.mkdirSync(path.join(epic, "img"), { recursive: true })
    fs.writeFileSync(path.join(epic, "img", "a.png"), "png")
    fs.writeFileSync(path.join(epic, "unused.png"), "png")
    fs.writeFileSync(path.join(tmp, "secret.png"), "png")
    fs.writeFileSync(
      path.join(epic, "epic.md"),
      "![a](./img/a.png)\n![gone](./missing.png)\n![out](../../../secret.png)\n"
    )
    fs.writeFileSync(path.join(board, "CHANGELOG.md"), "![c](epics/E-1/img/a.png)\n")

    const pub = path.join(tmp, "public")
    fs.mkdirSync(path.join(pub, "board-assets"), { recursive: true })
    fs.writeFileSync(path.join(pub, "board-assets", "stale.png"), "old")

    const result = copyReferencedBoardAssets(board, pub)
    assert.equal(result.copied, 1)
    assert.deepEqual(result.skipped, ["epics/E-1/epic.md: ./missing.png"])
    assert.ok(fs.existsSync(path.join(pub, "board-assets/epics/E-1/img/a.png")))
    assert.ok(!fs.existsSync(path.join(pub, "board-assets/stale.png")))
    assert.ok(!fs.existsSync(path.join(pub, "board-assets/epics/E-1/unused.png")))
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
