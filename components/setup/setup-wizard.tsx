"use client"

import { useActionState, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  previewMasterFolder,
  saveMasterFolder,
  type PreviewMasterFolderState,
  type SaveMasterFolderState,
} from "@/app/setup/actions"

const initialPreview: PreviewMasterFolderState = {}
const initialSave: SaveMasterFolderState = {}

type SetupWizardProps = {
  initialPath?: string
  switching?: boolean
}

export function SetupWizard({
  initialPath = "",
  switching = false,
}: SetupWizardProps) {
  const [path, setPath] = useState(initialPath)
  const [preview, previewAction, previewPending] = useActionState(
    previewMasterFolder,
    initialPreview
  )
  const [saveState, saveAction, savePending] = useActionState(
    saveMasterFolder,
    initialSave
  )

  useEffect(() => {
    if (preview.masterPath) {
      setPath(preview.masterPath)
    }
  }, [preview.masterPath])

  const error = saveState.error ?? preview.error
  const projects = preview.projects
  const canContinue = path.trim().length > 0

  return (
    <Card className="w-full max-w-xl border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="font-head text-2xl tracking-tight">
          {switching ? "Switch master folder" : "Set up your workspace"}
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          Choose a master folder. Taskmark will look inside its subfolders for
          projects that contain a <code className="font-mono text-sm">taskmark/</code>{" "}
          board.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <form action={previewAction} className="flex flex-col gap-3">
          <label htmlFor="masterPath" className="text-sm font-medium">
            Master folder path
          </label>
          <input
            id="masterPath"
            name="masterPath"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/Projects/my-workspace"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded border-2 border-border bg-input px-3 py-2 font-mono text-sm shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline" disabled={previewPending || !path.trim()}>
              {previewPending ? "Scanning…" : "Find projects"}
            </Button>
          </div>
        </form>

        {error ? (
          <p
            role="alert"
            className="rounded border-2 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {projects && projects.length > 0 ? (
          <div className="rounded border-2 border-border bg-muted/40 px-3 py-3">
            <p className="mb-2 text-sm font-medium">
              Found {projects.length} Taskmark project
              {projects.length === 1 ? "" : "s"}
            </p>
            <ul className="flex flex-col gap-2">
              {projects.map((project) => (
                <li
                  key={project.boardPath}
                  className="font-mono text-xs leading-relaxed text-muted-foreground"
                >
                  <span className="font-sans text-sm font-medium text-foreground">
                    {project.name}
                  </span>
                  <br />
                  {project.projectPath}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <form action={saveAction}>
          <input type="hidden" name="masterPath" value={path} />
          <Button
            type="submit"
            disabled={!canContinue || savePending}
            size="lg"
          >
            {savePending ? "Saving…" : "Continue"}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
