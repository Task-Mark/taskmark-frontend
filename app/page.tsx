import { redirect } from "next/navigation"

import { getMasterFoldersCookie } from "@/lib/taskmark/cookies"
import { loadWorkspace } from "@/lib/taskmark/workspace"

export default async function HomePage() {
  const masters = await getMasterFoldersCookie()
  const workspace = loadWorkspace(masters)
  if (workspace.projects.length > 0) {
    redirect("/board")
  }
  redirect("/setup")
}
