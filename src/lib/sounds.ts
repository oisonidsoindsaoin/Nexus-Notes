"use client";

// Web Audio API based sound system - no external files needed
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, volume: number, type: OscillatorType = "sine") {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors
  }
}

export function playClick(volume: number) {
  playTone(800, 0.05, volume, "sine");
}

export function playSave(volume: number) {
  playTone(523, 0.1, volume, "sine");
  setTimeout(() => playTone(659, 0.1, volume, "sine"), 60);
}

export function playNotification(volume: number) {
  playTone(880, 0.12, volume, "sine");
  setTimeout(() => playTone(1100, 0.15, volume, "sine"), 100);
}

export function playDelete(volume: number) {
  playTone(440, 0.1, volume, "triangle");
  setTimeout(() => playTone(330, 0.15, volume, "triangle"), 80);
}

export function playType(volume: number) {
  const freq = 400 + Math.random() * 200;
  playTone(freq, 0.03, volume * 0.5, "square");
}

export function playAiComplete(volume: number) {
  playTone(523, 0.08, volume, "sine");
  setTimeout(() => playTone(659, 0.08, volume, "sine"), 80);
  setTimeout(() => playTone(784, 0.12, volume, "sine"), 160);
}

export function playToggle(volume: number) {
  playTone(600, 0.05, volume, "sine");
}
