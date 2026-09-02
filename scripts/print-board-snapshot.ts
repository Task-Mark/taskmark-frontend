#!/usr/bin/env node
import { buildBoardSnapshotFromEnv } from "../lib/taskmark/build-snapshot"

process.stdout.write(JSON.stringify(buildBoardSnapshotFromEnv()))
