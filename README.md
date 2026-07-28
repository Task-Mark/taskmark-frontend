# Taskmark — local board UI

Open a Taskmark markdown board in the browser without cloning this repo for day-to-day use.

## One command

From a product repo that already has `./taskmark/`, or from a dedicated `*-taskmark` board root:

```bash
npx taskmark serve
```

Opens [http://localhost:8275](http://localhost:8275) and binds **only that board**.

| Option | Meaning |
|--------|---------|
| `--port` / `-p` | Listen port (default **8275**; also `PORT` / `TASKMARK_PORT`) |
| `--board <path>` | Board or product root (sets `TASKMARK_BOARD`) |
| `--no-open` | Print the URL only |

Board resolution (same as zero-config in the app):

1. `--board` / `TASKMARK_BOARD`
2. `TASKMARK_MASTER`
3. `TASKMARK_CWD` → npm `INIT_CWD` → `process.cwd()` — nested `./taskmark/` or flat `*-taskmark` root

If no board is found, the CLI exits with a clear error (setup cookies are for `npm run dev` only).

### Nested vs flat boards

| Layout | Where to run `serve` |
|--------|----------------------|
| Single-git | Product root (discovers `./taskmark/`) or the `taskmark/` folder itself |
| Multi-git | Dedicated sibling `*-taskmark` repo root (`INDEX.md` at root — not nested) |

You do **not** need to clone `taskmark-frontend` to view a board.

### Optional `npm start` stub

New boards can add a tiny `package.json` (markdown-first boards stay without one):

```json
{
  "name": "my-project-taskmark",
  "private": true,
  "scripts": {
    "start": "taskmark serve"
  },
  "devDependencies": {
    "taskmark": "^0.1.0"
  }
}
```

Then `npm start` from the board or product root.

## Dev server (this package)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Setup wizard (default)

When you run from a cwd **without** a Taskmark board, the app opens the **setup wizard**. Cookie-based multi-project workspaces still work.

### Zero-config (skip setup)

| Bind | How |
|------|-----|
| `TASKMARK_BOARD` | Absolute path to a board root or a product root with `./taskmark/` |
| `TASKMARK_MASTER` | Absolute path to a master folder |
| Cwd | `TASKMARK_CWD`, else `INIT_CWD`, else `process.cwd()` |

Precedence: **env board → env master → cwd → cookies**.

```bash
TASKMARK_BOARD=/path/to/my-app/taskmark npm run dev
```

When zero-config is active, **Add project** is hidden.

### Package build

```bash
npm run build   # next build + prepare dist/standalone for the CLI
npm run serve   # same as npx taskmark serve (needs build first)
```

## Stack

- Next.js / React (standalone output for `taskmark serve`)
- Tailwind CSS v4
- Local markdown boards only (no hosted sync)
