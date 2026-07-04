import { beforeEach, describe, expect, it } from "vitest";
import { GameSession } from "./gameSession";
import { TrackGenerator } from "../track/generator";

describe("GameSession", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = undefined;
  });

  it("caps speed at maxSpeed no matter how far the distance grows", () => {
    // no empty segments, so the session never ends and distance can grow freely
    const track = new TrackGenerator({ baseEmptyProbability: 0, maxEmptyProbability: 0 });
    const session = new GameSession(track, {
      baseSpeed: 45,
      maxSpeed: 160,
      speedGrowthPerPixel: 0.012,
    });
    session.start();
    for (let i = 0; i < 5000; i++) session.update(0.05);
    expect(session.getCurrentSpeed()).toBeLessThanOrEqual(160);
    expect(session.getCurrentSpeed()).toBe(160);
  });

  it("ends the game the moment the kid reaches an empty segment", () => {
    const track = new TrackGenerator();
    const session = new GameSession(track, { segmentHeight: 70 });
    session.start();
    track.ensureGenerated(0);

    // force the first non-safe row to be empty for a deterministic test
    const segments = track.getSegments();
    const target = segments.find((s) => s.row >= 4)!;
    (target as { type: string }).type = "empty";

    let ended = false;
    for (let i = 0; i < 500 && !ended; i++) {
      ended = session.update(0.05);
    }
    expect(ended).toBe(true);
    expect(session.getState()).toBe("gameOver");
  });

  it("does not advance distance while not in the playing state", () => {
    const track = new TrackGenerator();
    const session = new GameSession(track);
    session.update(1);
    expect(session.getDistance()).toBe(0);
  });
});
