import assert from "node:assert/strict"
import test from "node:test"

import {
  parseThemePreference,
  themeCookieDomain,
} from "./theme-cookie"

test("accepts only light or dark cookie values", () => {
  assert.equal(parseThemePreference("light"), "light")
  assert.equal(parseThemePreference("dark"), "dark")
  assert.equal(parseThemePreference("system"), undefined)
  assert.equal(parseThemePreference(""), undefined)
  assert.equal(parseThemePreference(undefined), undefined)
})

test("uses the parent domain on hosted Taskmark hosts", () => {
  assert.equal(themeCookieDomain("taskmark.dev"), ".taskmark.dev")
  assert.equal(themeCookieDomain("board.taskmark.dev"), ".taskmark.dev")
  assert.equal(themeCookieDomain("www.taskmark.dev"), ".taskmark.dev")
})

test("omits Domain on localhost and unrelated hosts", () => {
  assert.equal(themeCookieDomain("localhost"), undefined)
  assert.equal(themeCookieDomain("127.0.0.1"), undefined)
  assert.equal(themeCookieDomain("example.com"), undefined)
})
