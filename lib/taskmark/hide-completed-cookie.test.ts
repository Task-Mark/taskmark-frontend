import assert from "node:assert/strict"
import test from "node:test"

import { HIDE_COMPLETED_DEFAULT } from "./constants"
import { parseHideCompletedCookieValue } from "./hide-completed-cookie"

test("hides completed work when no preference was ever saved", () => {
  assert.equal(HIDE_COMPLETED_DEFAULT, true)
  assert.equal(parseHideCompletedCookieValue(undefined), true)
  assert.equal(parseHideCompletedCookieValue(null), true)
  assert.equal(parseHideCompletedCookieValue(""), true)
})

test("only an explicit opt-out shows completed work again", () => {
  assert.equal(parseHideCompletedCookieValue("0"), false)
  assert.equal(parseHideCompletedCookieValue("false"), false)
  assert.equal(parseHideCompletedCookieValue("1"), true)
  assert.equal(parseHideCompletedCookieValue("true"), true)
})
