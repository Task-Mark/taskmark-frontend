"use client"

import * as React from "react"
import { EyeIcon } from "lucide-react"

import { loadWorkItemDetail } from "@/app/board/actions"
import { WorkItemDetailBody, WorkItemDetailHeaderBadges } from "@/components/board/work-item-detail-body"
import { TypeBadge } from "@/components/board/status-badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type {
  WorkItemDetail,
  WorkItemRef,
} from "@/lib/taskmark/detail-types"

type LoadState =
  | { status: "idle" }
  | { status: "loading"; ref: WorkItemRef }
  | { status: "ready"; ref: WorkItemRef; detail: WorkItemDetail }
  | { status: "error"; ref: WorkItemRef; message: string; filePath: string }

type WorkItemSheetContextValue = {
  openDetail: (ref: WorkItemRef) => void
}

const WorkItemSheetContext = React.createContext<WorkItemSheetContextValue | null>(
  null
)

export function useWorkItemSheet(): WorkItemSheetContextValue {
  const ctx = React.useContext(WorkItemSheetContext)
  if (!ctx) {
    throw new Error("useWorkItemSheet must be used within WorkItemSheetProvider")
  }
  return ctx
}

export function WorkItemSheetProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [state, setState] = React.useState<LoadState>({ status: "idle" })
  const requestId = React.useRef(0)

  const openDetail = React.useCallback((ref: WorkItemRef) => {
    const id = ++requestId.current
    setOpen(true)
    setState({ status: "loading", ref })
    void loadWorkItemDetail(ref.filePath, ref.kind).then((result) => {
      if (id !== requestId.current) return
      if (result.ok) {
        setState({ status: "ready", ref, detail: result.detail })
      } else {
        setState({
          status: "error",
          ref,
          message: result.message,
          filePath: result.filePath,
        })
      }
    })
  }, [])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      requestId.current += 1
      setState({ status: "idle" })
    }
  }

  const titleId =
    state.status === "loading" || state.status === "ready" || state.status === "error"
      ? state.ref.id
      : "Work item"
  const titleText =
    state.status === "ready"
      ? state.detail.title
      : state.status === "loading" || state.status === "error"
        ? state.ref.title
        : "Work item detail"

  return (
    <WorkItemSheetContext.Provider value={{ openDetail }}>
      {children}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton
        >
          <SheetHeader className="border-b-2 border-border pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {titleId}
              </span>
              {state.status === "ready" ? (
                <WorkItemDetailHeaderBadges detail={state.detail} />
              ) : state.status === "loading" || state.status === "error" ? (
                <TypeBadge
                  type={
                    state.ref.itemType ??
                    (state.ref.kind === "item" ? "task" : state.ref.kind)
                  }
                />
              ) : null}
            </div>
            <SheetTitle className="text-left text-lg leading-snug">
              {titleText}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Read-only detail view for {titleId}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {state.status === "loading" ? (
              <div
                role="status"
                className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground"
              >
                <Spinner className="size-6" />
                Loading {state.ref.id}…
              </div>
            ) : null}

            {state.status === "error" ? (
              <div
                role="alert"
                className="rounded border-2 border-destructive/40 bg-destructive/10 px-3 py-3 text-sm"
              >
                <p className="font-medium text-destructive">
                  Could not load {state.ref.id}
                </p>
                <p className="mt-1 text-muted-foreground">{state.message}</p>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {state.filePath}
                </p>
              </div>
            ) : null}

            {state.status === "ready" ? (
              <WorkItemDetailBody detail={state.detail} />
            ) : null}

            {state.status === "idle" ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Select a work item to view its details.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </WorkItemSheetContext.Provider>
  )
}

export function ViewWorkItemButton({
  itemRef,
  label,
}: {
  itemRef: WorkItemRef
  label?: string
}) {
  const { openDetail } = useWorkItemSheet()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      aria-label={label ?? `View ${itemRef.id}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openDetail(itemRef)
      }}
    >
      <EyeIcon />
    </Button>
  )
}
