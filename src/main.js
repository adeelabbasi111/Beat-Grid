/**
 * BeatGrid - Master Application Entry Point
 * Production-ready Web Audio Sampler, Sequencer, FX Processor & Audio Export Workstation.
 */

import { audioEngine } from './audio/AudioEngine.js';
import { bufferLoader } from './audio/BufferLoader.js';
import { sequencerEngine } from './audio/SequencerEngine.js';
import { fxEngine } from './audio/FXEngine.js';
import { storageManager } from './audio/StorageManager.js';
import { AudioRecorder } from './audio/AudioRecorder.js';

import { PadGrid } from './ui/PadGrid.js';
import { Controls } from './ui/Controls.js';
import { SequencerUI } from './ui/SequencerUI.js';
import { FXRackUI } from './ui/FXRackUI.js';
import { KeyMapperModal } from './ui/KeyMapperModal.js';
import { ExportModal } from './ui/ExportModal.js';
import { HelpModal } from './ui/HelpModal.js';
import { toast } from './ui/Toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[BeatGrid] Initializing Web Audio Sampler, Sequencer, FX Rack & Export Engine (FED-02)...');

  const gridContainer = document.getElementById('pad-grid');
  const sequencerContainer = document.getElementById('sequencer-container');
  const fxRackContainer = document.getElementById('fx-rack-container');
  const btnOpenKeymap = document.getElementById('btn-open-keymap');
  const btnOpenHelp = document.getElementById('btn-open-help');
  const btnOpenBounce = document.getElementById('btn-open-bounce');
  const btnMasterRec = document.getElementById('btn-master-rec');
  const masterRecLabel = document.getElementById('master-rec-label');

  // Load existing session if saved in localStorage
  const savedSession = storageManager.loadSession();

  let activeKit = savedSession?.kit || '808-trap';
  let activeBpm = savedSession?.bpm || 120;
  let activeVolume = savedSession?.volume !== undefined ? savedSession.volume : 0.85;
  let activeSwing = savedSession?.swing !== undefined ? savedSession.swing : 0;
  let customKeyMap = savedSession?.keyMap || null;

  // 1. Controls Bar & Hardware Dashboard
  const controls = new Controls({
    onBankChange: async (bankId) => {
      console.log(`[BeatGrid] Switching sound bank to: ${bankId}`);
      activeKit = bankId;
      await bufferLoader.loadBank(bankId, ({ percent }) => {
        if (percent === 100) {
          console.log(`[BeatGrid] Bank '${bankId}' cached successfully!`);
        }
      });
      // Synchronize sequencer groove preset with kit if available
      sequencerEngine.loadFactoryPreset(bankId);
      triggerAutoSave();
    },
    onTempoChange: (bpm) => {
      activeBpm = bpm;
      sequencerEngine.setBpm(bpm);
      triggerAutoSave();
    }
  });

  // Apply initial / restored volume & tempo
  controls.setVolume(activeVolume);
  controls.setTempo(activeBpm);
  controls.setBank(activeKit);

  // 2. 16-Pad Drum Grid
  const padGrid = new PadGrid(gridContainer, {
    initialKeyMap: customKeyMap,
    onPadTriggered: (triggerEvent) => {
      controls.updateTriggerStats(triggerEvent);
    },
    onStatusMessage: (message) => {
      controls.announceStatus(message);
      console.log(`[BeatGrid] ${message}`);
    }
  });

  // 3. Custom Key Mapping Modal
  const keyMapperModal = new KeyMapperModal({
    initialKeyMap: customKeyMap,
    onKeyMapChange: (newKeyMap) => {
      customKeyMap = newKeyMap;
      padGrid.setKeyMap(newKeyMap);
      triggerAutoSave();
    },
    onStatusMessage: (msg) => {
      controls.announceStatus(msg);
    }
  });

  btnOpenKeymap?.addEventListener('click', () => {
    keyMapperModal.open();
  });

  // 4. Help & User Guide Modal
  const helpModal = new HelpModal();
  btnOpenHelp?.addEventListener('click', () => {
    helpModal.open();
  });

  // 5. 16-Step Looper & Sequencer Console
  const sequencerUI = new SequencerUI(sequencerContainer, {
    onStatusMessage: (message) => {
      controls.announceStatus(message);
      console.log(`[BeatGrid] ${message}`);
    }
  });

  sequencerEngine.setBpm(activeBpm);
  sequencerUI.setSwing(activeSwing);

  // If saved pattern exists in session, restore it
  if (savedSession?.pattern) {
    sequencerEngine.setPattern(savedSession.pattern);
  }

  // 6. Master FX Rack UI
  const fxRackUI = new FXRackUI(fxRackContainer, {
    onStatusMessage: (message) => {
      controls.announceStatus(message);
    },
    onSaveSession: () => {
      const current = getCurrentSession();
      storageManager.saveSession(current);
      controls.announceStatus('Session saved to browser local storage!');
      toast.show('Session saved to browser storage', { type: 'success' });
    },
    onResetSession: () => {
      storageManager.resetSession();
      // Reset engines & UI to default
      activeKit = '808-trap';
      activeBpm = 120;
      activeVolume = 0.85;
      activeSwing = 0;
      customKeyMap = null;

      controls.setBank(activeKit);
      controls.setTempo(activeBpm);
      controls.setVolume(activeVolume);
      bufferLoader.loadBank(activeKit);
      sequencerEngine.loadFactoryPreset('808-trap');
      sequencerUI.setSwing(0);
      fxEngine.setGlobalBypass(false);
      fxEngine.setFilterEnabled(true);
      fxEngine.setFilterCutoff(20000);
      fxEngine.setFilterQ(1.0);
      fxEngine.setDriveEnabled(false);
      fxEngine.setDriveAmount(0);
      fxEngine.setDelayEnabled(false);
      fxEngine.setReverbEnabled(false);
      keyMapperModal.setKeyMap(keyMapperModal.getDefaultKeyMap());
      padGrid.setKeyMap(keyMapperModal.getDefaultKeyMap());
      controls.announceStatus('Reset all settings to factory default!');
      toast.show('Reset settings to factory defaults', { type: 'info' });
    },
    onExportPattern: () => {
      const current = getCurrentSession();
      storageManager.exportPatternJSON(current, `beatgrid-${activeKit}-pattern.json`);
      controls.announceStatus('Exported beat pattern JSON');
      toast.show(`Exported beatgrid-${activeKit}-pattern.json`, { type: 'export' });
    },
    onImportPattern: async (file) => {
      try {
        const imported = await storageManager.importPatternJSON(file);
        if (imported) {
          if (imported.pattern) sequencerEngine.setPattern(imported.pattern);
          if (imported.bpm) controls.setTempo(imported.bpm);
          if (imported.swing !== undefined) sequencerUI.setSwing(imported.swing);
          if (imported.kit) {
            activeKit = imported.kit;
            controls.setBank(imported.kit);
            await bufferLoader.loadBank(imported.kit);
          }
          if (imported.fx) fxEngine.loadState(imported.fx);
          if (imported.keyMap) {
            customKeyMap = imported.keyMap;
            keyMapperModal.setKeyMap(imported.keyMap);
            padGrid.setKeyMap(imported.keyMap);
          }
          triggerAutoSave();
          controls.announceStatus('Successfully imported custom beat pattern!');
          toast.show('Imported custom beat preset!', { type: 'success' });
        }
      } catch (err) {
        controls.announceStatus('Failed to import JSON: Invalid file format');
        toast.show('Invalid pattern JSON file', { type: 'error' });
      }
    }
  });

  // Restore FX state if saved
  if (savedSession?.fx) {
    fxEngine.loadState(savedSession.fx);
  }

  // 7. Audio Recorder & Export Modal
  const audioRecorder = new AudioRecorder(audioEngine);

  const exportModal = new ExportModal({
    audioRecorder,
    sequencerEngine,
    bufferLoader,
    fxEngine,
    controls,
    onStatusMessage: (msg) => controls.announceStatus(msg)
  });

  btnOpenBounce?.addEventListener('click', () => {
    exportModal.open();
  });

  // Real-time Master Recording Controller
  btnMasterRec?.addEventListener('click', async () => {
    await audioEngine.ensureRunning();

    if (!audioRecorder.isRecording) {
      audioRecorder.startLiveRecording();
      btnMasterRec.classList.add('is-recording');
      btnMasterRec.setAttribute('aria-label', 'Stop live performance recording');
      toast.show('🔴 Recording live master performance...', { type: 'recording' });
      controls.announceStatus('Recording live master audio output...');
    } else {
      const wavBlob = audioRecorder.stopLiveRecording();
      btnMasterRec.classList.remove('is-recording');
      btnMasterRec.setAttribute('aria-label', 'Record master output to WAV audio');
      if (masterRecLabel) masterRecLabel.textContent = 'REC MASTER';

      if (wavBlob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `beatgrid-master-performance-${timestamp}.wav`;
        audioRecorder.downloadBlob(wavBlob, filename);
        toast.show(`💾 Saved master performance (${filename})`, { type: 'success' });
        controls.announceStatus(`Saved master performance to ${filename}`);
      }
    }
  });

  audioRecorder.onTimerTick((seconds) => {
    if (masterRecLabel) {
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
      masterRecLabel.textContent = `STOP (${mins}:${secs})`;
    }
  });

  // Session Helper to snapshot all states
  function getCurrentSession() {
    return {
      kit: activeKit,
      bpm: controls.currentBpm,
      volume: parseFloat(controls.volumeSlider?.value || activeVolume),
      swing: sequencerEngine.swing,
      pattern: sequencerEngine.getPattern(),
      fx: fxEngine.getState(),
      keyMap: customKeyMap || keyMapperModal.getKeyMap()
    };
  }

  // Debounced auto-save handler
  function triggerAutoSave() {
    storageManager.autoSave(getCurrentSession, 500);
  }

  // Subscribe to state changes for auto-save
  sequencerEngine.onPatternChange(() => triggerAutoSave());
  fxEngine.onStateChange(() => triggerAutoSave());

  // Listen to volume slider inputs
  controls.volumeSlider?.addEventListener('input', () => triggerAutoSave());

  // Pre-load current soundbank buffers
  console.log(`[BeatGrid] Pre-caching '${activeKit}' soundbank buffers...`);
  bufferLoader.loadBank(activeKit, ({ percent }) => {
    if (percent === 100) {
      console.log(`[BeatGrid] '${activeKit}' buffers cached in RAM for zero-latency playback!`);
    }
  });

  // Global one-time unlock for browser autoplay policies (Mobile/Touch & Desktop)
  const unlockAudio = async () => {
    const isRunning = await audioEngine.ensureRunning();
    controls.updateStatus(audioEngine.ctx?.state || 'running');
    if (isRunning) {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchend', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    }
  };

  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('touchend', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
});
