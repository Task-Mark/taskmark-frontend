/**
 * Delivery stages live in `@taskmark/components` so the CLI, the UI and the
 * cloud read them the same way. See `board-model/stage.ts` there.
 */
export {
  STAGES,
  emptyStageCounts,
  isShipped,
  parseStage,
  rollupStage,
  stageRank,
} from "@taskmark/components/board-model"
export type { Stage, StageCounts } from "@taskmark/components/board-model"
