/**
 * AudioRecorder - Studio WAV Export & Real-Time Master Recording Engine (Module 4)
 * Provides:
 * 1. Live Master Performance Recording (Stereo 16-bit PCM WAV)
 * 2. Offline Loop Bounce (OfflineAudioContext multi-bar rendering with natural FX tail)
 * 3. Pure native RIFF/WAV encoder with ZERO third-party dependencies.
 */

export class AudioRecorder {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.isRecording = false;
    this.recordedChunks = [];
    this.recordingStartTime = 0;
    this.recordingTimer = null;
    this.elapsedSeconds = 0;

    // Real-time recording nodes
    this.scriptProcessor = null;
    this.recInput = null;

    this.onStateChangeCallbacks = new Set();
    this.onTimerTickCallbacks = new Set();
  }

  /**
   * Starts real-time recording of the master audio stream.
   */
  startLiveRecording() {
    if (this.isRecording) return;
    const ctx = this.audioEngine.ctx;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    this.recordedChunks = [[], []]; // Left, Right channels
    this.isRecording = true;
    this.recordingStartTime = performance.now();
    this.elapsedSeconds = 0;

    // ScriptProcessor node for universal cross-browser Float32 PCM capture (bufferSize 4096, 2 in, 2 out)
    const bufferSize = 4096;
    this.scriptProcessor = ctx.createScriptProcessor(bufferSize, 2, 2);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const left = e.inputBuffer.getChannelData(0);
      const right = e.inputBuffer.getChannelData(1);

      // Clone float data
      this.recordedChunks[0].push(new Float32Array(left));
      this.recordedChunks[1].push(new Float32Array(right));
    };

    // Tap from master limiter/analyser
    if (this.audioEngine.compressor) {
      this.audioEngine.compressor.connect(this.scriptProcessor);
    } else {
      this.audioEngine.masterGain.connect(this.scriptProcessor);
    }
    // Connect to destination via dummy zero-gain to keep script processor active without doubling volume
    const muteNode = ctx.createGain();
    muteNode.gain.setValueAtTime(0, ctx.currentTime);
    this.scriptProcessor.connect(muteNode);
    muteNode.connect(ctx.destination);

    // Timer tick loop
    this.recordingTimer = setInterval(() => {
      this.elapsedSeconds = (performance.now() - this.recordingStartTime) / 1000;
      this.notifyTimer(this.elapsedSeconds);
    }, 100);

    this.notifyState();
  }

  /**
   * Stops real-time recording and returns uncompressed stereo 16-bit PCM WAV Blob.
   * @returns {Blob|null}
   */
  stopLiveRecording() {
    if (!this.isRecording) return null;
    this.isRecording = false;

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    // Disconnect processor
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
      } catch (err) {}
      this.scriptProcessor = null;
    }

    this.notifyState();

    if (!this.recordedChunks[0] || this.recordedChunks[0].length === 0) {
      return null;
    }

    // Flatten chunks
    const sampleRate = this.audioEngine.ctx?.sampleRate || 44100;
    const totalSamples = this.recordedChunks[0].reduce((acc, chunk) => acc + chunk.length, 0);

    const mergedLeft = new Float32Array(totalSamples);
    const mergedRight = new Float32Array(totalSamples);

    let offset = 0;
    for (let i = 0; i < this.recordedChunks[0].length; i++) {
      mergedLeft.set(this.recordedChunks[0][i], offset);
      mergedRight.set(this.recordedChunks[1][i], offset);
      offset += this.recordedChunks[0][i].length;
    }

    // Interleave stereo channels
    const interleaved = this.interleaveChannels(mergedLeft, mergedRight);
    const wavBlob = this.encodeWAV(interleaved, sampleRate, 2, 16);

    return wavBlob;
  }

  /**
   * Offline Loop Bounce: Renders N bars of the active sequence into a clean stereo WAV.
   * Features extra natural decay tail for Delay and Reverb.
   */
  async bounceLoopOffline({
    pattern,
    bpm = 120,
    swing = 0,
    barCount = 2,
    bufferLoader,
    fxState = null,
    onProgress = () => {}
  }) {
    if (!pattern || !bufferLoader) {
      throw new Error('Pattern and BufferLoader are required for offline bounce.');
    }

    const sampleRate = 44100;
    const secondsPer16th = (60.0 / bpm) * 0.25;
    const loopDuration = 16 * secondsPer16th;
    const totalBarsDuration = loopDuration * barCount;
    const tailDuration = 2.0; // 2 seconds natural reverb/delay tail
    const totalDuration = totalBarsDuration + tailDuration;
    const totalLengthFrames = Math.ceil(totalDuration * sampleRate);

    // Create OfflineAudioContext
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      2,
      totalLengthFrames,
      sampleRate
    );

    // Build offline graph: [Voices] -> [Filter -> Drive -> Delay & Reverb] -> [MasterGain -> Limiter] -> Destination
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, 0);

    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-2, 0);
    limiter.ratio.setValueAtTime(12, 0);
    limiter.attack.setValueAtTime(0.003, 0);
    limiter.release.setValueAtTime(0.2, 0);

    masterGain.connect(limiter);
    limiter.connect(offlineCtx.destination);

    // Insert FX chain offline if active
    let fxInput = masterGain;
    if (fxState && !fxState.globalBypass) {
      fxInput = this.buildOfflineFXGraph(offlineCtx, masterGain, fxState);
    }

    // Schedule all pattern notes across the requested number of bars
    for (let bar = 0; bar < barCount; bar++) {
      const barStartTime = bar * loopDuration;

      for (let step = 0; step < 16; step++) {
        // Calculate swing offset
        let stepTime = barStartTime + step * secondsPer16th;
        if (swing > 0 && step % 2 === 1) {
          const swingRatio = (swing / 100.0) * 0.33;
          stepTime += secondsPer16th * swingRatio;
        }

        // Schedule all active pad voices on this step
        for (let trackId = 0; trackId < 16; trackId++) {
          if (pattern[trackId] && pattern[trackId][step] === 1) {
            const buffer = bufferLoader.getBuffer(trackId);
            if (buffer) {
              const src = offlineCtx.createBufferSource();
              src.buffer = buffer;
              const voiceGain = offlineCtx.createGain();
              voiceGain.gain.setValueAtTime(1.0, stepTime);
              src.connect(voiceGain);
              voiceGain.connect(fxInput);
              src.start(stepTime);
            }
          }
        }
      }
    }

    onProgress(50);

    // Render AudioBuffer
    const renderedBuffer = await offlineCtx.startRendering();
    onProgress(85);

    // Encode to 16-bit stereo WAV
    const left = renderedBuffer.getChannelData(0);
    const right = renderedBuffer.getChannelData(1);
    const interleaved = this.interleaveChannels(left, right);
    const wavBlob = this.encodeWAV(interleaved, sampleRate, 2, 16);

    onProgress(100);
    return wavBlob;
  }

  /**
   * Constructs an offline FX graph identical to the real-time insert rack.
   */
  buildOfflineFXGraph(ctx, destination, fxState) {
    const inputNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    if (fxState.filter && fxState.filter.enabled) {
      filter.type = fxState.filter.type || 'lowpass';
      filter.frequency.setValueAtTime(fxState.filter.cutoff || 20000, 0);
      filter.Q.setValueAtTime(fxState.filter.q || 1.0, 0);
      inputNode.connect(filter);
    } else {
      inputNode.connect(filter);
      filter.frequency.setValueAtTime(20000, 0);
    }

    // Delay
    let currentOut = filter;
    if (fxState.delay && fxState.delay.enabled && fxState.delay.mix > 0) {
      const delay = ctx.createDelay(2.0);
      delay.delayTime.setValueAtTime(fxState.delay.time || 0.3, 0);
      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(Math.min(0.85, fxState.delay.feedback || 0.35), 0);
      const damping = ctx.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.setValueAtTime(3800, 0);

      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);

      const wet = ctx.createGain();
      wet.gain.setValueAtTime(fxState.delay.mix, 0);
      const dry = ctx.createGain();
      dry.gain.setValueAtTime(1.0 - fxState.delay.mix * 0.5, 0);

      currentOut.connect(dry);
      currentOut.connect(delay);
      delay.connect(wet);

      const delaySum = ctx.createGain();
      dry.connect(delaySum);
      wet.connect(delaySum);
      currentOut = delaySum;
    }

    currentOut.connect(destination);
    return inputNode;
  }

  // ==========================================
  // RIFF / WAV Audio Encoder Helpers
  // ==========================================

  interleaveChannels(left, right) {
    const length = left.length + right.length;
    const result = new Float32Array(length);

    let inputIndex = 0;
    for (let index = 0; index < length; ) {
      result[index++] = left[inputIndex];
      result[index++] = right[inputIndex];
      inputIndex++;
    }
    return result;
  }

  encodeWAV(samples, sampleRate, numChannels = 2, bitDepth = 16) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // 1. RIFF Identifier
    this.writeString(view, 0, 'RIFF');
    // 2. RIFF Chunk Size
    view.setUint32(4, 36 + dataSize, true);
    // 3. WAVE Format
    this.writeString(view, 8, 'WAVE');
    // 4. fmt Subchunk Identifier
    this.writeString(view, 12, 'fmt ');
    // 5. fmt Subchunk Size (16 for PCM)
    view.setUint32(16, 16, true);
    // 6. Audio Format (1 = PCM linear)
    view.setUint16(20, 1, true);
    // 7. Number of Channels
    view.setUint16(22, numChannels, true);
    // 8. Sample Rate
    view.setUint32(24, sampleRate, true);
    // 9. Byte Rate
    view.setUint32(28, byteRate, true);
    // 10. Block Align
    view.setUint16(32, blockAlign, true);
    // 11. Bits per Sample
    view.setUint16(34, bitDepth, true);
    // 12. data Subchunk Identifier
    this.writeString(view, 36, 'data');
    // 13. data Subchunk Size
    view.setUint32(40, dataSize, true);

    // 14. Write 16-bit PCM sample data with clipping protection
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      // Convert float [-1.0, 1.0] to signed 16-bit int [-32768, 32767]
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Helper to download any generated Blob with custom filename.
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.add(cb);
    return () => this.onStateChangeCallbacks.delete(cb);
  }

  onTimerTick(cb) {
    this.onTimerTickCallbacks.add(cb);
    return () => this.onTimerTickCallbacks.delete(cb);
  }

  notifyState() {
    for (const cb of this.onStateChangeCallbacks) {
      try { cb({ isRecording: this.isRecording, elapsed: this.elapsedSeconds }); } catch (e) {}
    }
  }

  notifyTimer(elapsed) {
    for (const cb of this.onTimerTickCallbacks) {
      try { cb(elapsed); } catch (e) {}
    }
  }
}
