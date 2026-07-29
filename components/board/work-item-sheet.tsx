"use client"

import * as React from "react"
import { ArrowLeftIcon, EyeIcon, XIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { WorkItemDetailBody, WorkItemDetailHeaderBadges } from "@/components/board/work-item-detail-body"
import { TypeBadge } from "@/components/board/status-badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  WorkItemDetail,
  WorkItemDetailResult,
  WorkItemMeta,
  WorkItemRef,
} from "@/lib/taskmark/detail-types"
import {
  loadWorkItemDetailFromSnapshot,
  resolveWorkItemByIdFromSnapshot,
} from "@/lib/taskmark/snapshot-client"

const isStatic =
  process.env.NEXT_PUBLIC_TASKMARK_STATIC === "1" ||
  process.env.TASKMARK_STATIC === "1"

async function loadWorkItemDetail(
  filePath: string,
  hint?: "epic" | "story" | "item"
): Promise<WorkItemDetailResult> {
  if (isStatic) {
    return loadWorkItemDetailFromSnapshot(filePath)
  }
  const actions = await import("@/app/board/actions")
  return actions.loadWorkItemDetail(filePath, hint) as Promise<WorkItemDetailResult>
}

async function resolveWorkItemById(
  itemId: string,
  options?: { withinFilePath?: string | null }
): Promise<
  | { ok: true; ref: WorkItemRef }
  | { ok: false; itemId: string; message: string }
> {
  if (isStatic) {
    return resolveWorkItemByIdFromSnapshot(itemId)
  }
  const actions = await import("@/app/board/actions")
  return actions.resolveWorkItemById(itemId, options) as Promise<
    | { ok: true; ref: WorkItemRef }
    | { ok: false; itemId: string; message: string }
  >
}

type LoadState =
  | { status: "idle" }
  | { status: "loading"; ref: WorkItemRef }
  | { status: "ready"; ref: WorkItemRef; detail: WorkItemDetail }
  | { status: "error"; ref: WorkItemRef; message: string; filePath: string }

type OpenDetailOptions = {
  /** Default `push` so Back restores the previous detail / list URL. */
  history?: "push" | "replace"
  /**
   * Scope id lookup to the board containing this file.
   * Defaults to the currently open item’s file (avoids cross-project id hits).
   */
  withinFilePath?: string | null
}

type SheetHistoryEntry = {
  id: string
  title: string
}

type WorkItemSheetContextValue = {
  openDetail: (ref: WorkItemRef, options?: OpenDetailOptions) => void
  openDetailById: (itemId: string, options?: OpenDetailOptions) => void
}

const WorkItemSheetContext = React.createContext<WorkItemSheetContextValue | null>(
  null
)

const DETAIL_ITEM_PARAM = "item"

export function useWorkItemSheet(): WorkItemSheetContextValue {
  const ctx = React.useContext(WorkItemSheetContext)
  if (!ctx) {
    throw new Error("useWorkItemSheet must be used within WorkItemSheetProvider")
  }
  return ctx
}

/** Epic → story → leaf (or epic → epic-direct leaf). */
export function hierarchyIdsForDetail(
  detail: Pick<WorkItemMeta, "id" | "type" | "parent" | "epic">
): string[] {
  const id = detail.id.trim()
  if (!id) return []
  if (detail.type === "epic") return [id]

  const epic = (detail.epic || "").trim()
  const parent = (detail.parent || "").trim()
  const crumbs: string[] = []

  if (epic) crumbs.push(epic)
  else if (parent.startsWith("E-")) crumbs.push(parent)

  if (detail.type === "story") {
    if (!crumbs.includes(id)) crumbs.push(id)
    return crumbs
  }

  // task / bug: insert story parent when it differs from epic
  if (parent && parent !== epic && parent !== id && !crumbs.includes(parent)) {
    crumbs.push(parent)
  }
  if (!crumbs.includes(id)) crumbs.push(id)
  return crumbs
}

/** Immediate parent id for hierarchy navigation (null for epics). */
export function parentIdForDetail(
  detail: Pick<WorkItemMeta, "id" | "type" | "parent" | "epic">
): string | null {
  if (detail.type === "epic") return null
  const id = detail.id.trim()
  const parent = (detail.parent || "").trim()
  if (parent && parent !== id) return parent
  const epic = (detail.epic || "").trim()
  if (epic && epic !== id) return epic
  return null
}

