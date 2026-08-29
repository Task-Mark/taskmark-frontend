import Link from "next/link"
import { redirect } from "next/navigation"

import { BrandLogo } from "@/components/brand-logo"
import { SetupWizard } from "@/components/setup/setup-wizard"
import { resolveAutoconfigWorkspace } from "@/lib/taskmark/autoconfig"
import { getMasterFoldersCookie } from "@/lib/taskmark/cookies"
import { isStaticRuntime } from "@/lib/taskmark/static-mode"
import { workspaceStartPath } from "@/lib/taskmark/workspace-mode"

type SetupPageProps = {
  searchParams?: Promise<{ mode?: string }>
}

// Depends on runtime env (workspace vs bound) and cookies — never prerender in
// server mode, or a build-time redirect gets baked in and loops against `/`.
// The static build rewrites this to force-static (see scripts/build-static.mjs).
export const dynamic = "force-dynamic"

export default async function SetupPage({ searchParams }: SetupPageProps) {
  if (isStaticRuntime()) {
    redirect("/")
  }

  const auto = resolveAutoconfigWorkspace()
  if (auto && auto.projects.length > 0) {
    // Zero-config bind — setup wizard is not needed.
    redirect("/")
  }

  const params = searchParams ? await searchParams : {}
  const masters = await getMasterFoldersCookie()
  const hasProjects = masters.length > 0
  const adding = params.mode === "add" && hasProjects
  // First run: offer the directory `taskmark` was launched from as the master.
  const suggestedPath = adding || hasProjects ? "" : workspaceStartPath()

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="tm-surface-glow pointer-events-none absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo
            width={96}
            height={109}
            className="mb-4 h-24 w-auto select-none"
          />
          <p className="font-head text-5xl tracking-tight text-foreground sm:text-6xl">
            Taskmark
          </p>
          <p className="mt-3 max-w-md text-base text-muted-foreground">
            {adding
              ? "Add another workspace folder. Existing projects stay in your list."
              : "Local boards. Clear backlog. Pick a workspace to begin."}
          </p>
        </div>
        <SetupWizard
          initialPath={suggestedPath}
          adding={adding}
          hasExistingProjects={hasProjects}
        />
        {adding ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="underline underline-offset-2">
              Cancel and return to board
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
