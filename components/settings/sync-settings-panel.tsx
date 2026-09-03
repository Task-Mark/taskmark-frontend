"use client"

import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@taskmark/components/ui/button"
import { Input } from "@taskmark/components/ui/input"

import { SITE } from "@/lib/site"

type SyncStatus = {
  configured: boolean
  source: "settings" | "environment" | null
  tokenHint: string | null
  message?: string
}

export function SyncSettingsPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/taskmark-sync-settings", {
          cache: "no-store",
        })
        const data = (await response.json()) as SyncStatus
        if (!active) return
        if (!response.ok) {
          setError(data.message ?? "Could not load sync settings.")
          return
        }
        setStatus(data)
      } catch {
        if (active) setError("Could not load sync settings.")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = token.trim()
    if (!value) {
      setError("Paste the sync token from Taskmark Cloud.")
      return
    }
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const response = await fetch("/api/taskmark-sync-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: value }),
      })
      const data = (await response.json()) as SyncStatus
      if (!response.ok) {
        setError(data.message ?? "Could not save sync settings.")
        return
      }
      setStatus(data)
      setToken("")
      setSuccess(
        "Token saved. Keep this local board running — Taskmark is starting cloud synchronization now. Markdown changes will keep syncing automatically.",
      )
    } catch {
      setError("Could not save sync settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded border-2 border-border bg-card p-6 shadow-md">
      <div>
        <h2 className="font-head text-xl">Connect this board to Taskmark Cloud</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Taskmark Cloud is the hosted board at{" "}
          <a
            href={SITE.cloudUrl}
            className="underline underline-offset-4 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            {SITE.cloudUrl.replace(/^https:\/\//, "")}
          </a>
          . After you save a project token here, this local board starts
          uploading markdown automatically. The token is stored in your user
          configuration, never in this project repository.
        </p>
      </div>

      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
        <li>
          Keep this local board running with <code>taskmark dev</code> or{" "}
          <code>taskmark serve</code>. Synchronization only starts while the
          local UI is open.
        </li>
        <li>
          In a browser, open{" "}
          <a
            href={SITE.cloudUrl}
            className="underline underline-offset-4 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            {SITE.cloudUrl}
          </a>{" "}
          and sign in.
        </li>
        <li>
          Use the project picker to select the Cloud project that should receive
          this board, or create a new project if one does not exist yet.
        </li>
        <li>
          Open <strong>Settings</strong> in Taskmark Cloud. Copy the{" "}
          <strong>board sync token</strong> (it starts with <code>tmk_</code>).
        </li>
        <li>
          Return to this page, paste the token below, and choose{" "}
          <strong>Save and start sync</strong>. You should see a confirmation
          here and sync logs in the terminal that started Taskmark.
        </li>
        <li>
          Go back to Taskmark Cloud and refresh the board. The first upload can
          take a few seconds. After that, local markdown edits keep the Cloud
          board up to date.
        </li>
      </ol>

      <div className="mt-6 rounded border-2 border-border bg-muted/40 p-4 text-sm">
        {loading ? (
          <span className="text-muted-foreground">Loading settings…</span>
        ) : status?.configured ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Sync is configured
              {status.tokenHint ? (
                <>
                  {" "}
                  <code className="font-mono">{status.tokenHint}</code>
                </>
              ) : null}
              . This board will keep pushing changes while Taskmark is running.
            </span>
            <span className="text-xs text-muted-foreground">
              {status.source === "environment"
                ? "Environment fallback"
                : "Saved in local Settings"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">
            Sync is not configured yet. Complete the steps above, then paste the
            token.
          </span>
        )}
      </div>

      <form className="mt-5 grid max-w-xl gap-3" onSubmit={save}>
        <label className="grid gap-1.5 text-sm font-medium">
          Project sync token from Taskmark Cloud
          <Input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="tmk_…"
            disabled={saving}
            aria-invalid={Boolean(error)}
          />
        </label>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-foreground" role="status">
            {success}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save and start sync"}
          </Button>
        </div>
      </form>
    </section>
  )
}
