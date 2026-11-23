/**
 * Delivery stage of a task, read from the branch its commits have reached.
 *
 * - `development`: commits on a feature branch or on `develop`
 * - `testing`: commits on `quality`
 * - `production`: commits on `main`; only this stage counts as shipped
 *
 * The stage is written into task frontmatter (`stage`, `shipped_at`) by the
 * branch sync, never by hand. A task without commits has no stage.
 */

export const STAGES = ["development", "testing", "production"] as const
export type Stage = (typeof STAGES)[number]

export type StageCounts = Record<Stage | "none", number>

export function parseStage(value: unknown): Stage | null {
  if (typeof value !== "string") return null
  const v = value.trim().toLowerCase()
  if (v === "development" || v === "dev" || v === "develop") return "development"
  if (v === "testing" || v === "quality" || v === "qa" || v === "test") return "testing"
  if (v === "production" || v === "prod" || v === "main" || v === "shipped") return "production"
  return null
}

export function stageRank(stage: Stage | null): number {
  return stage ? STAGES.indexOf(stage) + 1 : 0
}

/** A parent is only as far along as its least advanced leaf. */
export function rollupStage(stages: (Stage | null)[]): Stage | null {
  if (stages.length === 0) return null
  let lowest: Stage | null = stages[0] ?? null
  for (const s of stages) {
    if (stageRank(s) < stageRank(lowest)) lowest = s
  }
  return lowest
}

export function emptyStageCounts(): StageCounts {
  return { none: 0, development: 0, testing: 0, production: 0 }
}

export function isShipped(stage: Stage | null): boolean {
  return stage === "production"
}
