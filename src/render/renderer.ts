import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  KID_RADIUS,
  KID_SCREEN_Y,
  LANE_WIDTH,
  QUEUE_ITEM_GAP,
  QUEUE_ITEM_SIZE,
  SEGMENT_HEIGHT,
} from "../config";
import { GameSession } from "../session/gameSession";
import { PieceQueue } from "../pieces/queue";
import { TrackGenerator } from "../track/generator";
import { Direction, PieceType, Segment, applyPiece } from "../track/types";
import { InteractionState } from "./interactionState";

const DIRT_BG = "#8b4a34";
const DIRT_ROCK = "#5c2a1e";
const PATH_OUTLINE = "#5c2a1e";
const PATH_FILL = "#e0995f";
const PATH_HIGHLIGHT = "#f3c08a";
const TUNNEL_WIDTH = 46;

const FLASH_DURATION_MS = 350;
const ROCK_PATTERN_HEIGHT = 900;
const ROCK_COUNT = 14;

interface Point {
  x: number;
  y: number;
}

interface Rock extends Point {
  rx: number;
  ry: number;
}

function createRockPattern(): Rock[] {
  const rocks: Rock[] = [];
  for (let i = 0; i < ROCK_COUNT; i++) {
    rocks.push({
      x: Math.random() * BOARD_WIDTH,
      y: Math.random() * ROCK_PATTERN_HEIGHT,
      rx: 10 + Math.random() * 16,
      ry: 8 + Math.random() * 12,
    });
  }
  return rocks;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rocks: Rock[];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context not available");
    this.ctx = ctx;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    this.rocks = createRockPattern();
  }

  render(
    session: GameSession,
    track: TrackGenerator,
    queue: PieceQueue,
    interaction: InteractionState,
  ): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBoardBackground(session.getDistance());
    this.drawTunnelPath(session, track);
    this.drawKid(session, track);
    this.drawQueue(queue, interaction);
    this.drawDraggedPiece(interaction);
    this.drawScore(session);
    this.drawFlashes(interaction);
  }

  private screenYForRow(row: number, distance: number): number {
    return row * SEGMENT_HEIGHT - distance + KID_SCREEN_Y;
  }

  private drawBoardBackground(distance: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = DIRT_BG;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    ctx.fillStyle = DIRT_ROCK;
    const startTile = Math.floor((distance - KID_SCREEN_Y) / ROCK_PATTERN_HEIGHT) - 1;
    const endTile = Math.floor((distance - KID_SCREEN_Y + BOARD_HEIGHT) / ROCK_PATTERN_HEIGHT) + 1;
    for (let tile = startTile; tile <= endTile; tile++) {
      for (const rock of this.rocks) {
        const worldY = tile * ROCK_PATTERN_HEIGHT + rock.y;
        const screenY = worldY - distance + KID_SCREEN_Y;
        if (screenY < -30 || screenY > BOARD_HEIGHT + 30) continue;
        ctx.beginPath();
        ctx.ellipse(rock.x, screenY, rock.rx, rock.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, BOARD_HEIGHT, BOARD_WIDTH, CANVAS_HEIGHT - BOARD_HEIGHT);
  }

  private drawTunnelPath(session: GameSession, track: TrackGenerator): void {
    const distance = session.getDistance();
    const segments = track.getSegments();
    const filled = segments.filter((s) => s.type !== "empty");
    const points: Point[] = filled.map((s) => ({
      x: s.column * LANE_WIDTH + LANE_WIDTH / 2,
      y: this.screenYForRow(s.row, distance) + SEGMENT_HEIGHT / 2,
    }));

    const ctx = this.ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (points.length >= 2) {
      const path = buildSmoothPath(points);
      ctx.strokeStyle = PATH_OUTLINE;
      ctx.lineWidth = TUNNEL_WIDTH + 10;
      ctx.stroke(path);
      ctx.strokeStyle = PATH_FILL;
      ctx.lineWidth = TUNNEL_WIDTH;
      ctx.stroke(path);
      ctx.strokeStyle = PATH_HIGHLIGHT;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.5;
      ctx.stroke(path);
      ctx.globalAlpha = 1;
    } else if (points.length === 1) {
      this.drawTunnelDot(points[0]);
    }

    const pending = segments.find((s) => s.type === "empty");
    if (pending && points.length > 0) {
      this.drawPendingHint(points[points.length - 1], pending, distance);
    }
  }

  private drawTunnelDot(point: Point): void {
    const ctx = this.ctx;
    ctx.fillStyle = PATH_OUTLINE;
    ctx.beginPath();
    ctx.arc(point.x, point.y, (TUNNEL_WIDTH + 10) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PATH_FILL;
    ctx.beginPath();
    ctx.arc(point.x, point.y, TUNNEL_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPendingHint(lastPoint: Point, pending: Segment, distance: number): void {
    const ctx = this.ctx;
    const target: Point = {
      x: pending.column * LANE_WIDTH + LANE_WIDTH / 2,
      y: this.screenYForRow(pending.row, distance) + SEGMENT_HEIGHT / 2,
    };

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = PATH_FILL;
    ctx.lineWidth = TUNNEL_WIDTH;
    ctx.lineCap = "round";
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    this.drawArrow(target.x, target.y, requiredDirection(pending), "rgba(255,255,255,0.85)", 14);
  }

  private drawKid(session: GameSession, track: TrackGenerator): void {
    const ctx = this.ctx;
    const distance = session.getDistance();
    const currentRow = session.getCurrentRow();
    const current = track.getSegmentAt(currentRow);
    const previous = track.getSegmentAt(currentRow - 1);
    if (!current) return;

    const rowProgress = (distance % SEGMENT_HEIGHT) / SEGMENT_HEIGHT;
    const fromColumn = previous ? previous.column : current.column;
    const column = fromColumn + (current.column - fromColumn) * rowProgress;
    const x = column * LANE_WIDTH + LANE_WIDTH / 2;

    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(x, KID_SCREEN_Y, KID_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#854d0e";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawQueue(queue: PieceQueue, interaction: InteractionState): void {
    const items = queue.getItems();
    const totalWidth =
      items.length * QUEUE_ITEM_SIZE + (items.length - 1) * QUEUE_ITEM_GAP;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const y = BOARD_HEIGHT + (CANVAS_HEIGHT - BOARD_HEIGHT - QUEUE_ITEM_SIZE) / 2;

    items.forEach((piece, index) => {
      if (index === interaction.draggingIndex) return;
      const x = startX + index * (QUEUE_ITEM_SIZE + QUEUE_ITEM_GAP);
      this.drawPieceTile(x, y, piece);
    });
  }

  private drawDraggedPiece(interaction: InteractionState): void {
    if (interaction.draggingIndex === null || !interaction.draggingPiece) return;
    const x = interaction.pointerX - QUEUE_ITEM_SIZE / 2;
    const y = interaction.pointerY - QUEUE_ITEM_SIZE / 2;
    this.drawPieceTile(x, y, interaction.draggingPiece, true);
  }

  private drawPieceTile(
    x: number,
    y: number,
    piece: PieceType,
    lifted = false,
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = lifted ? "#3d2418" : DIRT_BG;
    ctx.fillRect(x, y, QUEUE_ITEM_SIZE, QUEUE_ITEM_SIZE);
    ctx.strokeStyle = lifted ? "#fde047" : PATH_OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, QUEUE_ITEM_SIZE, QUEUE_ITEM_SIZE);
    const direction: Direction =
      piece === "straight" ? "straight" : piece === "curve-left" ? "left" : "right";
    this.drawArrow(x + QUEUE_ITEM_SIZE / 2, y + QUEUE_ITEM_SIZE / 2, direction, PATH_FILL, 16);
  }

  private drawArrow(cx: number, cy: number, direction: Direction, color: string, size: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    const angle = direction === "left" ? -Math.PI / 4 : direction === "right" ? Math.PI / 4 : 0;
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(-size * 0.5, size * 0.4);
    ctx.lineTo(size * 0.5, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawScore(session: GameSession): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`分數 ${session.getScore()}`, 12, 28);
    ctx.textAlign = "right";
    ctx.fillText(`最高分 ${session.getHighScore()}`, CANVAS_WIDTH - 12, 28);
    ctx.textAlign = "left";
  }

  private drawFlashes(interaction: InteractionState): void {
    const now = performance.now();
    interaction.flashes = interaction.flashes.filter(
      (flash) => now - flash.startedAt < FLASH_DURATION_MS,
    );
    const ctx = this.ctx;
    for (const flash of interaction.flashes) {
      const progress = (now - flash.startedAt) / FLASH_DURATION_MS;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = flash.kind === "success" ? "#22c55e" : "#ef4444";
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, 28 * (0.6 + progress), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function buildSmoothPath(points: Point[]): Path2D {
  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mid: Point = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };
    path.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
  return path;
}

function requiredDirection(segment: Segment): Direction {
  if (applyPiece("straight", segment.entryDirection) === segment.exitDirection) {
    return "straight";
  }
  if (applyPiece("curve-left", segment.entryDirection) === segment.exitDirection) {
    return "left";
  }
  return "right";
}
