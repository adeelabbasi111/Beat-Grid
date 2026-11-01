/**
 * BeatGrid - Application Entry Point
 * Bootstraps Audio Engine, Buffer Loader Pipeline, and Interactive UI Grid.
 */

import { audioEngine } from './audio/AudioEngine.js';
import { bufferLoader } from './audio/BufferLoader.js';
import { PadGrid } from './ui/PadGrid.js';
import { Controls } from './ui/Controls.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[BeatGrid] Initializing Web Audio Sampler & Looper (FED-02)...');

  const gridContainer = document.getElementById('pad-grid');

  // Initialize Hardware Controls & VU Display
  const controls = new Controls({
    onBankChange: async (bankId) => {
      console.log(`[BeatGrid] Switching sound bank to: ${bankId}`);
      await bufferLoader.loadBank(bankId, ({ percent }) => {
        if (percent === 100) {
          console.log(`[BeatGrid] Bank '${bankId}' cached successfully!`);
        }
      });
    },
    onTempoChange: (bpm) => {
      console.log(`[BeatGrid] Tempo updated: ${bpm} BPM`);
    }
  });

  // Initialize 16-Pad Drum Grid
  const padGrid = new PadGrid(gridContainer, {
    onPadTriggered: (triggerEvent) => {
      controls.updateTriggerStats(triggerEvent);
    },
    onStatusMessage: (message) => {
      controls.announceStatus(message);
      console.log(`[BeatGrid] ${message}`);
    }
  });

  // Pre-load default 808 Trap kit buffers
  console.log('[BeatGrid] Pre-caching default soundbank buffers...');
  await bufferLoader.loadBank('808-trap', ({ percent }) => {
    if (percent === 100) {
      console.log('[BeatGrid] All 16 soundbank buffers cached in RAM for zero-latency playback!');
    }
  });

  // Global one-time unlock for browser autoplay policies
  const unlockAudio = async () => {
    const isRunning = await audioEngine.ensureRunning();
    controls.updateStatus(audioEngine.ctx?.state || 'running');
    if (isRunning) {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    }
  };

  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
});
