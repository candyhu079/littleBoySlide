import { PIECE_TYPES, PieceType } from "../track/types";

export interface PieceQueueOptions {
  length: number;
  random?: () => number;
}

const DEFAULT_LENGTH = 5;

export class PieceQueue {
  private readonly length: number;
  private readonly random: () => number;
  private items: PieceType[] = [];

  constructor(options: Partial<PieceQueueOptions> = {}) {
    this.length = options.length ?? DEFAULT_LENGTH;
    this.random = options.random ?? Math.random;
    for (let i = 0; i < this.length; i++) {
      this.items.push(this.randomPiece());
    }
  }

  getItems(): readonly PieceType[] {
    return this.items;
  }

  /** remove the item at index and refill the queue with a new random piece */
  consumeAt(index: number): PieceType | undefined {
    if (index < 0 || index >= this.items.length) return undefined;
    const [piece] = this.items.splice(index, 1);
    this.items.push(this.randomPiece());
    return piece;
  }

  /**
   * guarantee the queue contains at least one piece of the given type,
   * replacing a random slot (never the one at avoidIndex) if it's missing
   */
  ensureContains(type: PieceType, avoidIndex?: number): void {
    if (this.items.includes(type)) return;
    if (this.items.length === 0) return;

    let index = Math.floor(this.random() * this.items.length);
    if (index === avoidIndex) {
      index = (index + 1) % this.items.length;
    }
    this.items[index] = type;
  }

  reset(): void {
    this.items = [];
    for (let i = 0; i < this.length; i++) {
      this.items.push(this.randomPiece());
    }
  }

  private randomPiece(): PieceType {
    return PIECE_TYPES[Math.floor(this.random() * PIECE_TYPES.length)];
  }
}
