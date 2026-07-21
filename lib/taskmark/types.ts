export type DiscoveredProject = {
  /** Stable id — realpath of boardPath */
  id: string
  /** Display name */
  name: string
  /**
   * Absolute path to the project root:
   * parent of nested `taskmark/`, or the dedicated `*-taskmark` folder itself.
   */
  projectPath: string
  /**
   * Absolute path to the board directory:
   * `<project>/taskmark` (single) or `<name>-taskmark` root (multi).
   */
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
