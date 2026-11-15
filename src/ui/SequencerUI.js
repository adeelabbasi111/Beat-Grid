/**
 * SequencerUI - Hardware 16-Step Looper & Sequencer Console Component
 * Manages transport controls, step button matrix, playhead scanning, and groove adjustments.
 */

import { sequencerEngine } from '../audio/SequencerEngine.js';
import { audioEngine } from '../audio/AudioEngine.js';
import { PAD_MAPPINGS } from '../config/soundBanks.js';

export class SequencerUI {
  constructor(containerElement, { onStatusMessage = () => {} } = {}) {
    this.container = containerElement;
    this.onStatusMessage = onStatusMessage;

    this.stepButtons = [];
    this.currentPlayheadStep = -1;
    this.isPlaying = false;

    this.render();
    this.bindEvents();
    this.updateTrackDisplay(sequencerEngine.activeTrackId);
    this.refreshStepGrid();
  }

  render() {
    this.container.innerHTML = `
      <section class="sequencer-console" aria-label="16-Step Looper and Sequencer Rack">
        <!-- Top Toolbar: Transport & Params -->
        <div class="seq-toolbar">
          <div class="transport-group" role="group" aria-label="Playback transport controls">
            <button id="seq-play-btn" type="button" class="btn-transport play" aria-label="Start playback loop (Shortcut: Space)">
              <span id="seq-play-icon" aria-hidden="true">▶</span>
              <span id="seq-play-label">PLAY</span>
            </button>
            <button id="seq-stop-btn" type="button" class="btn-transport" aria-label="Stop playback and rewind">
              <span aria-hidden="true">⏹</span>
              <span>STOP</span>
            </button>
            <button id="seq-rec-btn" type="button" class="btn-transport record" aria-label="Toggle live overdub recording mode" aria-pressed="false">
              <span class="rec-dot" aria-hidden="true"></span>
              <span>REC</span>
            </button>
            <button id="seq-metro-btn" type="button" class="btn-transport" aria-label="Toggle metronome click" aria-pressed="false">
              <span aria-hidden="true">⏱</span>
              <span>METRO</span>
            </button>
            <button id="seq-clear-btn" type="button" class="btn-transport" aria-label="Clear active track pattern (Shift+Click clears all tracks)" title="Clear track (Shift+Click clears all tracks)">
              <span aria-hidden="true">🔄</span>
              <span>CLEAR</span>
            </button>
          </div>

          <div class="seq-params">
            <div class="seq-param-item">
              <label for="seq-swing-slider">Swing:</label>
              <input id="seq-swing-slider" type="range" min="0" max="50" step="1" value="0" class="slider-input" aria-label="Groove swing percentage" />
              <span id="seq-swing-val" class="control-val">0%</span>
            </div>

            <div class="seq-param-item">
              <label for="seq-preset-select">Groove Preset:</label>
              <select id="seq-preset-select" class="select-input" aria-label="Select factory drum pattern">
                <option value="808-trap">Trap 808</option>
                <option value="lofi-chill">Lo-Fi Chill</option>
                <option value="electro-synth">Electro 128</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Active Track Banner -->
        <div class="active-track-banner">
          <div class="track-name-badge">
            <span class="track-color-indicator" aria-hidden="true"></span>
            <span id="seq-track-name">Track 01: Kick 808 [Key 1]</span>
          </div>
          <span class="track-hint">Click any drum pad above to edit its steps</span>
        </div>

        <!-- 16-Step Sequencer Rack -->
        <div class="step-rack-container">
          <div class="step-beat-labels" aria-hidden="true">
            <span>BEAT 1</span>
            <span>BEAT 2</span>
            <span>BEAT 3</span>
            <span>BEAT 4</span>
          </div>

          <div id="seq-step-grid" class="step-buttons-grid" role="group" aria-label="16-step sequencer matrix">
            <!-- 16 step buttons dynamically created -->
          </div>
        </div>
      </section>
    `;

    // Cache elements
    this.playBtn = this.container.querySelector('#seq-play-btn');
    this.playIcon = this.container.querySelector('#seq-play-icon');
    this.playLabel = this.container.querySelector('#seq-play-label');
    this.stopBtn = this.container.querySelector('#seq-stop-btn');
    this.recBtn = this.container.querySelector('#seq-rec-btn');
    this.metroBtn = this.container.querySelector('#seq-metro-btn');
    this.clearBtn = this.container.querySelector('#seq-clear-btn');
    this.swingSlider = this.container.querySelector('#seq-swing-slider');
    this.swingVal = this.container.querySelector('#seq-swing-val');
    this.presetSelect = this.container.querySelector('#seq-preset-select');
    this.trackName = this.container.querySelector('#seq-track-name');
    this.consoleEl = this.container.querySelector('.sequencer-console');

    // Create 16 step buttons
    const gridEl = this.container.querySelector('#seq-step-grid');
    this.stepButtons = [];

    for (let i = 0; i < 16; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `step-btn ${i % 4 === 0 ? 'beat-downbeat' : ''}`;
      btn.id = `seq-step-${i}`;
      btn.setAttribute('data-step', i);
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', `Step ${i + 1} of 16`);

      btn.innerHTML = `
        <span class="step-number" aria-hidden="true">${(i + 1).toString().padStart(2, '0')}</span>
        <span class="step-indicator-dot" aria-hidden="true"></span>
      `;

      btn.addEventListener('click', () => {
        sequencerEngine.toggleStep(sequencerEngine.activeTrackId, i);
      });

      gridEl.appendChild(btn);
      this.stepButtons.push(btn);
    }
  }

