/**
 * Controls - Hardware Dashboard, Volume, Bank Switcher, Tempo (BPM), and VU Meter.
 */

import { audioEngine } from '../audio/AudioEngine.js';
import { SOUND_BANKS } from '../config/soundBanks.js';

export class Controls {
  constructor({ onBankChange = () => {}, onTempoChange = () => {} } = {}) {
    this.onBankChange = onBankChange;
    this.onTempoChange = onTempoChange;

    this.statusPill = document.getElementById('audio-status');
    this.bankSelect = document.getElementById('bank-select');
    this.volumeSlider = document.getElementById('volume-slider');
    this.volumeVal = document.getElementById('volume-val');

    this.tempoSlider = document.getElementById('tempo-slider');
    this.tempoVal = document.getElementById('tempo-val');
    this.tempoLight = document.getElementById('tempo-indicator');

    this.lastHitVal = document.getElementById('stat-last-hit');
    this.latencyVal = document.getElementById('stat-latency');
    this.bankStatVal = document.getElementById('stat-bank');
    this.a11yStatus = document.getElementById('a11y-status');

    this.vuBars = Array.from(document.querySelectorAll('.vu-bar'));

    this.currentBpm = 120;
    this.metronomeTimer = null;

    this.init();
    this.startVUMeterLoop();
    this.startMetronome();
  }

  init() {
    // Populate Banks
    if (this.bankSelect) {
      this.bankSelect.innerHTML = Object.values(SOUND_BANKS).map((bank) => `
        <option value="${bank.id}">${bank.name}</option>
      `).join('');

      this.bankSelect.addEventListener('change', async (e) => {
        const bankId = e.target.value;
        const bankName = SOUND_BANKS[bankId]?.name || bankId;
        if (this.bankStatVal) {
          this.bankStatVal.textContent = bankName;
        }
        this.announceStatus(`Switched sound kit to ${bankName}`);
        await this.onBankChange(bankId);
      });
    }

    // Volume Slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audioEngine.setMasterVolume(val);
        if (this.volumeVal) {
          this.volumeVal.textContent = `${Math.round(val * 100)}%`;
        }
      });
    }

    // Tempo / BPM Slider
    if (this.tempoSlider) {
      this.tempoSlider.addEventListener('input', (e) => {
        const bpm = parseInt(e.target.value, 10);
        this.currentBpm = bpm;
        if (this.tempoVal) {
          this.tempoVal.textContent = `${bpm} BPM`;
        }
        this.startMetronome();
        this.onTempoChange(bpm);
      });
    }

    // Audio Status Pill
    if (this.statusPill) {
      this.statusPill.addEventListener('click', async () => {
        await audioEngine.ensureRunning();
        this.updateStatus(audioEngine.ctx?.state || 'running');
      });
    }

    audioEngine.onStateChange((state) => {
      this.updateStatus(state);
    });
  }

  startMetronome() {
    if (this.metronomeTimer) {
      clearInterval(this.metronomeTimer);
    }
    const intervalMs = (60 / this.currentBpm) * 1000;
    this.metronomeTimer = setInterval(() => {
      if (this.tempoLight) {
        this.tempoLight.classList.add('pulse');
        setTimeout(() => {
          this.tempoLight.classList.remove('pulse');
        }, 80);
      }
    }, intervalMs);
  }

  updateStatus(state) {
    if (!this.statusPill) return;
    const isRunning = state === 'running';
    this.statusPill.className = `status-pill ${isRunning ? 'running' : 'suspended'}`;
    this.statusPill.setAttribute('aria-label', isRunning ? 'Audio engine live' : 'Audio engine standby. Click to activate.');
    this.statusPill.innerHTML = `
      <span class="status-dot" aria-hidden="true"></span>
      <span>${isRunning ? 'Audio: Live' : 'Audio: Standby (Click)'}</span>
    `;
  }

  updateTriggerStats({ label, key, latencyMs }) {
    if (this.lastHitVal) {
      this.lastHitVal.textContent = `${label} [${key}]`;
    }
    if (this.latencyVal) {
      this.latencyVal.textContent = `${latencyMs} ms`;
    }
  }

  announceStatus(msg) {
    if (this.a11yStatus) {
      this.a11yStatus.textContent = msg;
    }
  }

  startVUMeterLoop() {
    const updateMeter = () => {
      const level = audioEngine.getAudioLevel(); // 0 to 255
      const normalized = Math.min(1, level / 110);

      const activeBarCount = Math.round(normalized * this.vuBars.length);

      this.vuBars.forEach((bar, index) => {
        if (index < activeBarCount) {
          const heightPercent = Math.min(100, Math.max(25, (index + 1) * 16));
          bar.style.height = `${heightPercent}%`;
          bar.classList.add('active');
          if (index >= this.vuBars.length - 2) {
            bar.classList.add('peak');
          } else {
            bar.classList.remove('peak');
          }
        } else {
          bar.style.height = '14%';
          bar.classList.remove('active', 'peak');
        }
      });

      requestAnimationFrame(updateMeter);
    };

    requestAnimationFrame(updateMeter);
  }
}
