"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type HideCompletedToggleProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  className?: string
}

/** Default off — completed rows remain visible until the user enables this. */
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
