"use client"

import type { ReactNode } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type {
  AttributionAvatar,
  AttributionRole,
  ContributorIdentity,
} from "@/lib/taskmark/identity"
import {
  buildAttributionAvatars,
  identityBackgroundColor,
} from "@/lib/taskmark/identity"

function ContributorAvatar({
  identity,
  label,
  className,
  size = "sm",
}: {
  identity: ContributorIdentity
  label: string
  className?: string
  size?: "default" | "sm" | "lg"
}) {
  const backgroundColor = identityBackgroundColor(identity)
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="inline-flex cursor-default" />}
        aria-label={label}
      >
        <Avatar size={size} className={className}>
          <AvatarFallback
            className={cn(
              "bg-transparent font-semibold tracking-wide text-white !text-[7px]"
            )}
            style={{ backgroundColor }}
          >
            {identity.initials || "?"}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export function AttributionAvatarGroup({
  reporters,
  resolvers,
  className,
  empty = null,
}: {
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
  className?: string
  empty?: ReactNode
}) {
  const avatars = buildAttributionAvatars(reporters, resolvers)
  if (avatars.length === 0) return <>{empty}</>

  return (
    <TooltipProvider delay={200}>
      <AvatarGroup
        className={cn("justify-start", className)}
        role="group"
        aria-label="Work item contributors"
      >
        {avatars.map((av: AttributionAvatar) => (
          <ContributorAvatar
            key={`${av.identity.email}|${av.identity.name}|${av.role}`}
            identity={av.identity}
            label={av.label}
          />
        ))}
      </AvatarGroup>
    </TooltipProvider>
  )
}

/** Detail-sheet people: role heading above each person (avatar, name, email). */
export function AttributionPeopleList({
  reporters,
  resolvers,
  className,
  empty = "—",
}: {
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
  className?: string
  empty?: ReactNode
}) {
  const people = buildAttributionAvatars(reporters, resolvers)
  if (people.length === 0) return <>{empty}</>

  const sections: {
    role: AttributionRole
    heading: string
    people: AttributionAvatar[]
  }[] = [
    {
      role: "both",
      heading: "Created and developed by",
      people: people.filter((p) => p.role === "both"),
    },
    {
      role: "created",
      heading: "Created by",
      people: people.filter((p) => p.role === "created"),
    },
    {
      role: "resolved",
      heading: "Resolved by",
      people: people.filter((p) => p.role === "resolved"),
    },
  ].filter((s) => s.people.length > 0)

  return (
    <TooltipProvider delay={200}>
      <div
        className={cn("flex flex-col gap-3", className)}
        aria-label="Work item contributors"
      >
        {sections.map((section) => (
          <div key={section.role} className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {section.heading}
            </p>
            <ul className="flex flex-col gap-2">
              {section.people.map((person) => {
                const name = person.identity.name || "Unknown"
                const email = person.identity.email
                return (
                  <li
                    key={`${person.identity.email}|${person.identity.name}|${person.role}`}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    <ContributorAvatar
                      identity={person.identity}
                      label={person.label}
                      size="default"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {name}
                      </p>
                      {email ? (
                        <p className="truncate font-mono text-xs font-normal text-muted-foreground">
                          {email}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}
