export type Direction = "left" | "straight" | "right";
export type PieceType = "straight" | "curve-left" | "curve-right";
export type SegmentType = PieceType | "empty";

export interface Segment {
  row: number;
  column: number;
  /** type of the segment; "empty" until a piece is placed */
  type: SegmentType;
  /** heading required to arrive at this segment (fixed at generation time) */
  entryDirection: Direction;
  /** heading this segment must produce to stay on the planned path */
  exitDirection: Direction;
}

export const PIECE_TYPES: readonly PieceType[] = [
  "straight",
  "curve-left",
  "curve-right",
];

export function directionDelta(direction: Direction): number {
  if (direction === "left") return -1;
  if (direction === "right") return 1;
  return 0;
}

export function turnLeft(direction: Direction): Direction {
  if (direction === "right") return "straight";
  return "left";
}

export function turnRight(direction: Direction): Direction {
  if (direction === "left") return "straight";
  return "right";
}

/** direction a piece produces when entered with the given heading */
export function applyPiece(type: PieceType, entryDirection: Direction): Direction {
  if (type === "straight") return entryDirection;
  if (type === "curve-left") return turnLeft(entryDirection);
  return turnRight(entryDirection);
}
