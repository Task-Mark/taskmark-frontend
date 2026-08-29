"use client"

import { useEffect, useId, useState } from "react"

function pageIsDark(): boolean {
  if (typeof document === "undefined") return false
  return Boolean(
    document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark")
  )
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId().replace(/:/g, "")
  const [dark, setDark] = useState(false)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const syncDark = () => setDark(pageIsDark())
    syncDark()
    const observer = new MutationObserver(syncDark)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "neutral",
        })
        const { svg: rendered } = await mermaid.render(
          `tm-mermaid-${reactId}-${dark ? "d" : "l"}`,
          chart
        )
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setSvg(null)
          setError(
            cause instanceof Error ? cause.message : "Could not render diagram"
          )
        }
      }
    }

    void renderChart()
    return () => {
      cancelled = true
    }
  }, [chart, reactId, dark])

  if (error) {
    return (
      <div className="my-2 rounded border-2 border-border bg-muted p-3">
        <p className="text-xs text-destructive">{error}</p>
        <pre className="mt-2 overflow-x-auto font-mono text-xs">{chart}</pre>
      </div>
    )
  }

  if (!svg) {
    return <p className="text-sm text-muted-foreground">Rendering diagram…</p>
  }

  return (
    <div
      className="tm-mermaid my-2 max-w-full overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
