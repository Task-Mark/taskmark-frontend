export const MASTER_FOLDER_COOKIE = "taskmark_master_folder"

/** Cookie lifetime: 1 year */
export const MASTER_FOLDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** How deep to walk under the master folder when discovering boards */
export const DISCOVERY_MAX_DEPTH = 3

export const DISCOVERY_SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "dist",
  "build",
  "coverage",
  "out",
  "vendor",
])
