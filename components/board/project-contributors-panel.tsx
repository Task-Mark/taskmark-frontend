"use client"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ContributorIdentity } from "@/lib/taskmark/identity"
import { identityBackgroundColor } from "@/lib/taskmark/identity"

type ProjectContributorsPanelProps = {
  contributors: ContributorIdentity[]
  className?: string
}

export function ProjectContributorsPanel({
  contributors,
  className,
}: ProjectContributorsPanelProps) {
  if (contributors.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No contributors yet.
      </p>
    )
  }

  return (
    <TooltipProvider delay={200}>
      <ul
        className={cn(
          "grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3",
          className
        )}
        aria-label="Project contributors"
      >
        {contributors.map((person) => {
          const name = person.name || "Unknown"
          const label = person.email ? `${name} · ${person.email}` : name
          const backgroundColor = identityBackgroundColor(person)
          return (
            <li
              key={`${person.email}|${person.name}`}
              className="flex min-w-0 items-center gap-2.5"
            >
              <Tooltip>
                <TooltipTrigger
                  render={<span className="inline-flex shrink-0 cursor-default" />}
                  aria-label={label}
                >
                  <Avatar size="default">
                    <AvatarFallback
                      className={cn(
                        "bg-transparent font-semibold tracking-wide text-white !text-[7px]"
                      )}
                      style={{ backgroundColor }}
                    >
                      {person.initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top">{label}</TooltipContent>
              </Tooltip>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {name}
                </p>
                {person.email ? (
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {person.email}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </TooltipProvider>
  )
}
