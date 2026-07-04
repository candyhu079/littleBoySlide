import {
  Direction,
  PIECE_TYPES,
  PieceType,
  Segment,
  applyPiece,
  directionDelta,
} from "./types";

export interface TrackGeneratorOptions {
  lanes: number;
  visibleRows: number;
  startColumn: number;
  safeRows: number;
  baseEmptyProbability: number;
  maxEmptyProbability: number;
  emptyProbabilityGrowthPerRow: number;
  cooldownRowsAfterEmpty: number;
  random?: () => number;
}

const DEFAULT_OPTIONS: TrackGeneratorOptions = {
  lanes: 5,
  visibleRows: 12,
  startColumn: 2,
  safeRows: 4,
  baseEmptyProbability: 0.15,
  maxEmptyProbability: 0.45,
  emptyProbabilityGrowthPerRow: 0.002,
  cooldownRowsAfterEmpty: 1,
};

export class TrackGenerator {
  private readonly options: TrackGeneratorOptions;
  private readonly random: () => number;
  private readonly segments: Segment[] = [];
  private nextRow = 0;
  private lastColumn: number;
  private lastExitDirection: Direction = "straight";
  private emptyCooldown = 0;
  private hasPendingEmpty = false;

  constructor(options: Partial<TrackGeneratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.lastColumn = this.options.startColumn;
    this.random = options.random ?? Math.random;
  }

  getSegments(): readonly Segment[] {
    return this.segments;
  }

  reset(): void {
    this.segments.length = 0;
    this.nextRow = 0;
    this.lastColumn = this.options.startColumn;
    this.lastExitDirection = "straight";
    this.emptyCooldown = 0;
    this.hasPendingEmpty = false;
  }

  getSegmentAt(row: number): Segment | undefined {
    return this.segments.find((s) => s.row === row);
  }

  /** ensure enough segments exist ahead of the given row, generating as needed */
  ensureGenerated(kidRow: number): void {
    const targetRow = kidRow + this.options.visibleRows;
    while (this.nextRow <= targetRow && !this.hasPendingEmpty) {
      this.generateNext();
    }
  }

  /** drop segments fully behind the given row to bound memory */
  pruneBefore(row: number): void {
    while (this.segments.length > 0 && this.segments[0].row < row) {
      this.segments.shift();
    }
  }

  /** attempt to place a piece into the empty segment at the given row */
  placePiece(row: number, pieceType: PieceType): boolean {
    const segment = this.getSegmentAt(row);
    if (!segment || segment.type !== "empty") return false;

    const producedExit = applyPiece(pieceType, segment.entryDirection);
    if (producedExit !== segment.exitDirection) return false;

    segment.type = pieceType;
    this.hasPendingEmpty = false;
    return true;
  }

  private generateNext(): void {
    const row = this.nextRow++;
    const entryDirection = this.lastExitDirection;
    const isSafeRow = row < this.options.safeRows;

    const column = this.lastColumn + directionDelta(entryDirection);
    const candidates = this.legalCandidates(entryDirection, column);
    const requiredType = isSafeRow
      ? "straight"
      : candidates[Math.floor(this.random() * candidates.length)];

    const exitDirection = applyPiece(requiredType, entryDirection);

    const emptyProbability = Math.min(
      this.options.maxEmptyProbability,
      this.options.baseEmptyProbability +
        this.options.emptyProbabilityGrowthPerRow * row,
    );
    const canBeEmpty =
      !isSafeRow && this.emptyCooldown <= 0 && this.random() < emptyProbability;

    const segment: Segment = {
      row,
      column,
      type: canBeEmpty ? "empty" : requiredType,
      entryDirection,
      exitDirection,
    };

    this.segments.push(segment);
    this.lastColumn = column;
    this.lastExitDirection = exitDirection;

    if (canBeEmpty) {
      this.hasPendingEmpty = true;
      this.emptyCooldown = this.options.cooldownRowsAfterEmpty;
    } else {
      this.emptyCooldown = Math.max(0, this.emptyCooldown - 1);
    }
  }

  /** piece types for this row that keep the *next* row's column within lane bounds */
  private legalCandidates(entryDirection: Direction, column: number): PieceType[] {
    const candidates = PIECE_TYPES.filter((type) => {
      const exit = applyPiece(type, entryDirection);
      const nextColumn = column + directionDelta(exit);
      return nextColumn >= 0 && nextColumn < this.options.lanes;
    });
    return candidates.length > 0 ? candidates : ["straight"];
  }
}
