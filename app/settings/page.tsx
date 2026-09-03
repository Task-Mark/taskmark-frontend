import Link from "next/link"

import { AppBar } from "@taskmark/components/board"
import { buttonVariants } from "@taskmark/components/ui/button"

import { SyncSettingsPanel } from "@/components/settings/sync-settings-panel"
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
            <p className="mt-2 text-sm text-muted-foreground">
              Cloud synchronization can only be configured while running{" "}
              <code>taskmark dev</code> or <code>taskmark serve</code> on the
              local project.
            </p>
          </section>
        ) : (
          <SyncSettingsPanel />
        )}
      </main>
    </div>
  )
}
