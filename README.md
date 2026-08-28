# @taskmark/ui — local board UI

Install in a Taskmark board folder (or product root with `./taskmark/`) and open the board in the browser.

## Two modes

| Mode | When | Behaviour |
|------|------|-----------|
| **Bound** | Board found in/near cwd, or `serve` / `dev` | Opens that one board. No setup wizard, no project picker. |
| **Workspace** | No local board, or `open` / `--workspace` | Standalone setup wizard + app-bar project picker. |

```bash
# Global / any folder without a board → setup & pick projects
npx @taskmark/ui
# or: npx -p @taskmark/ui taskmark

# Inside a board folder (or product with ./taskmark/) → that board only
cd my-app-taskmark && npx taskmark
# or: npm i @taskmark/ui --save && npx taskmark serve
```

> **`npx taskmark` only works where `@taskmark/ui` is installed.** `taskmark` is the
> *bin* name, not a package name — an unrelated `taskmark` package exists on npm, and
> npx will fetch that one instead. Use `npx @taskmark/ui` when running from a folder
> with no local install, or install the CLI once (see below).

### Install the CLI globally

```bash
npm install -g @taskmark/ui   # published release
# from a clone of taskmark-frontend:
npm run build && npm link      # local build on PATH as `taskmark`
```

Then `taskmark` works anywhere: setup / project picker outside a board, bound board inside one.

`taskmark open` always forces the setup / picker, even when a board is nearby. Chosen master folders and the active project persist in cookies.

## Install and serve

```bash
# from nested ./taskmark/ or a dedicated *-taskmark board root
npm install @taskmark/ui --save
npx taskmark
# or: npx taskmark serve
```

Opens [http://localhost:8275](http://localhost:8275) bound to **this** board.

### Development (live board reload)

```bash
npx taskmark dev
# or: npm run dev / yarn dev
```

Runs Next.js in development on port **8275** and refreshes the UI when board `.md` files change.

Without a local install (once published):

```bash
npx @taskmark/ui
# or: npx -p @taskmark/ui taskmark
```

| Option | Meaning |
|--------|---------|
| `--port` / `-p` | Listen port (default **8275**; also `PORT` / `TASKMARK_PORT`) |
| `--board <path>` | Board or product root (sets `TASKMARK_BOARD`) |
| `--workspace` / `-w` | Force setup / multi-project mode; cannot be combined with `--board` |
| `--no-open` | Print the URL only |

Board resolution (bound mode only):

1. `--board` / `TASKMARK_BOARD`
2. `TASKMARK_MASTER`
3. `TASKMARK_CWD` → npm `INIT_CWD` → `process.cwd()` — nested `./taskmark/` or flat `*-taskmark` root
4. Sibling `<parent>-taskmark` next to a product repo (multi-git workspaces)

### Nested vs flat boards

| Layout | Where to install / run |
|--------|------------------------|
| Single-git | Product root (discovers `./taskmark/`) or the `taskmark/` folder |
| Multi-git | Dedicated sibling `*-taskmark` repo root (`epics/` at root) |

You do **not** need to clone `taskmark-frontend`.

### Optional `package.json` stub

```json
{
  "name": "my-project-taskmark",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "taskmark serve --no-open",
    "serve": "taskmark serve",
    "dev": "taskmark dev",
    "build": "taskmark build --board . --out out",
    "preview": "taskmark preview"
  },
  "dependencies": {
    "@taskmark/ui": "^0.2.5"
  }
}
```

Then `npm install && npm run serve` (or `npm start`). Use `npm run dev` while editing board markdown. For **Vercel**, use `npm run build` (static HTML in `out/`) — see the board-ui-stub `vercel.json`.

### Static production build

```bash
npx taskmark build --board .
# → <board>/out  (HTML + assets + taskmark-snapshot.json)

npm run preview
# or: npx taskmark preview
# serves <board>/out locally (default port 8275)
```

Favicon, webmanifest, and Open Graph assets ship in `public/` and are included in both standalone (`taskmark serve`) and static (`taskmark build`) outputs.

## Develop this package

```bash
npm install
npm run build          # next standalone + dist/ for the CLI
npm run serve          # production standalone against cwd/env board
npm run dev            # taskmark dev (Next + markdown live reload) on :8275
npm run dev:workspace  # same, but unbound — work on the setup wizard / picker
npm run open           # prebuilt UI in workspace mode
```

`npm run dev` / `serve` always bind to a board (sibling `taskmark-taskmark` from this repo). Bare `node ./bin/taskmark.js` uses the smart default. Use `open` / `dev:workspace` to work on the setup wizard.

## Stack

- Next.js production server packaged for `taskmark serve` (`next start` + slim `dist/prod-next`)
- `taskmark dev` for live board markdown reload
- Tailwind CSS v4
- Local markdown boards only (no hosted sync)
