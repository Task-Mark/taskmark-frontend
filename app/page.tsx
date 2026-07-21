import { redirect } from "next/navigation"

import { getMasterFoldersCookie } from "@/lib/taskmark/cookies"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"

export default async function HomePage() {
  const masters = await getMasterFoldersCookie()
  if (masters.length > 0) {
    const workspace = loadConfiguredWorkspace(masters)
    if (workspace.projects.length > 0) {
      redirect("/board")
    }
  }
  redirect("/setup")
}
