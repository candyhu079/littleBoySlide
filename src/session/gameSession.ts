import { TrackGenerator } from "../track/generator";

export type GameState = "menu" | "playing" | "gameOver";

export interface GameSessionOptions {
  segmentHeight: number;
  baseSpeed: number;
  maxSpeed: number;
  speedGrowthPerPixel: number;
  highScoreStorageKey: string;
}

const DEFAULT_OPTIONS: GameSessionOptions = {
  segmentHeight: 70,
  baseSpeed: 45,
  maxSpeed: 160,
  speedGrowthPerPixel: 0.012,
  highScoreStorageKey: "kids-slide-game.high-score",
};

export class GameSession {
  readonly options: GameSessionOptions;
  private state: GameState = "menu";
  private distance = 0;
  private highScore = 0;

  constructor(
    private readonly track: TrackGenerator,
    options: Partial<GameSessionOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.highScore = this.loadHighScore();
  }

  getState(): GameState {
    return this.state;
  }

  getDistance(): number {
    return this.distance;
  }

  getScore(): number {
    return Math.floor(this.distance);
  }

  getHighScore(): number {
    return this.highScore;
  }

  getCurrentRow(): number {
    return Math.floor(this.distance / this.options.segmentHeight);
  }

  getCurrentSpeed(): number {
    return Math.min(
      this.options.maxSpeed,
      this.options.baseSpeed + this.options.speedGrowthPerPixel * this.distance,
    );
  }

  start(): void {
    this.distance = 0;
    this.state = "playing";
  }

  /** advance the session by dt seconds; returns true if the game just ended */
  update(dt: number): boolean {
    if (this.state !== "playing") return false;

    this.distance += this.getCurrentSpeed() * dt;
    this.track.ensureGenerated(this.getCurrentRow());
    this.track.pruneBefore(this.getCurrentRow() - 2);

    const segment = this.track.getSegmentAt(this.getCurrentRow());
    if (segment && segment.type === "empty") {
      this.endGame();
      return true;
    }
    return false;
  }

  private endGame(): void {
    this.state = "gameOver";
    if (this.getScore() > this.highScore) {
      this.highScore = this.getScore();
      this.saveHighScore(this.highScore);
    }
  }

  private loadHighScore(): number {
    try {
      const raw = localStorage.getItem(this.options.highScoreStorageKey);
      const parsed = raw ? Number.parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(value: number): void {
    try {
      localStorage.setItem(this.options.highScoreStorageKey, String(value));
    } catch {
      /* localStorage unavailable (e.g. private mode) - ignore */
    }
  }
}
