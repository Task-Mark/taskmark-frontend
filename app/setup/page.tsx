import Link from "next/link"

import { SetupWizard } from "@/components/setup/setup-wizard"
import { getMasterFoldersCookie } from "@/lib/taskmark/cookies"

type SetupPageProps = {
  searchParams?: Promise<{ mode?: string }>
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = searchParams ? await searchParams : {}
  const masters = await getMasterFoldersCookie()
  const hasProjects = masters.length > 0
  const adding = params.mode === "add" && hasProjects

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#eadffe_0%,_transparent_55%),_linear-gradient(180deg,_#fff_0%,_#f7f4ff_100%)]"
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8">
        <div className="text-center">
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
          initialPath=""
          adding={adding}
          hasExistingProjects={hasProjects}
        />
        {adding ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/board" className="underline underline-offset-2">
              Cancel and return to board
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
