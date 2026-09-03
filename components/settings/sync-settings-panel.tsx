"use client"

import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@taskmark/components/ui/button"
import { Input } from "@taskmark/components/ui/input"

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
      setSuccess("Token saved. Cloud synchronization is starting.")
    } catch {
      setError("Could not save sync settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded border-2 border-border bg-card p-6 shadow-md">
      <div>
        <h2 className="font-head text-xl">Cloud synchronization</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Copy this project&apos;s sync token from Taskmark Cloud Settings and
          paste it below. Taskmark stores it in your user configuration, never
          in this project repository.
        </p>
      </div>

      <div className="mt-5 rounded border-2 border-border bg-muted/40 p-4 text-sm">
        {loading ? (
          <span className="text-muted-foreground">Loading settings…</span>
        ) : status?.configured ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Sync configured{" "}
              {status.tokenHint ? (
                <code className="font-mono">{status.tokenHint}</code>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {status.source === "environment"
                ? "Environment fallback"
                : "Local Settings"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sync is not configured.</span>
        )}
      </div>

      <form className="mt-5 grid max-w-xl gap-3" onSubmit={save}>
        <label className="grid gap-1.5 text-sm font-medium">
          Project sync token
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
