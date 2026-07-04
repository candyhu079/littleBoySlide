import { PieceType } from "../track/types";

export interface FeedbackFlash {
  kind: "success" | "fail";
  x: number;
  y: number;
  startedAt: number;
}

export interface InteractionState {
  draggingIndex: number | null;
  draggingPiece: PieceType | null;
  pointerX: number;
  pointerY: number;
  flashes: FeedbackFlash[];
}

export function createInteractionState(): InteractionState {
  return {
    draggingIndex: null,
    draggingPiece: null,
    pointerX: 0,
    pointerY: 0,
    flashes: [],
  };
}
