import { describe, expect, it } from "vitest";
import { PieceQueue } from "./queue";
import { ensurePendingSegmentSolvable } from "./solvability";
import { TrackGenerator } from "../track/generator";
import { PIECE_TYPES, applyPiece } from "../track/types";

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("ensurePendingSegmentSolvable", () => {
  it("injects the required piece type when the queue has none of it", () => {
    const track = new TrackGenerator({ random: seededRandom(1) });
    track.ensureGenerated(0);
    const pending = track.getSegments().find((s) => s.type === "empty");
    expect(pending).toBeDefined();
    if (!pending) return;

    const requiredType = PIECE_TYPES.find(
      (type) => applyPiece(type, pending.entryDirection) === pending.exitDirection,
    )!;

    // force a queue that definitely lacks the required type
    const otherTypes = PIECE_TYPES.filter((t) => t !== requiredType);
    const queue = new PieceQueue({ length: 5, random: () => 0 });
    (queue as unknown as { items: string[] }).items = [
      otherTypes[0],
      otherTypes[0],
      otherTypes[0] ?? otherTypes[1],
      otherTypes[1] ?? otherTypes[0],
      otherTypes[1] ?? otherTypes[0],
    ];
    expect(queue.getItems()).not.toContain(requiredType);

    ensurePendingSegmentSolvable(track, queue);

    expect(queue.getItems()).toContain(requiredType);
  });

  it("never overwrites the slot currently being dragged", () => {
    const track = new TrackGenerator({ random: seededRandom(2) });
    track.ensureGenerated(0);
    const pending = track.getSegments().find((s) => s.type === "empty");
    if (!pending) return;

    const requiredType = PIECE_TYPES.find(
      (type) => applyPiece(type, pending.entryDirection) === pending.exitDirection,
    )!;
    const otherType = PIECE_TYPES.find((t) => t !== requiredType)!;

    // random always resolves to index 0, colliding with the dragged slot
    const queue = new PieceQueue({ length: 5, random: () => 0 });
    (queue as unknown as { items: string[] }).items = Array(5).fill(otherType);

    ensurePendingSegmentSolvable(track, queue, 0);

    expect(queue.getItems()[0]).toBe(otherType);
    expect(queue.getItems()).toContain(requiredType);
  });

  it("does nothing when there is no pending empty segment", () => {
    const track = new TrackGenerator({ random: seededRandom(3), baseEmptyProbability: 0, maxEmptyProbability: 0 });
    track.ensureGenerated(0);
    const queue = new PieceQueue({ length: 5, random: () => 0 });
    const before = [...queue.getItems()];
    ensurePendingSegmentSolvable(track, queue);
    expect(queue.getItems()).toEqual(before);
  });
});
