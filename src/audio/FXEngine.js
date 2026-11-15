/**
 * FXEngine - Master Sound Effects Insert Chain & Bus
 * Pure Web Audio API audio processor providing:
 * 1. Multi-mode Resonant Filter (Lowpass / Highpass)
 * 2. Analog Soft-Clipping Saturation / Drive (WaveShaper)
 * 3. Damped Stereo Tape Delay (DelayNode + Feedback Loop)
 * 4. Procedural Algorithmic Convolution Reverb (ConvolverNode)
 * Zero third-party bloat; click-free parameter interpolation with setTargetAtTime.
 */

export class FXEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.isInitialized = false;

    // Default FX State
    this.state = {
      globalBypass: false,
      filter: {
        enabled: true,
        type: 'lowpass', // 'lowpass' | 'highpass'
        cutoff: 20000,   // 20Hz - 20,000Hz
        q: 1.0           // 0.1 - 18.0
      },
      drive: {
        enabled: false,
        amount: 0.0,     // 0 - 50
        tone: 0.5        // Tone tilt
      },
      delay: {
        enabled: false,
        time: 0.30,      // 0.05s - 1.0s
        feedback: 0.35,  // 0.0 - 0.85
        mix: 0.30        // 0.0 - 1.0 (Dry/Wet)
      },
      reverb: {
        enabled: false,
        decay: 1.5,      // 0.2s - 4.0s
        mix: 0.25        // 0.0 - 1.0 (Dry/Wet)
      }
    };

    this.onStateChangeCallbacks = new Set();
  }

  /**
   * Initializes the FX graph with the given AudioContext.
   */
  init(audioContext) {
    if (this.isInitialized && this.ctx === audioContext) return;
    this.ctx = audioContext || this.ctx;
    if (!this.ctx) return;

    // 1. Input and Master Output Nodes
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();

    // 2. Filter Node
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = this.state.filter.type;
    this.filterNode.frequency.setValueAtTime(this.state.filter.cutoff, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(this.state.filter.q, this.ctx.currentTime);

    // Filter Dry/Wet Split for Bypass
    this.filterDry = this.ctx.createGain();
    this.filterWet = this.ctx.createGain();
    this.updateFilterBypassRouting();

    // 3. Analog Drive / WaveShaper Node
    this.driveNode = this.ctx.createWaveShaper();
    this.driveNode.oversample = '2x';
    this.updateDriveCurve(this.state.drive.amount);

    this.driveDry = this.ctx.createGain();
    this.driveWet = this.ctx.createGain();
    this.updateDriveBypassRouting();

    // 4. Stereo Delay with High-Cut Tape Damping
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(this.state.delay.time, this.ctx.currentTime);

    this.delayFeedbackNode = this.ctx.createGain();
    this.delayFeedbackNode.gain.setValueAtTime(this.state.delay.feedback, this.ctx.currentTime);

    this.delayDampingFilter = this.ctx.createBiquadFilter();
    this.delayDampingFilter.type = 'lowpass';
    this.delayDampingFilter.frequency.setValueAtTime(3800, this.ctx.currentTime);

    this.delayDry = this.ctx.createGain();
    this.delayWet = this.ctx.createGain();
    this.updateDelayMixRouting();

    // Delay internal feedback loop: delay -> damping -> feedback -> delay
    this.delayNode.connect(this.delayDampingFilter);
    this.delayDampingFilter.connect(this.delayFeedbackNode);
    this.delayFeedbackNode.connect(this.delayNode);

    // 5. Procedural Convolution Reverb
    this.reverbNode = this.ctx.createConvolver();
    this.updateReverbImpulse(this.state.reverb.decay);

    this.reverbDry = this.ctx.createGain();
    this.reverbWet = this.ctx.createGain();
    this.updateReverbMixRouting();

    // 6. Global Bypass Direct Path
    this.globalDry = this.ctx.createGain();
    this.globalWet = this.ctx.createGain();

    // Wire up the Serial / Parallel routing graph:
    // Input -> [Global Bypass Split]
    // Wet Path:
    //   Filter Split -> Drive Split -> Delay Split -> Reverb Split -> Output
    this.rebuildAudioRouting();

    this.isInitialized = true;
  }

  /**
   * Constructs the complete insert routing graph.
   */
  rebuildAudioRouting() {
    try {
      // Disconnect all to cleanly rewire
      this.inputNode.disconnect();
      this.filterDry.disconnect();
      this.filterWet.disconnect();
      this.filterNode.disconnect();
      this.driveDry.disconnect();
      this.driveWet.disconnect();
      this.driveNode.disconnect();
      this.delayDry.disconnect();
      this.delayWet.disconnect();
      this.reverbDry.disconnect();
      this.reverbWet.disconnect();
      this.reverbNode.disconnect();
      this.globalDry.disconnect();
      this.globalWet.disconnect();

      // --- 1. Global Bypass Path ---
      this.inputNode.connect(this.globalDry);
      this.globalDry.connect(this.outputNode);

      // --- 2. Wet FX Chain ---
      this.inputNode.connect(this.globalWet);

      // Filter Section
      this.globalWet.connect(this.filterDry);
      this.globalWet.connect(this.filterNode);
      this.filterNode.connect(this.filterWet);

      // Sum Filter -> Drive Section
      const driveInput = this.ctx.createGain();
      this.filterDry.connect(driveInput);
      this.filterWet.connect(driveInput);

      driveInput.connect(this.driveDry);
      driveInput.connect(this.driveNode);
      this.driveNode.connect(this.driveWet);

      // Sum Drive -> Delay Section
      const delayInput = this.ctx.createGain();
      this.driveDry.connect(delayInput);
      this.driveWet.connect(delayInput);

      delayInput.connect(this.delayDry);
      delayInput.connect(this.delayNode);
      this.delayNode.connect(this.delayWet);

      // Sum Delay -> Reverb Section
      const reverbInput = this.ctx.createGain();
      this.delayDry.connect(reverbInput);
      this.delayWet.connect(reverbInput);

      reverbInput.connect(this.reverbDry);
      reverbInput.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbWet);

      // Sum Reverb -> Master FX Output
      this.reverbDry.connect(this.outputNode);
      this.reverbWet.connect(this.outputNode);

      this.updateGlobalBypass();
    } catch (e) {
      console.warn('FXEngine rewire error:', e);
    }
  }

  // ==========================================
  // Filter Controls
  // ==========================================

  setFilterEnabled(enabled) {
    this.state.filter.enabled = Boolean(enabled);
    this.updateFilterBypassRouting();
    this.notifyState();
  }

  setFilterType(type) {
    if (!['lowpass', 'highpass'].includes(type)) return;
    this.state.filter.type = type;
    if (this.filterNode) {
      this.filterNode.type = type;
    }
    this.notifyState();
  }

  setFilterCutoff(freq) {
    const clamped = Math.max(20, Math.min(20000, freq));
    this.state.filter.cutoff = clamped;
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setTargetAtTime(clamped, this.ctx.currentTime, 0.015);
    }
    this.notifyState();
  }

  setFilterQ(q) {
    const clamped = Math.max(0.1, Math.min(18.0, q));
    this.state.filter.q = clamped;
    if (this.filterNode && this.ctx) {
      this.filterNode.Q.setTargetAtTime(clamped, this.ctx.currentTime, 0.015);
    }
    this.notifyState();
  }

  updateFilterBypassRouting() {
    if (!this.filterDry || !this.filterWet || !this.ctx) return;
    const isWet = this.state.filter.enabled;
    this.filterDry.gain.setTargetAtTime(isWet ? 0.0 : 1.0, this.ctx.currentTime, 0.01);
    this.filterWet.gain.setTargetAtTime(isWet ? 1.0 : 0.0, this.ctx.currentTime, 0.01);
  }

  // ==========================================
  // Drive / Saturation Controls
  // ==========================================

  setDriveEnabled(enabled) {
    this.state.drive.enabled = Boolean(enabled);
    this.updateDriveBypassRouting();
    this.notifyState();
  }

  setDriveAmount(amount) {
    const clamped = Math.max(0, Math.min(50, amount));
    this.state.drive.amount = clamped;
    this.updateDriveCurve(clamped);
    this.notifyState();
  }

  updateDriveCurve(amount) {
    if (!this.driveNode) return;
    const n = 1024;
    const curve = new Float32Array(n);
    const k = amount;

    if (k <= 0) {
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = x;
      }
    } else {
      // Soft-clipping hyperbolic analog saturation curve
      const deg = Math.PI / 180;
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        // Sigmoid soft-clipper
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    this.driveNode.curve = curve;
  }

  updateDriveBypassRouting() {
    if (!this.driveDry || !this.driveWet || !this.ctx) return;
    const isWet = this.state.drive.enabled;
    this.driveDry.gain.setTargetAtTime(isWet ? 0.0 : 1.0, this.ctx.currentTime, 0.01);
    this.driveWet.gain.setTargetAtTime(isWet ? 1.0 : 0.0, this.ctx.currentTime, 0.01);
  }

  // ==========================================
  // Delay Controls
  // ==========================================

  setDelayEnabled(enabled) {
    this.state.delay.enabled = Boolean(enabled);
    this.updateDelayMixRouting();
    this.notifyState();
  }

  setDelayTime(timeSec) {
    const clamped = Math.max(0.05, Math.min(1.2, timeSec));
    this.state.delay.time = clamped;
    if (this.delayNode && this.ctx) {
      this.delayNode.delayTime.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    }
    this.notifyState();
  }

  setDelayFeedback(fb) {
    const clamped = Math.max(0.0, Math.min(0.85, fb)); // Safe 85% ceiling
    this.state.delay.feedback = clamped;
    if (this.delayFeedbackNode && this.ctx) {
      this.delayFeedbackNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.015);
    }
    this.notifyState();
  }

  setDelayMix(mix) {
    const clamped = Math.max(0.0, Math.min(1.0, mix));
    this.state.delay.mix = clamped;
    this.updateDelayMixRouting();
    this.notifyState();
  }

  updateDelayMixRouting() {
    if (!this.delayDry || !this.delayWet || !this.ctx) return;
    const isEnabled = this.state.delay.enabled;
    const mix = isEnabled ? this.state.delay.mix : 0.0;
    // Equal power crossfade
    this.delayDry.gain.setTargetAtTime(1.0 - mix * 0.5, this.ctx.currentTime, 0.015);
    this.delayWet.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.015);
  }

  // ==========================================
  // Reverb Controls
  // ==========================================

  setReverbEnabled(enabled) {
    this.state.reverb.enabled = Boolean(enabled);
    this.updateReverbMixRouting();
    this.notifyState();
  }

  setReverbDecay(decaySec) {
    const clamped = Math.max(0.2, Math.min(4.5, decaySec));
    this.state.reverb.decay = clamped;
    this.updateReverbImpulse(clamped);
    this.notifyState();
  }

  setReverbMix(mix) {
    const clamped = Math.max(0.0, Math.min(1.0, mix));
    this.state.reverb.mix = clamped;
    this.updateReverbMixRouting();
    this.notifyState();
  }

  updateReverbMixRouting() {
    if (!this.reverbDry || !this.reverbWet || !this.ctx) return;
    const isEnabled = this.state.reverb.enabled;
    const mix = isEnabled ? this.state.reverb.mix : 0.0;
    this.reverbDry.gain.setTargetAtTime(1.0 - mix * 0.4, this.ctx.currentTime, 0.015);
    this.reverbWet.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.015);
  }

  /**
   * Generates a stereo algorithmic impulse response client-side.
   * Completely zero external WAV assets needed.
   */
  updateReverbImpulse(decaySec) {
    if (!this.reverbNode || !this.ctx) return;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * decaySec);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Exponential decay envelope with stereo decorrelation
      const env = Math.exp(-t * 5.0);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    this.reverbNode.buffer = impulse;
  }

  // ==========================================
  // Global Bypass
  // ==========================================

  setGlobalBypass(isBypassed) {
    this.state.globalBypass = Boolean(isBypassed);
    this.updateGlobalBypass();
    this.notifyState();
  }

  updateGlobalBypass() {
    if (!this.globalDry || !this.globalWet || !this.ctx) return;
    const isBypassed = this.state.globalBypass;
    this.globalDry.gain.setTargetAtTime(isBypassed ? 1.0 : 0.0, this.ctx.currentTime, 0.01);
    this.globalWet.gain.setTargetAtTime(isBypassed ? 0.0 : 1.0, this.ctx.currentTime, 0.01);
  }

  // ==========================================
  // State Import / Export
  // ==========================================

  loadState(savedState) {
    if (!savedState) return;
    if (savedState.filter) {
      if (savedState.filter.type) this.setFilterType(savedState.filter.type);
      if (savedState.filter.cutoff !== undefined) this.setFilterCutoff(savedState.filter.cutoff);
      if (savedState.filter.q !== undefined) this.setFilterQ(savedState.filter.q);
      if (savedState.filter.enabled !== undefined) this.setFilterEnabled(savedState.filter.enabled);
    }
    if (savedState.drive) {
      if (savedState.drive.amount !== undefined) this.setDriveAmount(savedState.drive.amount);
      if (savedState.drive.enabled !== undefined) this.setDriveEnabled(savedState.drive.enabled);
    }
    if (savedState.delay) {
      if (savedState.delay.time !== undefined) this.setDelayTime(savedState.delay.time);
      if (savedState.delay.feedback !== undefined) this.setDelayFeedback(savedState.delay.feedback);
      if (savedState.delay.mix !== undefined) this.setDelayMix(savedState.delay.mix);
      if (savedState.delay.enabled !== undefined) this.setDelayEnabled(savedState.delay.enabled);
    }
    if (savedState.reverb) {
      if (savedState.reverb.decay !== undefined) this.setReverbDecay(savedState.reverb.decay);
      if (savedState.reverb.mix !== undefined) this.setReverbMix(savedState.reverb.mix);
      if (savedState.reverb.enabled !== undefined) this.setReverbEnabled(savedState.reverb.enabled);
    }
    if (savedState.globalBypass !== undefined) {
      this.setGlobalBypass(savedState.globalBypass);
    }
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.add(cb);
    return () => this.onStateChangeCallbacks.delete(cb);
  }

  notifyState() {
    const snapshot = this.getState();
    for (const cb of this.onStateChangeCallbacks) {
      try { cb(snapshot); } catch (e) { console.error(e); }
    }
  }
}

export const fxEngine = new FXEngine();
