import Link from "next/link"
import { redirect } from "next/navigation"

import { switchMasterFolder } from "@/app/setup/actions"
import { EpicList } from "@/components/board/epic-list"
import { Button } from "@/components/ui/button"
import { getMasterFolderCookie } from "@/lib/taskmark/cookies"
import { parseEpicsForProjects } from "@/lib/taskmark/parse-epics"
import { validateMasterFolder } from "@/lib/taskmark/validate"

export default async function BoardPage() {
  const master = await getMasterFolderCookie()
  if (!master) {
    redirect("/setup")
  }

  const result = validateMasterFolder(master)
  if (!result.ok) {
    redirect("/setup")
  }

  const lists = parseEpicsForProjects(result.projects)
  const epicCount = lists.reduce((sum, list) => sum + list.epics.length, 0)
  const errorCount = lists.reduce((sum, list) => sum + list.errors.length, 0)

  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,_#fff_0%,_#f7f4ff_100%)] px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-head text-4xl tracking-tight">Taskmark</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {result.masterPath}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.projects.length} project
              {result.projects.length === 1 ? "" : "s"} · {epicCount} epic
              {epicCount === 1 ? "" : "s"}
              {errorCount > 0
                ? ` · ${errorCount} parse issue${errorCount === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
          <form action={switchMasterFolder}>
            <Button type="submit" variant="outline">
              Switch master folder
            </Button>
          </form>
        </header>

        <EpicList lists={lists} />

        <p className="text-sm text-muted-foreground">
          Need to change workspace?{" "}
          <Link href="/setup" className="underline underline-offset-2">
            Open setup
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
