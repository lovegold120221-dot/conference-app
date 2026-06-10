import { describe, it, expect } from "vitest";
import { shouldTranslateForListener } from "./translationRouting";

describe("shouldTranslateForListener", () => {
  const listenerA = "participant-A";
  const listenerB = "participant-B";

  // ── Own microphone → NEVER translate back ───────────────────────────
  it("returns false for own microphone", () => {
    expect(
      shouldTranslateForListener({
        listenerParticipantId: listenerA,
        sourceOwnerParticipantId: listenerA,
        sourceType: "microphone",
      }),
    ).toBe(false);
  });

  // ── Own screen-share audio → ALWAYS translate back ──────────────────
  it("returns true for own screen-share audio", () => {
    expect(
      shouldTranslateForListener({
        listenerParticipantId: listenerA,
        sourceOwnerParticipantId: listenerA,
        sourceType: "screen-share-audio",
      }),
    ).toBe(true);
  });

  // ── Remote microphone → ALWAYS translate ────────────────────────────
  it("returns true for remote microphone", () => {
    expect(
      shouldTranslateForListener({
        listenerParticipantId: listenerA,
        sourceOwnerParticipantId: listenerB,
        sourceType: "microphone",
      }),
    ).toBe(true);
  });

  // ── Remote screen-share audio → ALWAYS translate ───────────────────
  it("returns true for remote screen-share audio", () => {
    expect(
      shouldTranslateForListener({
        listenerParticipantId: listenerA,
        sourceOwnerParticipantId: listenerB,
        sourceType: "screen-share-audio",
      }),
    ).toBe(true);
  });

  // ── Additional participants ─────────────────────────────────────────
  it("returns true for third-party microphone", () => {
    expect(
      shouldTranslateForListener({
        listenerParticipantId: listenerA,
        sourceOwnerParticipantId: "participant-C",
        sourceType: "microphone",
      }),
    ).toBe(true);
  });

  it("returns true for third-party screen-share audio", () => {
    expect(
      shouldTranslateForListener({
        listenerParticipantId: listenerA,
        sourceOwnerParticipantId: "participant-C",
        sourceType: "screen-share-audio",
      }),
    ).toBe(true);
  });
});