/** Last path segment for UI — never show absolute machine paths. */
export function displayFileName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/")
  const parts = normalized.split("/").filter(Boolean)
  return parts[parts.length - 1] || filePath
}
