/**
 * Cinematic Audio Effects for Narvo — broadcast-grade cues.
 * Uses Tone.js to synthesize realistic news broadcast intro, mid-break, and outro sounds.
 * Scoped exclusively to the Briefing section.
 */

import * as Tone from 'tone';

let initialized = false;
let masterGain: Tone.Gain | null = null;
let reverb: Tone.Reverb | null = null;
let compressor: Tone.Compressor | null = null;

async function ensureInit(): Promise<void> {
  if (initialized) return;
  await Tone.start();

  compressor = new Tone.Compressor({
    threshold: -20,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
  }).toDestination();
  reverb = new Tone.Reverb({ decay: 3, wet: 0.25 }).connect(compressor);
  masterGain = new Tone.Gain(0.7).connect(reverb);

  initialized = true;
}

/**
 * NEWS BROADCAST INTRO
 */
export async function playBriefingIntro(): Promise<void> {
  await ensureInit();
  const now = Tone.now();

  const sub = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.3, decay: 0.6, sustain: 0.4, release: 1.5 },
    volume: -12,
  }).connect(masterGain!);
  sub.triggerAttackRelease('C2', '2n', now);

  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.4, decay: 0.5, sustain: 0.3, release: 2 },
    volume: -16,
  }).connect(masterGain!);
  pad.triggerAttackRelease(['C3', 'E3', 'G3'], '2n', now + 0.2);
  pad.triggerAttackRelease(['C4', 'E4', 'G4'], '4n', now + 0.6);

  const stab = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.6 },
    volume: -20,
  }).connect(masterGain!);
  stab.triggerAttackRelease(['E5', 'G5', 'B5'], '16n', now + 1.0);

  const noise = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.6, decay: 0.4, sustain: 0, release: 0.5 },
    volume: -26,
  });
  const lpf = new Tone.Filter({ frequency: 200, type: 'lowpass' }).connect(masterGain!);
  noise.connect(lpf);
  lpf.frequency.rampTo(4000, 0.8, now + 0.1);
  noise.triggerAttackRelease('1n', now + 0.1);

  setTimeout(() => {
    sub.dispose();
    pad.dispose();
    stab.dispose();
    noise.dispose();
    lpf.dispose();
  }, 5000);
}

/**
 * MID-COMMERCIAL / SECTION DIVIDER
 */
export async function playSectionDivider(): Promise<void> {
  await ensureInit();
  const now = Tone.now();

  const bell = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.4, sustain: 0, release: 1.2 },
    volume: -18,
  }).connect(masterGain!);
  bell.triggerAttackRelease('E5', '8n', now);

  const sweep = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.15, decay: 0.3, sustain: 0, release: 0.6 },
    volume: -24,
  }).connect(masterGain!);
  sweep.triggerAttackRelease('G3', '4n', now + 0.05);

  const tick = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
    volume: -30,
  }).connect(masterGain!);
  tick.triggerAttackRelease('32n', now + 0.02);

  setTimeout(() => {
    bell.dispose();
    sweep.dispose();
    tick.dispose();
  }, 3000);
}

/**
 * NEWS BROADCAST OUTRO
 */
export async function playBriefingOutro(): Promise<void> {
  await ensureInit();
  const now = Tone.now();

  const chord = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.1, decay: 0.4, sustain: 0.2, release: 2.5 },
    volume: -16,
  }).connect(masterGain!);
  chord.triggerAttackRelease(['G4', 'B4', 'D5'], '4n', now);
  chord.triggerAttackRelease(['E4', 'G4', 'C5'], '4n', now + 0.4);
  chord.triggerAttackRelease(['C4', 'E4', 'G4'], '2n', now + 0.8);

  const bass = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.2, decay: 0.8, sustain: 0.1, release: 2 },
    volume: -14,
  }).connect(masterGain!);
  bass.triggerAttackRelease('C2', '2n', now + 0.8);

  const shimmer = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.3, decay: 1.0, sustain: 0, release: 2 },
    volume: -28,
  }).connect(masterGain!);
  shimmer.triggerAttackRelease('G5', '2n', now + 1.2);

  setTimeout(() => {
    chord.dispose();
    bass.dispose();
    shimmer.dispose();
  }, 6000);
}

export function isAudioReady(): boolean {
  return initialized && Tone.context.state === 'running';
}

export function dispose(): void {
  if (masterGain) {
    masterGain.dispose();
    masterGain = null;
  }
  if (reverb) {
    reverb.dispose();
    reverb = null;
  }
  if (compressor) {
    compressor.dispose();
    compressor = null;
  }
  initialized = false;
}