function buildBoardUrl(
  pathname: string,
  searchParams: URLSearchParams,
  itemId: string | null
): string {
  const params = new URLSearchParams(searchParams.toString())
  if (itemId) params.set(DETAIL_ITEM_PARAM, itemId)
  else params.delete(DETAIL_ITEM_PARAM)
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

function placeholderRef(id: string): WorkItemRef {
  return {
    kind: id.startsWith("E-")
      ? "epic"
      : id.startsWith("S-")
        ? "story"
        : "item",
    id,
    title: id,
    filePath: "",
    itemType: id.startsWith("B-")
      ? "bug"
      : id.startsWith("T-")
        ? "task"
        : undefined,
  }
}

function currentSheetEntry(state: LoadState): SheetHistoryEntry | null {
  if (state.status === "idle") return null
  if (state.status === "ready") {
    return { id: state.detail.id, title: state.detail.title }
  }
  return { id: state.ref.id, title: state.ref.title || state.ref.id }
}

function DetailHierarchyBreadcrumb({
  crumbs,
  onNavigate,
}: {
  crumbs: string[]
  onNavigate: (id: string) => void
}) {
  if (crumbs.length === 0) return null
  return (
    <Breadcrumb>
      <BreadcrumbList className="font-mono text-xs gap-1">
        {crumbs.map((id, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <React.Fragment key={`${id}-${index}`}>
              {index > 0 ? (
                <BreadcrumbSeparator className="[&>svg]:size-3" />
              ) : null}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-mono text-xs">
                    {id}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="font-mono text-xs"
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate(id)
                    }}
                  >
                    {id}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function WorkItemSheetProviderInner({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const itemId = searchParams.get(DETAIL_ITEM_PARAM)?.trim() || null

  const [open, setOpen] = React.useState(false)
  const [state, setState] = React.useState<LoadState>({ status: "idle" })
  const [sheetHistory, setSheetHistory] = React.useState<SheetHistoryEntry[]>(
    []
  )
  const requestId = React.useRef(0)
  /** Id currently shown / loading (skip re-fetch when URL matches). */
  const activeItemId = React.useRef<string | null>(null)
  /** Board file for the open item — scopes parent/breadcrumb id resolution. */
  const scopeFilePathRef = React.useRef<string | null>(null)
  /** Skip writing URL when reacting to URL (back/forward / shared link). */
  const syncingFromUrl = React.useRef(false)
  const stateRef = React.useRef(state)
  stateRef.current = state
  const openRef = React.useRef(open)
  openRef.current = open

  React.useEffect(() => {
    if (state.status === "ready" && state.detail.filePath) {
      scopeFilePathRef.current = state.detail.filePath
    } else if (
      (state.status === "loading" || state.status === "error") &&
      state.ref.filePath
    ) {
      scopeFilePathRef.current = state.ref.filePath
    } else if (state.status === "idle") {
      scopeFilePathRef.current = null
    }
  }, [state])
  const writeItemUrl = React.useCallback(
    (nextItemId: string | null, history: "push" | "replace") => {
      const current = searchParams.get(DETAIL_ITEM_PARAM)?.trim() || null
      if (current === nextItemId) return
      const url = buildBoardUrl(pathname, searchParams, nextItemId)
      if (history === "replace") router.replace(url, { scroll: false })
      else router.push(url, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const rememberCurrentForBack = React.useCallback(
    (nextId: string, history: "push" | "replace") => {
      if (history !== "push") return
      if (syncingFromUrl.current) return
      if (!openRef.current) return
      const current = currentSheetEntry(stateRef.current)
      if (!current || current.id === nextId) return
      setSheetHistory((stack) => [...stack, current])
    },
    []
  )

  const loadFromRef = React.useCallback((ref: WorkItemRef, req: number) => {
    activeItemId.current = ref.id
    if (ref.filePath) scopeFilePathRef.current = ref.filePath
    setOpen(true)
    setState({ status: "loading", ref })
    void loadWorkItemDetail(ref.filePath, ref.kind).then((result) => {
      if (req !== requestId.current) return
      if (result.ok) {
        scopeFilePathRef.current = result.detail.filePath || ref.filePath
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

  const openDetail = React.useCallback(
    (ref: WorkItemRef, options?: OpenDetailOptions) => {
      const history = options?.history ?? "push"
      rememberCurrentForBack(ref.id, history)
      const req = ++requestId.current
      loadFromRef(ref, req)
      if (!syncingFromUrl.current) {
        writeItemUrl(ref.id, history)
      }
    },
    [loadFromRef, rememberCurrentForBack, writeItemUrl]
  )

  const openDetailById = React.useCallback(
    (rawId: string, options?: OpenDetailOptions) => {
      const id = rawId.trim()
      if (!id) return
      const history = options?.history ?? "push"
      const withinFilePath =
        options?.withinFilePath?.trim() ||
        scopeFilePathRef.current ||
        null
      rememberCurrentForBack(id, history)
      const placeholder = placeholderRef(id)
      const req = ++requestId.current
      activeItemId.current = id
      setOpen(true)
      setState({ status: "loading", ref: placeholder })
      if (!syncingFromUrl.current) {
        writeItemUrl(id, history)
      }
      void resolveWorkItemById(id, { withinFilePath }).then((resolved) => {
        if (req !== requestId.current) return
        if (!resolved.ok) {
          setState({
            status: "error",
            ref: placeholder,
            message: resolved.message,
            filePath: "",
          })
          return
        }
        loadFromRef(resolved.ref, req)
      })
    },
    [loadFromRef, rememberCurrentForBack, writeItemUrl]
  )

  const clearSheet = React.useCallback(() => {
    requestId.current += 1
    activeItemId.current = null
    scopeFilePathRef.current = null
    setOpen(false)
    setState({ status: "idle" })
    setSheetHistory([])
  }, [])

  // Hydrate / react to URL (shared links, back/forward, close).
  React.useEffect(() => {
    if (!itemId) {
      if (activeItemId.current != null) {
        clearSheet()
      }
      return
    }
    if (activeItemId.current === itemId) return

    // Browser back/forward landed on a prior detail — align stack.
    setSheetHistory((stack) => {
      if (stack.length > 0 && stack[stack.length - 1]?.id === itemId) {
        return stack.slice(0, -1)
      }
      return stack
    })

    syncingFromUrl.current = true
    openDetailById(itemId, { history: "replace" })
    queueMicrotask(() => {
      syncingFromUrl.current = false
    })
  }, [itemId, openDetailById, clearSheet])

  const onOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true)
      return
    }
    clearSheet()
    writeItemUrl(null, "replace")
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

  const hierarchyCrumbs =
    state.status === "ready"
      ? hierarchyIdsForDetail(state.detail)
      : state.status === "loading" || state.status === "error"
        ? [state.ref.id]
        : []

  const parentId =
    state.status === "ready"
      ? parentIdForDetail(state.detail)
      : hierarchyCrumbs.length > 1
        ? hierarchyCrumbs[hierarchyCrumbs.length - 2]!
        : null

  const [parentTitle, setParentTitle] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!parentId) {
      setParentTitle(null)
      return
    }
    let cancelled = false
    setParentTitle(null)
    void resolveWorkItemById(parentId, {
      withinFilePath: scopeFilePathRef.current,
    }).then((resolved) => {
      if (cancelled) return
      if (resolved.ok) {
        setParentTitle(resolved.ref.title || null)
      } else {
        setParentTitle(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [parentId])

  const parentTooltip =
    parentTitle && parentTitle !== parentId
      ? `${parentId} · ${parentTitle}`
      : parentId
        ? `Go to ${parentId}`
        : ""

  return (
    <WorkItemSheetContext.Provider value={{ openDetail, openDetailById }}>
      {children}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-4xl data-[side=right]:lg:max-w-5xl data-[side=right]:xl:max-w-6xl"
          showCloseButton={false}
        >
          <div className="flex shrink-0 items-center justify-between px-3 pt-3">
            <TooltipProvider delay={200}>
              {parentId ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          parentTitle
                            ? `Go to ${parentId}: ${parentTitle}`
                            : `Go to parent ${parentId}`
                        }
                        onClick={() => openDetailById(parentId)}
                      />
                    }
                  >
                    <ArrowLeftIcon />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{parentTooltip}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="invisible pointer-events-none"
                  tabIndex={-1}
                  aria-hidden
                >
                  <ArrowLeftIcon />
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close"
                      onClick={() => onOpenChange(false)}
                    />
                  }
                >
                  <XIcon />
                </TooltipTrigger>
                <TooltipContent side="bottom">Close</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <SheetHeader className="w-full border-b-2 border-border pt-2">
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
              <DetailHierarchyBreadcrumb
                crumbs={hierarchyCrumbs}
                onNavigate={(id) => openDetailById(id)}
              />
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
            <SheetTitle className="w-full text-left text-lg leading-snug">
              {titleText}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Read-only detail view for {titleId}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-4">
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
                className="w-full rounded border-2 border-destructive/40 bg-destructive/10 px-3 py-3 text-sm"
              >
                <p className="font-medium text-destructive">
                  Could not load {state.ref.id}
                </p>
                <p className="mt-1 text-muted-foreground">{state.message}</p>
                {state.filePath ? (
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                    {state.filePath}
                  </p>
                ) : null}
              </div>
            ) : null}

            {state.status === "ready" ? (
              <div className="w-full min-w-0">
                <WorkItemDetailBody detail={state.detail} />
              </div>
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

export function WorkItemSheetProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <React.Suspense fallback={children}>
      <WorkItemSheetProviderInner>{children}</WorkItemSheetProviderInner>
    </React.Suspense>
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
