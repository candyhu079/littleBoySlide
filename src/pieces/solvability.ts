import { PieceQueue } from "./queue";
import { TrackGenerator } from "../track/generator";
import { PIECE_TYPES, applyPiece } from "../track/types";

/**
 * whenever a segment is waiting to be filled, guarantee the queue actually
 * contains a piece that can legally fill it - otherwise the player can get
 * stuck with no valid option until the kid falls
 */
export function ensurePendingSegmentSolvable(
  track: TrackGenerator,
  queue: PieceQueue,
  avoidIndex?: number,
): void {
  const pending = track.getSegments().find((segment) => segment.type === "empty");
  if (!pending) return;

  const requiredType = PIECE_TYPES.find(
    (type) => applyPiece(type, pending.entryDirection) === pending.exitDirection,
  );
  if (!requiredType) return;

  queue.ensureContains(requiredType, avoidIndex);
}
