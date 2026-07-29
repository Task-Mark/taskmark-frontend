# @taskmark/ui — local board UI

Install in a Taskmark board folder (or product root with `./taskmark/`) and open the board in the browser.

## Install and serve

```bash
# from nested ./taskmark/ or a dedicated *-taskmark board root
npm install @taskmark/ui --save
npx taskmark serve
```

Opens [http://localhost:8275](http://localhost:8275) bound to **this** board.

Without a local install (once published):

```bash
npx -p @taskmark/ui taskmark serve
```

| Option | Meaning |
|--------|---------|
| `--port` / `-p` | Listen port (default **8275**; also `PORT` / `TASKMARK_PORT`) |
| `--board <path>` | Board or product root (sets `TASKMARK_BOARD`) |
| `--no-open` | Print the URL only |

Board resolution:

1. `--board` / `TASKMARK_BOARD`
2. `TASKMARK_MASTER`
3. `TASKMARK_CWD` → npm `INIT_CWD` → `process.cwd()` — nested `./taskmark/` or flat `*-taskmark` root

### Nested vs flat boards

| Layout | Where to install / run |
|--------|------------------------|
| Single-git | Product root (discovers `./taskmark/`) or the `taskmark/` folder |
| Multi-git | Dedicated sibling `*-taskmark` repo root (`INDEX.md` at root) |

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
    "build": "taskmark build --board . --out out",
    "preview": "taskmark preview"
  },
  "dependencies": {
    "@taskmark/ui": "^0.2.4"
  }
}
```

Then `npm install && npm run serve` (or `npm start`). For **Vercel**, use `npm run build` (static HTML in `out/`) — see the board-ui-stub `vercel.json`.

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
npm run build    # next standalone + dist/ for the CLI
npm run serve    # local bin against cwd/env board
npm run dev      # Next dev server on :3000 (setup wizard unless auto-bound)
```

Zero-config for `npm run dev`: `TASKMARK_BOARD` / `TASKMARK_MASTER` / cwd (see above). Cookie multi-master setup still works when unbound.

## Stack

- Next.js standalone server packaged for `taskmark serve`
- Tailwind CSS v4
- Local markdown boards only (no hosted sync)
