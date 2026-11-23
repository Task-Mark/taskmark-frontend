import { execFileSync } from "node:child_process"

import { deriveInitials, type ContributorIdentity } from "@/lib/taskmark/identity"

function gitConfig(cwd: string, key: string): string {
  try {
    return execFileSync("git", ["config", "--get", key], {
      cwd,
      encoding: "utf8",
      timeout: 2000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

const cache = new Map<string, ContributorIdentity | null>()

/**
 * The person running the local board, from git `user.name` / `user.email`
 * as seen from the board folder. Null when git or the name is missing.
 */
export function readGitUser(cwd: string): ContributorIdentity | null {
  if (cache.has(cwd)) return cache.get(cwd) ?? null
  const name = gitConfig(cwd, "user.name")
  const email = gitConfig(cwd, "user.email")
  const user = name || email
    ? { name: name || email, email, initials: deriveInitials(name || email) }
    : null
  cache.set(cwd, user)
  return user
}
