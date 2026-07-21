export type DiscoveredProject = {
  /** Stable id — typically the project folder name */
  id: string
  /** Display name */
  name: string
  /** Absolute path to the project root (parent of `taskmark/`) */
  projectPath: string
  /** Absolute path to the `taskmark/` board directory */
  boardPath: string
}

export type ValidateMasterFolderResult =
  | {
      ok: true
      masterPath: string
      projects: DiscoveredProject[]
    }
  | {
      ok: false
      error: string
      code: "empty" | "not_found" | "not_directory" | "unreadable" | "no_projects"
    }
