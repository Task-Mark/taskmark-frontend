/** Contributor identity from git config (name, email, initials). */

export type ContributorIdentity = {
  name: string
  email: string
  initials: string
}

export function deriveInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s\-_.]+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) {
    const token = parts[0]
    return (token.length >= 2 ? token.slice(0, 2) : token.slice(0, 1)).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function asIdentity(value: unknown): ContributorIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const obj = value as Record<string, unknown>
  const name =
    typeof obj.name === "string"
      ? obj.name
      : typeof obj.name === "number"
        ? String(obj.name)
        : ""
  const email =
    typeof obj.email === "string"
      ? obj.email
      : typeof obj.email === "number"
        ? String(obj.email)
        : ""
  let initials =
    typeof obj.initials === "string"
      ? obj.initials
      : typeof obj.initials === "number"
        ? String(obj.initials)
        : ""
  if (!name && !email) return null
  const resolvedName = name || email.split("@")[0] || ""
  if (!initials) initials = deriveInitials(resolvedName)
  return { name: resolvedName, email, initials: initials.toUpperCase() }
}

/** Parse reporters/resolvers YAML lists from frontmatter. */
export function asContributorList(value: unknown): ContributorIdentity[] {
  if (!Array.isArray(value)) return []
  const out: ContributorIdentity[] = []
  for (const item of value) {
    const ident = asIdentity(item)
    if (ident) out.push(ident)
  }
  return out
}

export type AttributionRole = "created" | "resolved" | "both"

export type AttributionAvatar = {
  identity: ContributorIdentity
  role: AttributionRole
  label: string
}

function emailKey(email: string, name: string): string {
  const e = email.trim().toLowerCase()
  if (e) return `e:${e}`
  return `n:${name.trim().toLowerCase()}`
}

/** Merge reporters + resolvers into avatar entries with hover labels. */
export function buildAttributionAvatars(
  reporters: ContributorIdentity[],
  resolvers: ContributorIdentity[]
): AttributionAvatar[] {
  type Acc = {
    identity: ContributorIdentity
    created: boolean
    resolved: boolean
  }
  const map = new Map<string, Acc>()

  for (const r of reporters) {
    const key = emailKey(r.email, r.name)
    const cur = map.get(key)
    if (cur) {
      cur.created = true
      if (!cur.identity.name && r.name) cur.identity.name = r.name
      if (!cur.identity.email && r.email) cur.identity.email = r.email
      if (!cur.identity.initials) cur.identity.initials = r.initials
    } else {
      map.set(key, {
        identity: { ...r },
        created: true,
        resolved: false,
      })
    }
  }
  for (const r of resolvers) {
    const key = emailKey(r.email, r.name)
    const cur = map.get(key)
    if (cur) {
      cur.resolved = true
      if (!cur.identity.name && r.name) cur.identity.name = r.name
      if (!cur.identity.email && r.email) cur.identity.email = r.email
      if (!cur.identity.initials) cur.identity.initials = r.initials
    } else {
      map.set(key, {
        identity: { ...r },
        created: false,
        resolved: true,
      })
    }
  }

  const out: AttributionAvatar[] = []
  for (const acc of map.values()) {
    let role: AttributionRole
    let label: string
    const name = acc.identity.name || "Unknown"
    if (acc.created && acc.resolved) {
      role = "both"
      label = `Reported and implemented by ${name}`
    } else if (acc.created) {
      role = "created"
      label = `Reported by ${name}`
    } else {
      role = "resolved"
      label = `Implemented by ${name}`
    }
    out.push({ identity: acc.identity, role, label })
  }
  return out
}

/** Curated palette — distinct, readable with white initials. */
const AVATAR_PALETTE = [
  "#0f766e", // teal
  "#1d4ed8", // blue
  "#7c3aed", // violet
  "#be185d", // pink
  "#b45309", // amber
  "#047857", // green
  "#c2410c", // orange
  "#4338ca", // indigo
  "#0e7490", // cyan
  "#a16207", // yellow-brown
  "#9f1239", // rose
  "#166534", // forest
  "#6d28d9", // purple
  "#0369a1", // sky
  "#9a3412", // rust
  "#115e59", // teal-dark
] as const

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Stable hue from email/name (legacy). Prefer identityBackgroundColor. */
export function identityHue(identity: ContributorIdentity): number {
  const seed = (identity.email || identity.name || "?").toLowerCase()
  return hashSeed(seed) % 360
}

/**
 * Background color from user initials (falls back to email/name).
 * Same initials → same color; different initials → different palette slots.
 */
export function identityBackgroundColor(identity: ContributorIdentity): string {
  const initials = (identity.initials || "").trim().toUpperCase()
  const seed = initials || (identity.email || identity.name || "?").toLowerCase()
  const index = hashSeed(seed) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[index]
}
