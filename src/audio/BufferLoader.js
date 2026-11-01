/**
 * BufferLoader - Audio Asset & Soundbank Loading Pipeline
 * Fetches, decodes, synthesizes, and caches AudioBuffers in memory.
 */

import { audioEngine } from './AudioEngine.js';
import { SynthGenerators } from './SynthFallback.js';
import { PAD_MAPPINGS, SOUND_BANKS } from '../config/soundBanks.js';

class BufferLoader {
  constructor() {
    this.bufferCache = new Map(); // key -> AudioBuffer
    this.activeBankBuffers = new Map(); // padId (0-15) -> AudioBuffer
    this.activeBankId = '808-trap';
    this.isLoading = false;
  }

  /**
   * Fetches an external audio file and decodes it via AudioContext.decodeAudioData.
   * @param {string} url URL of the audio file (.wav, .mp3, .ogg)
   * @returns {Promise<AudioBuffer>}
   */
  async loadAudioFile(url) {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url);
    }

    if (!audioEngine.isInitialized) {
      audioEngine.init();
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} fetching ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await new Promise((resolve, reject) => {
        audioEngine.ctx.decodeAudioData(arrayBuffer, resolve, reject);
      });

      this.bufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (err) {
      console.warn(`[BufferLoader] Failed to fetch external audio asset '${url}'.`, err);
      throw err;
    }
  }

  /**
   * Decodes an uploaded or dropped File object directly.
   * @param {File} file
   * @returns {Promise<AudioBuffer>}
   */
  async decodeFileObject(file) {
    if (!audioEngine.isInitialized) {
      audioEngine.init();
    }
    const arrayBuffer = await file.arrayBuffer();
    return await new Promise((resolve, reject) => {
      audioEngine.ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  /**
   * Loads or synthesizes the full 16-pad sound bank.
   * Safe to call immediately on page load: synthesizes in background via OfflineAudioContext.
   * @param {string} bankId Identifier from SOUND_BANKS
   * @param {function({loaded: number, total: number, percent: number}): void} [onProgress]
   * @returns {Promise<Map<number, AudioBuffer>>}
   */
  async loadBank(bankId = '808-trap', onProgress = () => {}) {
    this.isLoading = true;
    this.activeBankId = bankId;
    const totalPads = PAD_MAPPINGS.length;
    let loadedCount = 0;

    for (const pad of PAD_MAPPINGS) {
      let buffer = null;
      const cacheKey = `${bankId}:${pad.id}`;

      if (this.bufferCache.has(cacheKey)) {
        buffer = this.bufferCache.get(cacheKey);
      } else {
        buffer = await this.synthesizePadSound(bankId, pad.type);
        this.bufferCache.set(cacheKey, buffer);
      }

      this.activeBankBuffers.set(pad.id, buffer);
      loadedCount++;
      onProgress({
        loaded: loadedCount,
        total: totalPads,
        percent: Math.round((loadedCount / totalPads) * 100)
      });
    }

    this.isLoading = false;
    return this.activeBankBuffers;
  }

  /**
   * Generates procedural sound buffers based on bank style and pad type.
   */
  async synthesizePadSound(bankId, type) {
    const generator = SynthGenerators[bankId] || SynthGenerators['808-trap'];
    switch (type) {
      case 'kick':
        return await generator.kick();
      case 'snare':
        return await generator.snare();
      case 'closedHat':
        return await generator.closedHat();
      case 'openHat':
        return await generator.openHat();
      case 'clap':
        return await generator.clap();
      case 'rim':
        return await generator.rim();
      case 'tomHigh':
        return await generator.tom(220);
      case 'tomMid':
        return await generator.tom(150);
      case 'tomLow':
        return await generator.tom(95);
      case 'perc1':
        return await generator.perc(540);
      case 'perc2':
        return await generator.perc(360);
      case 'subC':
        return await generator.sub(65.4); // C2
      case 'subD':
        return await generator.sub(73.4); // D2
      case 'snareGhost':
        return await generator.snare();
      case 'cowbell':
        return await generator.cowbell();
      case 'shaker':
        return await generator.closedHat();
      default:
        return await generator.kick();
    }
  }

  /**
   * Retrieves the active AudioBuffer for a specific pad.
   * @param {number} padId 0 - 15
   * @returns {AudioBuffer|null}
   */
  getBuffer(padId) {
    return this.activeBankBuffers.get(padId) || null;
  }

  /**
   * Custom sample assignment (allows users to drop custom samples onto a pad).
   */
  setPadBuffer(padId, audioBuffer) {
    this.activeBankBuffers.set(padId, audioBuffer);
  }
}

export const bufferLoader = new BufferLoader();
