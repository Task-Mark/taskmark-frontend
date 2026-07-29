"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

type MarkdownContentProps = {
  text: string
  className?: string
  /** Inline-only rendering (no block elements) for checklist labels. */
  inline?: boolean
}

const proseClassName = cn(
  "tm-md text-sm leading-relaxed text-foreground",
  "[&_p]:my-2",
  "[&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:font-head [&_h1]:text-lg [&_h1]:font-semibold",
  "[&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:font-head [&_h2]:text-base [&_h2]:font-semibold",
  "[&_h3]:mt-2.5 [&_h3]:mb-1.5 [&_h3]:font-head [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:font-head [&_h4]:text-sm [&_h4]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5 [&_li]:leading-relaxed",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border-2 [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-3 [&_hr]:border-border",
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-head",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5",
  "[&_strong]:font-semibold",
  "[&_em]:italic",
  "[&_del]:text-muted-foreground [&_del]:line-through",
  "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded"
)

/**
 * Render Taskmark markdown body sections (GFM: tables, strikethrough, task lists).
 */
export function MarkdownContent({
  text,
  className,
  inline = false,
}: MarkdownContentProps) {
  const trimmed = text.trim()
  if (!trimmed) {
    if (inline) return null
    return <p className="text-sm text-muted-foreground">None noted.</p>
  }

  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={
        inline
          ? {
              p: ({ children }) => <span>{children}</span>,
              h1: ({ children }) => (
                <span className="font-semibold">{children}</span>
              ),
              h2: ({ children }) => (
                <span className="font-semibold">{children}</span>
              ),
              h3: ({ children }) => (
                <span className="font-semibold">{children}</span>
              ),
              ul: ({ children }) => <span>{children}</span>,
              ol: ({ children }) => <span>{children}</span>,
              li: ({ children }) => <span>{children} </span>,
            }
          : undefined
      }
    >
      {trimmed}
    </ReactMarkdown>
  )

  if (inline) {
    return (
      <span className={cn("text-sm leading-relaxed text-foreground", className)}>
        {markdown}
      </span>
    )
  }

  return <div className={cn(proseClassName, className)}>{markdown}</div>
}
