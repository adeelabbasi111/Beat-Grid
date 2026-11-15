/**
 * SequencerEngine - Precision 16-Step Looper & Lookahead Clock Scheduler
 * Implements Chris Wilson's Web Audio "A Tale of Two Clocks" architecture
 * for sample-accurate, zero-jitter rhythmic playback, live recording, and swing groove.
 */

import { audioEngine } from './AudioEngine.js';
import { bufferLoader } from './BufferLoader.js';
import { createEmptyPattern, FACTORY_PATTERNS } from '../config/patterns.js';

class SequencerEngine {
  constructor() {
    this.isPlaying = false;
    this.isRecording = false;
    this.metronomeEnabled = false;

    this.bpm = 120;
    this.swing = 0; // 0% to 50%
    this.activeTrackId = 0; // Currently focused pad track (0 - 15)

    // 16 pads x 16 steps matrix
    this.grid = createEmptyPattern();

    // Lookahead scheduling clock variables
    this.lookahead = 25.0; // Interval frequency in ms
    this.scheduleAheadTime = 0.1; // Scheduling window in seconds (100ms)
    this.currentStep = 0; // 0 to 15
    this.nextStepTime = 0.0;
    this.loopStartTime = 0.0;
    this.timerID = null;

    // Callbacks
    this.onStepCallbacks = new Set();
    this.onStateChangeCallbacks = new Set();
    this.onPatternChangeCallbacks = new Set();
    this.onTrackChangeCallbacks = new Set();

    // Load initial default 808 Trap pattern
    this.loadFactoryPreset('808-trap');
  }

  /**
   * Loads a factory pattern preset.
   */
  loadFactoryPreset(presetId) {
    const preset = FACTORY_PATTERNS[presetId] || FACTORY_PATTERNS['808-trap'];
    this.bpm = preset.tempo;
    this.swing = preset.swing;
    // Deep clone grid
    this.grid = preset.grid.map((row) => [...row]);
    this.notifyPatternChange();
  }

  /**
   * Starts playback loop using Web Audio lookahead.
   */
  async play() {
    if (this.isPlaying) return;

    await audioEngine.ensureRunning();

    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = audioEngine.ctx.currentTime + 0.05;
    this.loopStartTime = this.nextStepTime;

    this.notifyStateChange();
    this.timerID = setInterval(() => this.scheduler(), this.lookahead);
  }

