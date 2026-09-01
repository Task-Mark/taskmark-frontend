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
import {
  FILTER_CHIPS_FIELD_CLASS,
  type ParentFilterOption,
} from "@/lib/taskmark/list-filters"
import { cn } from "@/lib/utils"

type ParentFilterComboboxProps = {
  options: ParentFilterOption[]
  value: string[]
  onChange: (keys: string[]) => void
  id?: string
}

export function ParentFilterCombobox({
  options,
  value,
  onChange,
  id = "parent-filter",
}: ParentFilterComboboxProps) {
  const anchor = useComboboxAnchor()
  const selected = options.filter((o) => value.includes(o.key))

  if (options.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No parents on board</span>
    )
  }

  return (
    <Combobox
      multiple
      items={options}
      value={selected}
      onValueChange={(next) => {
        const opts = (next as ParentFilterOption[] | null) ?? []
        onChange(opts.map((o) => o.key))
      }}
      itemToStringLabel={(item) => {
        const opt = item as ParentFilterOption
        return `${opt.chipLabel} ${opt.title} ${opt.label}`
      }}
      isItemEqualToValue={(a, b) =>
        (a as ParentFilterOption | null)?.key ===
        (b as ParentFilterOption | null)?.key
      }
    >
      <ComboboxChips
        ref={anchor}
        className={cn(FILTER_CHIPS_FIELD_CLASS, "min-w-0 w-full max-w-none sm:min-w-[16rem] sm:max-w-md")}
      >
        {selected.map((opt) => (
          <ComboboxChip key={opt.key}>{opt.chipLabel}</ComboboxChip>
        ))}
        <ComboboxChipsInput
          id={id}
          placeholder={
            selected.length === 0
              ? "Filter by parent epic or story…"
              : "Add parent…"
          }
          aria-label="Filter by parent epic or story"
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="w-80">
        <ComboboxEmpty>No matching parents</ComboboxEmpty>
        <ComboboxList>
          {(opt: ParentFilterOption) => (
            <ComboboxItem key={opt.key} value={opt}>
              <span className="truncate">{opt.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
