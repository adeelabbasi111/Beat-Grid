/**
 * AudioEngine - Core Web Audio API Manager
 * Manages the singleton AudioContext, Master Gain, and Real-Time Analyser.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.isInitialized = false;
    this.onStateChangeCallbacks = new Set();
  }

  /**
   * Initializes the AudioContext graph upon user interaction.
   */
  init() {
    if (this.isInitialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    this.ctx = new AudioContextClass({
      latencyHint: 'interactive'
    });

    // Master Gain Node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Studio Brickwall Limiter / Compressor to prevent polyphonic distortion
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-3, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Fast Real-Time Waveform Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.6;

    // Connect graph: Voice -> MasterGain -> Compressor -> Analyser -> Speakers
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Track context state changes
    this.ctx.onstatechange = () => {
      this.notifyStateChange(this.ctx.state);
    };

    this.isInitialized = true;
  }

  /**
   * Resumes the AudioContext to comply with browser autoplay policies.
   * Safe to call anywhere: swallows autoplay rejection before user gesture.
   */
  async ensureRunning() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        this.notifyStateChange(this.ctx.state);
      } catch (e) {
        // Expected when called on initial page load before a user gesture.
        // Will automatically resolve upon first click or keypress.
      }
    }
    return this.ctx?.state === 'running';
  }

  /**
   * Plays a pre-decoded AudioBuffer with sub-millisecond latency.
   * @param {AudioBuffer} buffer The audio buffer to play
   * @param {object} options Playback parameters
   * @param {number} [options.volume=1.0] Individual voice volume (0.0 - 1.0)
   * @param {number} [options.playbackRate=1.0] Pitch / speed multiplier
   * @returns {{ source: AudioBufferSourceNode, gainNode: GainNode }|null}
   */
  playBuffer(buffer, { volume = 1.0, playbackRate = 1.0 } = {}) {
    if (!buffer) return null;
    if (!this.isInitialized) {
      this.init();
    }

    // Auto-resume if needed
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);

    // Individual Voice Gain Node
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);

    source.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    source.start(0);
    return { source, gainNode: voiceGain };
  }

  /**
   * Sets master output volume.
   * @param {number} value Level between 0.0 and 1.0
   */
  setMasterVolume(value) {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, value));
    // Smooth ramp to avoid audio clicking artifacts
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.015);
  }

  /**
   * Gets current audio energy level for visual meters.
   * @returns {number} Average frequency amplitude (0 - 255)
   */
  getAudioLevel() {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length;
  }

  onStateChange(callback) {
    this.onStateChangeCallbacks.add(callback);
    return () => this.onStateChangeCallbacks.delete(callback);
  }

  notifyStateChange(state) {
    for (const cb of this.onStateChangeCallbacks) {
      try { cb(state); } catch (e) { console.error(e); }
    }
  }
}

export const audioEngine = new AudioEngine();
