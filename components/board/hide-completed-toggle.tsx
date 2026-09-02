"use client"

import { Label } from "@taskmark/components/ui/label"
import { Switch } from "@taskmark/components/ui/switch"
import { cn } from "@taskmark/components"

type HideCompletedToggleProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  className?: string
}

/**
 * Default on, shared by every list — completed rows stay hidden until the
 * user turns this off.
 */
export function HideCompletedToggle({
  checked,
  onCheckedChange,
  id = "hide-completed",
  className,
}: HideCompletedToggleProps) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-2 px-1 text-sm font-normal text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Switch
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label="Hide completed"
      />
      Hide completed
    </Label>
  )
}
