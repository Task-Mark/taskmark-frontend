import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_LIST_FILTER_STATE,
  isCompletedStatus,
  passesHideCompleted,
} from "./list-filters"

test("filters start with completed work hidden", () => {
  assert.equal(DEFAULT_LIST_FILTER_STATE.hideCompleted, true)
})

test("treats shelved as completed", () => {
  assert.equal(isCompletedStatus("shelved"), true)
  assert.equal(passesHideCompleted(true, "shelved"), false)
})

test("uses terminal child progress when filtering parents", () => {
  assert.equal(
    passesHideCompleted(true, "shelved", { done: 2, total: 2 }),
    false
  )
  assert.equal(
    passesHideCompleted(true, "shelved", { done: 1, total: 2 }),
    true
  )
})
