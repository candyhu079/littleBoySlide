import {
  BOARD_HEIGHT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  KID_SCREEN_Y,
  LANE_WIDTH,
  QUEUE_ITEM_GAP,
  QUEUE_ITEM_SIZE,
  SEGMENT_HEIGHT,
} from "../config";
import { PieceQueue } from "../pieces/queue";
import { GameSession } from "../session/gameSession";
import { TrackGenerator } from "../track/generator";
import { InteractionState } from "./interactionState";

export class DragController {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly session: GameSession,
    private readonly track: TrackGenerator,
    private readonly queue: PieceQueue,
    private readonly interaction: InteractionState,
  ) {}

  attach(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
  }

  private getCanvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  private queueItemIndexAt(x: number, y: number): number | null {
    const items = this.queue.getItems();
    const totalWidth =
      items.length * QUEUE_ITEM_SIZE + (items.length - 1) * QUEUE_ITEM_GAP;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const top = BOARD_HEIGHT + (CANVAS_HEIGHT - BOARD_HEIGHT - QUEUE_ITEM_SIZE) / 2;
    if (y < top || y > top + QUEUE_ITEM_SIZE) return null;

    for (let index = 0; index < items.length; index++) {
      const left = startX + index * (QUEUE_ITEM_SIZE + QUEUE_ITEM_GAP);
      if (x >= left && x <= left + QUEUE_ITEM_SIZE) return index;
    }
    return null;
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (this.session.getState() !== "playing") return;
    const point = this.getCanvasPoint(event);
    const index = this.queueItemIndexAt(point.x, point.y);
    if (index === null) return;

    this.interaction.draggingIndex = index;
    this.interaction.draggingPiece = this.queue.getItems()[index];
    this.interaction.pointerX = point.x;
    this.interaction.pointerY = point.y;
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.interaction.draggingIndex === null) return;
    const point = this.getCanvasPoint(event);
    this.interaction.pointerX = point.x;
    this.interaction.pointerY = point.y;
  };

  private onPointerUp = (event: PointerEvent): void => {
    const { draggingIndex, draggingPiece } = this.interaction;
    if (draggingIndex === null || !draggingPiece) return;
    const point = this.getCanvasPoint(event);

    if (point.y >= 0 && point.y <= BOARD_HEIGHT) {
      const row = this.rowUnderPoint(point.x, point.y);
      if (row !== null) {
        const success = this.track.placePiece(row, draggingPiece);
        this.interaction.flashes.push({
          kind: success ? "success" : "fail",
          x: point.x,
          y: point.y,
          startedAt: performance.now(),
        });
        if (success) {
          this.queue.consumeAt(draggingIndex);
        }
      }
    }

    this.interaction.draggingIndex = null;
    this.interaction.draggingPiece = null;
  };

  private onPointerCancel = (): void => {
    this.interaction.draggingIndex = null;
    this.interaction.draggingPiece = null;
  };

  private rowUnderPoint(x: number, y: number): number | null {
    const distance = this.session.getDistance();
    for (const segment of this.track.getSegments()) {
      if (segment.type !== "empty") continue;
      const segX = segment.column * LANE_WIDTH;
      const segY = segment.row * SEGMENT_HEIGHT - distance + KID_SCREEN_Y;
      if (x >= segX && x <= segX + LANE_WIDTH && y >= segY && y <= segY + SEGMENT_HEIGHT) {
        return segment.row;
      }
    }
    return null;
  }
}
