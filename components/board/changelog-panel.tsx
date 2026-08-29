"use client"

import { MarkdownContent } from "@/components/board/markdown-content"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ChangelogPanel({ markdown }: { markdown: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Changelog</CardTitle>
        <CardDescription>
          Board-root CHANGELOG.md (Keep a Changelog)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MarkdownContent text={markdown} />
      </CardContent>
    </Card>
  )
}
