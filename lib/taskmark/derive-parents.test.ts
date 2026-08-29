import assert from "node:assert/strict"
import test from "node:test"

import { deriveParentStatus } from "./derive-parents"

test("rolls all shelved descendants up to shelved", () => {
  assert.equal(deriveParentStatus(["shelved", "shelved"]), "shelved")
})

test("rolls a terminal mix containing done up to done", () => {
  assert.equal(
    deriveParentStatus(["shelved", "cancelled", "done"]),
    "done"
  )
})

test("rolls shelved and cancelled without done up to shelved", () => {
  assert.equal(deriveParentStatus(["shelved", "cancelled"]), "shelved")
})

test("keeps a parent in progress while any descendant is open", () => {
  assert.equal(deriveParentStatus(["shelved", "backlog"]), "in_progress")
})
