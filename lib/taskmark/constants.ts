export const MASTER_FOLDER_COOKIE = "taskmark_master_folder"

/** JSON array of master folder absolute paths (accumulates via Add project) */
export const MASTER_FOLDERS_COOKIE = "taskmark_master_folders"

/** Active discovered project id (realpath of boardPath) */
export const ACTIVE_PROJECT_COOKIE = "taskmark_active_project"

/** Cookie lifetime: 1 year */
export const MASTER_FOLDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const MASTER_FOLDERS_COOKIE_MAX_AGE = MASTER_FOLDER_COOKIE_MAX_AGE

export const ACTIVE_PROJECT_COOKIE_MAX_AGE = MASTER_FOLDER_COOKIE_MAX_AGE

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
