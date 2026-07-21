import Link from "next/link"
import { redirect } from "next/navigation"

import { switchMasterFolder } from "@/app/setup/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getMasterFolderCookie } from "@/lib/taskmark/cookies"
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

  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,_#fff_0%,_#f7f4ff_100%)] px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-head text-4xl tracking-tight">Taskmark</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {result.masterPath}
            </p>
          </div>
          <form action={switchMasterFolder}>
            <Button type="submit" variant="outline">
              Switch master folder
            </Button>
          </form>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-head text-xl">Projects</CardTitle>
            <CardDescription>
              Discovered Taskmark boards under this master folder. Epic list UI
              lands in S-002.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {result.projects.map((project) => (
                <li
                  key={project.boardPath}
                  className="rounded border-2 border-border bg-card px-3 py-3 shadow-sm"
                >
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {project.boardPath}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

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
