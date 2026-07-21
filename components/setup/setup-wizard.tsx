"use client"

import { useActionState, useEffect, useState, useTransition } from "react"

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
  pickMasterFolder,
  previewMasterFolder,
  saveMasterFolder,
  type PreviewMasterFolderState,
  type SaveMasterFolderState,
} from "@/app/setup/actions"

const initialPreview: PreviewMasterFolderState = {}
const initialSave: SaveMasterFolderState = {}

type SetupWizardProps = {
  initialPath?: string
  adding?: boolean
  hasExistingProjects?: boolean
}

export function SetupWizard({
  initialPath = "",
  adding = false,
  hasExistingProjects = false,
}: SetupWizardProps) {
  const [path, setPath] = useState(initialPath)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [picking, startPick] = useTransition()
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

  function handleBrowse() {
    setPickerError(null)
    startPick(async () => {
      const result = await pickMasterFolder()
      if (result.error) {
        setPickerError(result.error)
        return
      }
      if (result.path) {
        setPath(result.path)
      }
    })
  }

  const error = saveState.error ?? preview.error ?? pickerError ?? undefined
  const projects = preview.projects
  const canContinue = path.trim().length > 0
  const busy = previewPending || savePending || picking

  return (
    <Card className="w-full max-w-xl border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="font-head text-2xl tracking-tight">
          {adding ? "Add a project workspace" : "Set up your workspace"}
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {adding ? (
            "Choose another master folder. Newly found boards are added to your project list; existing ones stay."
          ) : (
            <>
              Choose a master folder. Taskmark will look inside its subfolders
              for nested{" "}
              <code className="font-mono text-sm">taskmark/</code> boards or
              dedicated{" "}
              <code className="font-mono text-sm">*-taskmark</code> project
              folders.
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <form action={previewAction} className="flex flex-col gap-3">
          <label htmlFor="masterPath" className="text-sm font-medium">
            Master folder path
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              id="masterPath"
              name="masterPath"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/you/Projects/my-workspace"
              autoComplete="off"
              spellCheck={false}
              className="w-full min-w-0 flex-1 rounded border-2 border-border bg-input px-3 py-2 font-mono text-sm shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={handleBrowse}
              className="shrink-0 sm:self-stretch"
            >
              {picking ? "Opening…" : "Browse…"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="outline"
              disabled={busy || !path.trim()}
            >
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
              {hasExistingProjects ? " to add" : ""}
            </p>
            <ul className="flex flex-col gap-2">
              {projects.map((project) => (
                <li
                  key={project.id}
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
          <Button type="submit" disabled={!canContinue || busy} size="lg">
            {savePending
              ? "Saving…"
              : adding
                ? "Add to project list"
                : "Continue"}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