  /**
   * Pauses playback loop.
   */
  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
    this.notifyStateChange();
  }

  /**
   * Stops playback and resets playhead to step 0.
   */
  stop() {
    this.pause();
    this.currentStep = 0;
    this.notifyStep(0, 0);
  }

  /**
   * Toggles Live Recording mode.
   */
  toggleRecord() {
    this.isRecording = !this.isRecording;
    this.notifyStateChange();
    return this.isRecording;
  }

  /**
   * Toggles metronome click output.
   */
  toggleMetronome() {
    this.metronomeEnabled = !this.metronomeEnabled;
    return this.metronomeEnabled;
  }

  /**
   * Sets active focused pad track for 16-step editing.
   */
  setActiveTrack(trackId) {
    if (trackId >= 0 && trackId < 16) {
      this.activeTrackId = trackId;
      this.notifyTrackChange(trackId);
    }
  }

  /**
   * Sets BPM tempo.
   */
  setBpm(newBpm) {
    this.bpm = Math.max(60, Math.min(220, newBpm));
  }

  /**
   * Sets swing percentage (0 to 50%).
   */
  setSwing(newSwing) {
    this.swing = Math.max(0, Math.min(50, newSwing));
  }

  /**
   * Toggles a step on/off for a track.
   */
  toggleStep(trackId, stepIndex) {
    if (this.grid[trackId] && stepIndex >= 0 && stepIndex < 16) {
      this.grid[trackId][stepIndex] = this.grid[trackId][stepIndex] ? 0 : 1;
      this.notifyPatternChange();
    }
  }

  /**
   * Clears the current active track's steps.
   */
  clearActiveTrack() {
    if (this.grid[this.activeTrackId]) {
      this.grid[this.activeTrackId].fill(0);
      this.notifyPatternChange();
    }
  }

  /**
   * Clears all 16 tracks.
   */
  clearAll() {
    this.grid = createEmptyPattern();
    this.notifyPatternChange();
  }

  /**
   * Retrieves clone of the current 16x16 pattern matrix.
   */
  getPattern() {
    return JSON.parse(JSON.stringify(this.grid));
  }

  /**
   * Restores a 16x16 pattern matrix.
   */
  setPattern(newGrid) {
    if (Array.isArray(newGrid) && newGrid.length === 16) {
      this.grid = JSON.parse(JSON.stringify(newGrid));
      this.notifyPatternChange();
    }
  }

  /**
   * Quantized Live Recording: Snaps a real-time pad strike into the sequence.
   * Features swing-aware quantization thresholding so recorded hits align with swung audio.
   */
  recordHit(trackId) {
    if (!this.isPlaying || !this.isRecording || !audioEngine.ctx) return;

    const secondsPer16th = (60.0 / this.bpm) * 0.25;
    const elapsed = Math.max(0, audioEngine.ctx.currentTime - this.loopStartTime);
    
    let quantizedStep;
    if (this.swing > 0) {
      const swingRatio = (this.swing / 100.0) * 0.33;
      const pairDuration = secondsPer16th * 2.0;
      const pairIndex = Math.floor(elapsed / pairDuration);
      const withinPair = elapsed - (pairIndex * pairDuration);
      
      const mid1 = 0.5 * secondsPer16th * (1.0 + swingRatio);
      const mid2 = secondsPer16th * (1.5 + 0.5 * swingRatio);
      
      let stepInPair;
      if (withinPair < mid1) {
        stepInPair = 0;
      } else if (withinPair < mid2) {
        stepInPair = 1;
      } else {
        stepInPair = 2; // Next even step
      }
      
      const rawStep = (pairIndex * 2) + stepInPair;
      quantizedStep = ((rawStep % 16) + 16) % 16;
    } else {
      // Mathematical nearest 16th note quantization
      const rawStep = Math.round(elapsed / secondsPer16th);
      quantizedStep = ((rawStep % 16) + 16) % 16;
    }

    if (this.grid[trackId]) {
      this.grid[trackId][quantizedStep] = 1;
      this.notifyPatternChange();
    }
  }

  /**
   * The Lookahead Scheduler loop.
   * Runs every 25ms, queuing all notes within the 100ms future window.
   */
  scheduler() {
    if (!audioEngine.ctx) return;

    while (this.nextStepTime < audioEngine.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  /**
   * Schedules all active track audio buffers for stepIndex at timestamp 'time'.
   */
  scheduleStep(stepIndex, time) {
    // 1. Play active instrument voices
    for (let trackId = 0; trackId < 16; trackId++) {
      if (this.grid[trackId][stepIndex] === 1) {
        const buffer = bufferLoader.getBuffer(trackId);
        if (buffer) {
          audioEngine.scheduleBuffer(buffer, time);
        }
      }
    }

    // 2. Metronome acoustic click
    if (this.metronomeEnabled && stepIndex % 4 === 0) {
      const isDownbeat = stepIndex === 0;
      audioEngine.playMetronomeClick(time, isDownbeat);
    }

    // 3. Emit step event for visual playhead animation
    this.notifyStep(stepIndex, time);
  }

  /**
   * Advances step pointer and calculates Roger Linn swing offset.
   */
  advanceStep() {
    const secondsPer16th = (60.0 / this.bpm) * 0.25;

    // Swing algorithm: Delay even 16th notes (steps 1, 3, 5, 7, etc.)
    let stepDuration = secondsPer16th;
    if (this.swing > 0) {
      const swingRatio = (this.swing / 100.0) * 0.33;
      if (this.currentStep % 2 === 0) {
        // First 16th note is lengthened
        stepDuration = secondsPer16th * (1.0 + swingRatio);
      } else {
        // Second 16th note is shortened
        stepDuration = secondsPer16th * (1.0 - swingRatio);
      }
    }

    this.nextStepTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  // Event Listeners
  onStep(cb) {
    this.onStepCallbacks.add(cb);
    return () => this.onStepCallbacks.delete(cb);
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.add(cb);
    return () => this.onStateChangeCallbacks.delete(cb);
  }

  onPatternChange(cb) {
    this.onPatternChangeCallbacks.add(cb);
    return () => this.onPatternChangeCallbacks.delete(cb);
  }

  onTrackChange(cb) {
    this.onTrackChangeCallbacks.add(cb);
    return () => this.onTrackChangeCallbacks.delete(cb);
  }

  notifyStep(step, time) {
    for (const cb of this.onStepCallbacks) cb(step, time);
  }

  notifyStateChange() {
    for (const cb of this.onStateChangeCallbacks) {
      cb({ isPlaying: this.isPlaying, isRecording: this.isRecording });
    }
  }

  notifyPatternChange() {
    for (const cb of this.onPatternChangeCallbacks) cb(this.grid);
  }

  notifyTrackChange(trackId) {
    for (const cb of this.onTrackChangeCallbacks) cb(trackId);
  }
}

export const sequencerEngine = new SequencerEngine();