  bindEvents() {
    // Transport Controls
    this.playBtn.addEventListener('click', () => {
      if (sequencerEngine.isPlaying) {
        sequencerEngine.pause();
      } else {
        sequencerEngine.play();
      }
    });

    this.stopBtn.addEventListener('click', () => {
      sequencerEngine.stop();
      this.clearPlayhead();
    });

    this.recBtn.addEventListener('click', () => {
      const isRec = sequencerEngine.toggleRecord();
      this.recBtn.classList.toggle('rec-active', isRec);
      this.recBtn.setAttribute('aria-pressed', isRec ? 'true' : 'false');
      this.onStatusMessage(isRec ? 'Live recording enabled: Play pads to record!' : 'Recording stopped.');
    });

    this.metroBtn.addEventListener('click', () => {
      const isMetro = sequencerEngine.toggleMetronome();
      this.metroBtn.classList.toggle('active-toggle', isMetro);
      this.metroBtn.setAttribute('aria-pressed', isMetro ? 'true' : 'false');
      this.onStatusMessage(isMetro ? 'Metronome enabled' : 'Metronome disabled');
    });

    this.clearBtn.addEventListener('click', (e) => {
      if (e.shiftKey) {
        sequencerEngine.clearAll();
        this.refreshStepGrid();
        this.onStatusMessage('Cleared ALL sequencer tracks!');
      } else {
        sequencerEngine.clearActiveTrack();
        const pad = PAD_MAPPINGS[sequencerEngine.activeTrackId];
        this.refreshStepGrid();
        this.onStatusMessage(`Cleared steps for ${pad?.label || 'track'} (Tip: Shift+Click to clear all)`);
      }
    });

    // Swing Slider
    this.swingSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      sequencerEngine.setSwing(val);
      this.swingVal.textContent = `${val}%`;
    });

    // Preset Select
    this.presetSelect.addEventListener('change', (e) => {
      const presetId = e.target.value;
      sequencerEngine.loadFactoryPreset(presetId);
      this.swingSlider.value = sequencerEngine.swing;
      this.swingVal.textContent = `${sequencerEngine.swing}%`;
      this.onStatusMessage(`Loaded groove preset '${presetId}'`);
    });

    // Engine Subscriptions: Precision-synced playhead animation
    sequencerEngine.onStep((stepIndex, time) => {
      if (time && audioEngine.ctx) {
        const delayMs = Math.max(0, (time - audioEngine.ctx.currentTime) * 1000);
        setTimeout(() => {
          if (this.isPlaying) {
            this.updatePlayhead(stepIndex);
          }
        }, delayMs);
      } else {
        this.updatePlayhead(stepIndex);
      }
    });

    sequencerEngine.onStateChange(({ isPlaying, isRecording }) => {
      this.isPlaying = isPlaying;
      this.updateTransportState(isPlaying, isRecording);
    });

    sequencerEngine.onPatternChange(() => {
      this.refreshStepGrid();
    });

    sequencerEngine.onTrackChange((trackId) => {
      this.updateTrackDisplay(trackId);
      this.refreshStepGrid();
    });

    // Global Spacebar Play/Pause Hotkey
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.playBtn.click();
      }
    });
  }

  setSwing(val) {
    const clamped = Math.max(0, Math.min(50, parseInt(val, 10) || 0));
    if (this.swingSlider) this.swingSlider.value = clamped;
    if (this.swingVal) this.swingVal.textContent = `${clamped}%`;
    sequencerEngine.setSwing(clamped);
  }

  updateTransportState(isPlaying, isRecording) {
    if (isPlaying) {
      this.playBtn.classList.replace('play', 'playing');
      this.playLabel.textContent = 'PAUSE';
      this.playIcon.textContent = '⏸';
      this.playBtn.setAttribute('aria-label', 'Pause loop playback (Shortcut: Space)');
    } else {
      this.playBtn.classList.replace('playing', 'play');
      this.playLabel.textContent = 'PLAY';
      this.playIcon.textContent = '▶';
      this.playBtn.setAttribute('aria-label', 'Start loop playback (Shortcut: Space)');
    }

    this.recBtn.classList.toggle('rec-active', isRecording);
    this.recBtn.setAttribute('aria-pressed', isRecording ? 'true' : 'false');
  }

  updateTrackDisplay(trackId) {
    const pad = PAD_MAPPINGS[trackId] || PAD_MAPPINGS[0];
    if (this.trackName) {
      this.trackName.textContent = `Track ${(trackId + 1).toString().padStart(2, '0')}: ${pad.label} [Key ${pad.key}]`;
    }
    if (this.consoleEl) {
      this.consoleEl.style.setProperty('--track-color', pad.color);
    }
  }

  refreshStepGrid() {
    const trackId = sequencerEngine.activeTrackId;
    const trackSteps = sequencerEngine.grid[trackId] || [];

    this.stepButtons.forEach((btn, index) => {
      const isActive = trackSteps[index] === 1;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  updatePlayhead(stepIndex) {
    if (this.currentPlayheadStep >= 0 && this.stepButtons[this.currentPlayheadStep]) {
      this.stepButtons[this.currentPlayheadStep].classList.remove('playhead');
    }
    this.currentPlayheadStep = stepIndex;
    if (this.stepButtons[stepIndex]) {
      this.stepButtons[stepIndex].classList.add('playhead');
    }
  }

  clearPlayhead() {
    if (this.currentPlayheadStep >= 0 && this.stepButtons[this.currentPlayheadStep]) {
      this.stepButtons[this.currentPlayheadStep].classList.remove('playhead');
    }
    this.currentPlayheadStep = -1;
  }
}
