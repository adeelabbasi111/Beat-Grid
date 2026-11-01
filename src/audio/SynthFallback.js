/**
 * Procedural Drum Synthesizer (Web Audio API)
 * Pre-renders zero-dependency studio-quality drum samples into AudioBuffers
 * using OfflineAudioContext for instant, zero-latency playback across sound banks.
 */

/**
 * Renders an AudioBuffer using OfflineAudioContext.
 * @param {number} duration Duration in seconds
 * @param {function(OfflineAudioContext): void} buildGraph Connecting audio nodes to ctx.destination
 * @returns {Promise<AudioBuffer>}
 */
async function renderSample(duration, buildGraph) {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.max(1, Math.ceil(sampleRate * duration)), sampleRate);
  buildGraph(offlineCtx);
  return await offlineCtx.startRendering();
}

/**
 * Creates a white noise buffer for snares, claps, hats, and texture.
 */
function createNoiseBuffer(ctx, duration) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export const SynthGenerators = {
  // ==========================================
  // 1. 808 TRAP KIT GENERATORS
  // ==========================================
  '808-trap': {
    async kick() {
      return renderSample(0.5, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, 0);
        osc.frequency.exponentialRampToValueAtTime(36, 0.14);
        gain.gain.setValueAtTime(1.0, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.48);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(0.5);
      });
    },

    async snare() {
      return renderSample(0.3, (ctx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, 0);
        osc.frequency.exponentialRampToValueAtTime(90, 0.09);
        oscGain.gain.setValueAtTime(0.7, 0);
        oscGain.gain.exponentialRampToValueAtTime(0.01, 0.16);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(0);
        osc.stop(0.18);

        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.3);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1300;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.9, 0);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, 0.26);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async closedHat() {
      return renderSample(0.08, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.08);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7500;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.85, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.07);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async openHat() {
      return renderSample(0.35, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.35);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6800;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.32);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async clap() {
      return renderSample(0.32, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.32);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1450;
        filter.Q.value = 1.3;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, 0);
        gain.gain.exponentialRampToValueAtTime(0.05, 0.015);
        gain.gain.setValueAtTime(0.8, 0.016);
        gain.gain.exponentialRampToValueAtTime(0.05, 0.03);
        gain.gain.setValueAtTime(0.95, 0.031);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.3);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async rim() {
      return renderSample(0.08, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, 0);
        osc.frequency.exponentialRampToValueAtTime(220, 0.03);
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async tom(frequency = 120) {
      return renderSample(0.35, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency * 1.5, 0);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.7, 0.15);
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async perc(baseFreq = 540) {
      return renderSample(0.2, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 2, 0);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, 0.09);
        gain.gain.setValueAtTime(0.8, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async sub(freq = 65.4) {
      return renderSample(0.6, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.2, 0);
        osc.frequency.exponentialRampToValueAtTime(freq, 0.05);
        gain.gain.setValueAtTime(1.0, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.58);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async cowbell() {
      return renderSample(0.3, (ctx) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'square';
        osc1.frequency.value = 587; // D5
        osc2.type = 'square';
        osc2.frequency.value = 845; // ~G#5

        filter.type = 'bandpass';
        filter.frequency.value = 820;
        filter.Q.value = 3.5;

        gain.gain.setValueAtTime(0.8, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.28);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(0);
        osc2.start(0);
      });
    }
  },

  // ==========================================
  // 2. LO-FI CHILL KIT GENERATORS (Warm, Filtered)
  // ==========================================
  'lofi-chill': {
    async kick() {
      return renderSample(0.35, (ctx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, 0);
        osc.frequency.exponentialRampToValueAtTime(42, 0.12);

        filter.type = 'lowpass';
        filter.frequency.value = 2200;

        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.32);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async snare() {
      return renderSample(0.24, (ctx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, 0);
        osc.frequency.exponentialRampToValueAtTime(95, 0.08);
        oscGain.gain.setValueAtTime(0.6, 0);
        oscGain.gain.exponentialRampToValueAtTime(0.01, 0.14);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(0);

        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.24);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3800; // Mellow warmth
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.65, 0);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, 0.22);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async closedHat() {
      return renderSample(0.09, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.09);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 4500;
        filter.Q.value = 1.2;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.08);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async openHat() {
      return renderSample(0.3, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.3);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 4200;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.65, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.28);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async clap() {
      return renderSample(0.28, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.28);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2600;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, 0);
        gain.gain.exponentialRampToValueAtTime(0.05, 0.02);
        gain.gain.setValueAtTime(0.7, 0.021);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.25);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async rim() {
      return renderSample(0.09, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, 0);
        osc.frequency.exponentialRampToValueAtTime(240, 0.04);
        gain.gain.setValueAtTime(0.85, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async tom(frequency = 110) {
      return renderSample(0.3, (ctx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency * 1.3, 0);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.75, 0.14);
        filter.type = 'lowpass';
        filter.frequency.value = 1800;
        gain.gain.setValueAtTime(0.85, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.28);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async perc(baseFreq = 380) {
      return renderSample(0.22, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * 1.5, 0);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, 0.1);
        gain.gain.setValueAtTime(0.7, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async sub(freq = 65.4) {
      return renderSample(0.55, (ctx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, 0);
        filter.type = 'lowpass';
        filter.frequency.value = 350;
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.52);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async cowbell() {
      return renderSample(0.25, (ctx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 520;
        filter.type = 'lowpass';
        filter.frequency.value = 1800;
        gain.gain.setValueAtTime(0.65, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.22);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    }
  },

  // ==========================================
  // 3. ELECTRO SYNTH KIT GENERATORS (Sharp, Resonant)
  // ==========================================
  'electro-synth': {
    async kick() {
      return renderSample(0.38, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, 0);
        osc.frequency.exponentialRampToValueAtTime(48, 0.08);
        gain.gain.setValueAtTime(1.0, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async snare() {
      return renderSample(0.26, (ctx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, 0);
        osc.frequency.exponentialRampToValueAtTime(140, 0.05);
        oscGain.gain.setValueAtTime(0.5, 0);
        oscGain.gain.exponentialRampToValueAtTime(0.01, 0.12);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(0);

        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.26);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2400;
        filter.Q.value = 2.0;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.85, 0);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, 0.24);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async closedHat() {
      return renderSample(0.06, (ctx) => {
        const osc = ctx.createOscillator();
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.06);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 9000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.05);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async openHat() {
      return renderSample(0.4, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.4);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8500;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.85, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.38);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async clap() {
      return renderSample(0.28, (ctx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.28);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2100;
        filter.Q.value = 2.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.95, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.26);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(0);
      });
    },

    async rim() {
      return renderSample(0.06, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, 0);
        osc.frequency.exponentialRampToValueAtTime(300, 0.03);
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async tom(frequency = 140) {
      return renderSample(0.32, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency * 2.2, 0);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.8, 0.12);
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async perc(baseFreq = 620) {
      // Laser / zap effect
      return renderSample(0.22, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, 0);
        osc.frequency.exponentialRampToValueAtTime(120, 0.15);
        gain.gain.setValueAtTime(0.75, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async sub(freq = 65.4) {
      return renderSample(0.5, (ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, 0);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 240;
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.48);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
      });
    },

    async cowbell() {
      return renderSample(0.28, (ctx) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'square';
        osc1.frequency.value = 800;
        osc2.type = 'square';
        osc2.frequency.value = 540;

        filter.type = 'bandpass';
        filter.frequency.value = 950;
        filter.Q.value = 4.0;

        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.26);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(0);
        osc2.start(0);
      });
    }
  }
};
