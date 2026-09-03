import Link from "next/link"

import { AppBar } from "@taskmark/components/board"
import { buttonVariants } from "@taskmark/components/ui/button"

import { SyncSettingsPanel } from "@/components/settings/sync-settings-panel"
import { SITE } from "@/lib/site"
import { isStaticRuntime } from "@/lib/taskmark/static-mode"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
  const staticRuntime = isStaticRuntime()
  return (
    <div className="tm-surface min-h-svh">
      <AppBar title="Taskmark Settings" tagline="Local project configuration">
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to board
        </Link>
      </AppBar>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {staticRuntime ? (
          <section className="rounded border-2 border-border bg-card p-6 shadow-md">
            <h2 className="font-head text-xl">Local Settings unavailable</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              This is a static export, so it cannot save a Cloud token. On the
              machine that owns this board, run <code>taskmark dev</code> or{" "}
              <code>taskmark serve</code>, open Settings in that local UI, then
              paste the token from{" "}
              <a
                href={SITE.cloudUrl}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {SITE.cloudUrl.replace(/^https:\/\//, "")}
              </a>
              .
            </p>
          </section>
        ) : (
          <SyncSettingsPanel />
        )}
      </main>
    </div>
  )
}
