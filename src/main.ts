import { PieceQueue } from "./pieces/queue";
import { ensurePendingSegmentSolvable } from "./pieces/solvability";
import { DragController } from "./render/dragController";
import { createInteractionState } from "./render/interactionState";
import { Renderer } from "./render/renderer";
import { GameSession } from "./session/gameSession";
import { TrackGenerator } from "./track/generator";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const menuOverlay = document.querySelector<HTMLDivElement>("#menu-overlay")!;
const gameOverOverlay = document.querySelector<HTMLDivElement>("#game-over-overlay")!;
const startButton = document.querySelector<HTMLButtonElement>("#start-button")!;
const restartButton = document.querySelector<HTMLButtonElement>("#restart-button")!;
const finalScoreEl = document.querySelector<HTMLParagraphElement>("#final-score")!;
const finalHighScoreEl = document.querySelector<HTMLParagraphElement>("#final-high-score")!;

const track = new TrackGenerator();
const queue = new PieceQueue();
const session = new GameSession(track);
const interaction = createInteractionState();
const renderer = new Renderer(canvas);
const dragController = new DragController(canvas, session, track, queue, interaction);
dragController.attach();

function resetGame(): void {
  track.reset();
  queue.reset();
  session.start();
}

startButton.addEventListener("click", () => {
  menuOverlay.classList.add("hidden");
  session.start();
});

restartButton.addEventListener("click", () => {
  gameOverOverlay.classList.add("hidden");
  resetGame();
});

let lastTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const justEnded = session.update(dt);
  ensurePendingSegmentSolvable(track, queue, interaction.draggingIndex ?? undefined);
  renderer.render(session, track, queue, interaction);

  if (justEnded) {
    finalScoreEl.textContent = `本局分數：${session.getScore()}`;
    finalHighScoreEl.textContent = `最高分：${session.getHighScore()}`;
    gameOverOverlay.classList.remove("hidden");
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
