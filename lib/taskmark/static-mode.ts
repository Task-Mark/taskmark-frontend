/**
 * Static hosting mode (Vercel / `taskmark build`).
 * Build: TASKMARK_STATIC=1
 * Runtime (client + baked HTML): NEXT_PUBLIC_TASKMARK_STATIC=1
 */
export function isStaticBuild(): boolean {
  return process.env.TASKMARK_STATIC === "1"
}

export function isStaticRuntime(): boolean {
  return (
    process.env.NEXT_PUBLIC_TASKMARK_STATIC === "1" ||
    process.env.TASKMARK_STATIC === "1"
  )
}
