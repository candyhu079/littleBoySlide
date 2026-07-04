import { describe, expect, it } from "vitest";
import { TrackGenerator } from "./generator";
import { applyPiece, PIECE_TYPES } from "./types";

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("TrackGenerator", () => {
  it("never leaves more than one unresolved empty segment pending", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const generator = new TrackGenerator({ random: seededRandom(seed) });
      generator.ensureGenerated(0);
      const segments = generator.getSegments();
      const emptyRows = segments.filter((s) => s.type === "empty").map((s) => s.row);
      expect(emptyRows.length).toBeLessThanOrEqual(1);
    }
  });

  it("guarantees a legal piece exists for every empty segment (solvability)", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const generator = new TrackGenerator({ random: seededRandom(seed) });
      generator.ensureGenerated(0);
      for (const segment of generator.getSegments()) {
        if (segment.type !== "empty") continue;
        const hasLegalPiece = PIECE_TYPES.some(
          (type) => applyPiece(type, segment.entryDirection) === segment.exitDirection,
        );
        expect(hasLegalPiece).toBe(true);
      }
    }
  });

  it("keeps every generated column within lane bounds", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const generator = new TrackGenerator({ lanes: 5, random: seededRandom(seed) });
      for (let row = 0; row < 40; row++) {
        generator.ensureGenerated(row);
      }
      for (const segment of generator.getSegments()) {
        expect(segment.column).toBeGreaterThanOrEqual(0);
        expect(segment.column).toBeLessThan(5);
      }
    }
  });

  it("accepts a direction-compatible piece and rejects an incompatible one", () => {
    const generator = new TrackGenerator({ random: seededRandom(7) });
    generator.ensureGenerated(0);
    const empty = generator.getSegments().find((s) => s.type === "empty");
    expect(empty).toBeDefined();
    if (!empty) return;

    const wrongType = PIECE_TYPES.find(
      (type) => applyPiece(type, empty.entryDirection) !== empty.exitDirection,
    )!;
    expect(generator.placePiece(empty.row, wrongType)).toBe(false);
    expect(generator.getSegmentAt(empty.row)?.type).toBe("empty");

    const correctType = PIECE_TYPES.find(
      (type) => applyPiece(type, empty.entryDirection) === empty.exitDirection,
    )!;
    expect(generator.placePiece(empty.row, correctType)).toBe(true);
    expect(generator.getSegmentAt(empty.row)?.type).toBe(correctType);
  });

  it("resumes generating rows once the pending empty segment is filled", () => {
    const generator = new TrackGenerator({ random: seededRandom(3), visibleRows: 5 });
    generator.ensureGenerated(0);
    const before = generator.getSegments().length;
    const empty = generator.getSegments().find((s) => s.type === "empty");
    if (empty) {
      const correctType = PIECE_TYPES.find(
        (type) => applyPiece(type, empty.entryDirection) === empty.exitDirection,
      )!;
      generator.placePiece(empty.row, correctType);
      generator.ensureGenerated(0);
      expect(generator.getSegments().length).toBeGreaterThanOrEqual(before);
    }
  });

  it("prunes segments before the given row", () => {
    const generator = new TrackGenerator({ random: seededRandom(5) });
    generator.ensureGenerated(20);
    generator.pruneBefore(10);
    for (const segment of generator.getSegments()) {
      expect(segment.row).toBeGreaterThanOrEqual(10);
    }
  });
});
