export const MASTER_FOLDER_COOKIE = "taskmark_master_folder"

/** JSON array of master folder absolute paths (accumulates via Add project) */
export const MASTER_FOLDERS_COOKIE = "taskmark_master_folders"

/** Active discovered project id (realpath of boardPath) */
export const ACTIVE_PROJECT_COOKIE = "taskmark_active_project"

/** Cookie lifetime: 1 year */
export const MASTER_FOLDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const MASTER_FOLDERS_COOKIE_MAX_AGE = MASTER_FOLDER_COOKIE_MAX_AGE

export const ACTIVE_PROJECT_COOKIE_MAX_AGE = MASTER_FOLDER_COOKIE_MAX_AGE

/** Shared Hide completed pref, one for every list (client-readable) */
export const HIDE_COMPLETED_COOKIE_MAX_AGE = MASTER_FOLDER_COOKIE_MAX_AGE

export const HIDE_COMPLETED_COOKIE = "taskmark_hide_completed"

/** Completed work stays hidden until the user asks to see it. */
export const HIDE_COMPLETED_DEFAULT = true

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
