"use client"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { FILTER_CHIPS_FIELD_CLASS } from "@/lib/taskmark/list-filters"
import { cn } from "@/lib/utils"

type TagsMultiselectFilterProps = {
  options: string[]
  value: string[]
  onChange: (tags: string[]) => void
  id?: string
}

export function TagsMultiselectFilter({
  options,
  value,
  onChange,
  id = "tags-filter",
}: TagsMultiselectFilterProps) {
  const anchor = useComboboxAnchor()

  if (options.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No tags on board</span>
    )
  }

  return (
    <Combobox
      multiple
      items={options}
      value={value}
      onValueChange={(next) => onChange((next as string[]) ?? [])}
    >
      <ComboboxChips
        ref={anchor}
        className={cn(FILTER_CHIPS_FIELD_CLASS, "min-w-0 w-full max-w-none sm:min-w-[12rem] sm:max-w-xs")}
      >
        {value.map((tag) => (
          <ComboboxChip key={tag}>{tag}</ComboboxChip>
        ))}
        <ComboboxChipsInput
          id={id}
          placeholder={value.length === 0 ? "Filter by tags…" : "Add tag…"}
          aria-label="Filter by tags"
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No matching tags</ComboboxEmpty>
        <ComboboxList>
          {(tag: string) => (
            <ComboboxItem key={tag} value={tag}>
              {tag}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
