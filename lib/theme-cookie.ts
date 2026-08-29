export const THEME_COOKIE_NAME = "taskmark_theme"
export const THEME_STORAGE_KEY = "taskmark_theme"
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
export const THEME_COOKIE_PARENT_DOMAIN = ".taskmark.dev"

export type ThemePreference = "light" | "dark"

export function parseThemePreference(
  value: string | null | undefined
): ThemePreference | undefined {
  if (value === "light" || value === "dark") return value
  return undefined
}

/** Parent domain for hosted site + board; omit on localhost and other hosts. */
export function themeCookieDomain(
  hostname: string
): string | undefined {
  if (hostname === "taskmark.dev" || hostname.endsWith(".taskmark.dev")) {
    return THEME_COOKIE_PARENT_DOMAIN
  }
  return undefined
}

export function writeThemeCookie(theme: ThemePreference): void {
  if (typeof document === "undefined") return
  const parts = [
    `${THEME_COOKIE_NAME}=${theme}`,
    "path=/",
    `max-age=${THEME_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ]
  const domain = themeCookieDomain(window.location.hostname)
  if (domain) parts.push(`domain=${domain}`)
  if (window.location.protocol === "https:") parts.push("Secure")
  document.cookie = parts.join("; ")
}

/**
 * Runs before paint: cookie wins, else localStorage, else OS.
 * Also copies a cookie preference into localStorage so next-themes agrees.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var n=${JSON.stringify(THEME_COOKIE_NAME)};var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=document.cookie.match(new RegExp("(?:^|; )"+n+"=([^;]*)"));var stored=m?decodeURIComponent(m[1]):null;function ok(v){return v==="light"||v==="dark"}if(!ok(stored)){stored=null;try{stored=localStorage.getItem(k);if(!ok(stored))stored=localStorage.getItem("theme")}catch(e){stored=null}if(!ok(stored))stored=null}if(ok(stored)){try{localStorage.setItem(k,stored)}catch(e){}}var dark=stored==="dark"||(stored!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light"}catch(e){}})();`
