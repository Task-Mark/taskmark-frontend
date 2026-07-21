import { redirect } from "next/navigation"

import { getMasterFolderCookie } from "@/lib/taskmark/cookies"
import { validateMasterFolder } from "@/lib/taskmark/validate"

export default async function HomePage() {
  const master = await getMasterFolderCookie()
  if (master) {
    const result = validateMasterFolder(master)
    if (result.ok) {
      redirect("/board")
    }
  }
  redirect("/setup")
}
