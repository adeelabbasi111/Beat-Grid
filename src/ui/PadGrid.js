/**
 * PadGrid - Renders and manages the 16-pad drum machine interface.
 * Built with native <button> elements for full accessibility, ARIA compliance,
 * sub-millisecond keyboard dispatch, and drag-and-drop custom sample support.
 */

import { PAD_MAPPINGS } from '../config/soundBanks.js';
import { audioEngine } from '../audio/AudioEngine.js';
import { bufferLoader } from '../audio/BufferLoader.js';

export class PadGrid {
  constructor(containerElement, { onPadTriggered = () => {}, onStatusMessage = () => {} } = {}) {
    this.container = containerElement;
    this.onPadTriggered = onPadTriggered;
    this.onStatusMessage = onStatusMessage;
    this.padElements = new Map(); // padId -> HTMLButtonElement
    this.keyToPadMap = new Map(); // key.toLowerCase() -> padId, code.toLowerCase() -> padId
    this.activeVoices = new Map(); // padId -> { source, gainNode }

    this.render();
    this.bindKeyboard();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'pad-grid-container';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', '16-pad drum machine soundboard');

    PAD_MAPPINGS.forEach((pad) => {
      const padBtn = document.createElement('button');
      padBtn.type = 'button';
      padBtn.className = 'drum-pad';
      padBtn.id = `pad-${pad.id}`;
      padBtn.setAttribute('data-pad-id', pad.id);
      padBtn.setAttribute('aria-label', `Pad ${pad.id + 1}: ${pad.label}. Shortcut key: ${pad.key}`);
      padBtn.style.setProperty('--pad-color', pad.color);

      padBtn.innerHTML = `
        <span class="pad-led" aria-hidden="true"></span>
        <span class="pad-key" aria-hidden="true">${pad.key}</span>
        <span class="pad-info" aria-hidden="true">
          <span class="pad-number">PAD ${(pad.id + 1).toString().padStart(2, '0')}</span>
          <span class="pad-label">${pad.label}</span>
        </span>
      `;

      // Touch & Pointer interaction
      const handlePress = (e) => {
        if (e.cancelable) e.preventDefault();
        this.triggerPad(pad.id);
      };

      const handleRelease = (e) => {
        if (e.cancelable) e.preventDefault();
        this.releasePad(pad.id);
      };

      padBtn.addEventListener('pointerdown', handlePress);
      padBtn.addEventListener('pointerup', handleRelease);
      padBtn.addEventListener('pointerleave', handleRelease);

      // Support Enter and Space when button is focused via keyboard Tab navigation
      padBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!e.repeat) {
            e.preventDefault();
            this.triggerPad(pad.id);
          }
        }
      });

      padBtn.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.releasePad(pad.id);
        }
      });

      // Drag and drop custom sample onto pad
      this.bindDragAndDrop(padBtn, pad.id);

      this.container.appendChild(padBtn);
      this.padElements.set(pad.id, padBtn);

      // Register key mappings
      this.keyToPadMap.set(pad.key.toLowerCase(), pad.id);
      this.keyToPadMap.set(pad.code.toLowerCase(), pad.id);
    });
  }

  /**
   * Enables dragging custom audio files onto any pad.
   */
  bindDragAndDrop(padBtn, padId) {
    padBtn.addEventListener('dragover', (e) => {
      e.preventDefault();
      padBtn.classList.add('drag-over');
    });

    padBtn.addEventListener('dragleave', (e) => {
      e.preventDefault();
      padBtn.classList.remove('drag-over');
    });

    padBtn.addEventListener('drop', async (e) => {
      e.preventDefault();
      padBtn.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|ogg|flac|m4a)$/i)) {
        this.onStatusMessage(`Invalid file format for Pad ${padId + 1}. Please drop a WAV or MP3 audio file.`);
        return;
      }

      try {
        const customBuffer = await bufferLoader.decodeFileObject(file);
        bufferLoader.setPadBuffer(padId, customBuffer);

        // Update label
        const labelEl = padBtn.querySelector('.pad-label');
        const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 12);
        if (labelEl) labelEl.textContent = cleanName;
        padBtn.setAttribute('aria-label', `Pad ${padId + 1}: ${cleanName} (Custom audio sample). Shortcut: ${PAD_MAPPINGS[padId].key}`);

        this.onStatusMessage(`Loaded custom sample '${file.name}' into Pad ${padId + 1}!`);
        this.triggerPad(padId);
      } catch (err) {
        console.error('Failed to decode dropped audio file:', err);
        this.onStatusMessage(`Could not decode audio file '${file.name}'.`);
      }
    });
  }

  /**
   * Fires sound buffer and visual feedback for pad.
   */
  triggerPad(padId) {
    const pad = PAD_MAPPINGS[padId];
    if (!pad) return;

    // Resume AudioContext on user interaction
    audioEngine.ensureRunning();

    const startTime = performance.now();
    const padBtn = this.padElements.get(padId);

    if (padBtn) {
      padBtn.classList.add('active');
    }

    // Hi-Hat Choke Group: Closed Hat (Pad 2) chokes ringing Open Hat (Pad 3)
    if (padId === 2) {
      const openHatVoice = this.activeVoices.get(3);
      if (openHatVoice && audioEngine.ctx) {
        openHatVoice.gainNode.gain.setTargetAtTime(0, audioEngine.ctx.currentTime, 0.015);
      }
    }

    const buffer = bufferLoader.getBuffer(padId);
    if (buffer) {
      const voice = audioEngine.playBuffer(buffer);
      if (voice) {
        this.activeVoices.set(padId, voice);
        voice.source.onended = () => {
          if (this.activeVoices.get(padId) === voice) {
            this.activeVoices.delete(padId);
          }
        };
      }
    } else {
      // Lazy fallback synthesis if bank buffer is still rendering
      bufferLoader.synthesizePadSound(bufferLoader.activeBankId, pad.type).then((lazyBuffer) => {
        bufferLoader.setPadBuffer(padId, lazyBuffer);
        const voice = audioEngine.playBuffer(lazyBuffer);
        if (voice) {
          this.activeVoices.set(padId, voice);
        }
      });
    }

    const latency = (performance.now() - startTime).toFixed(2);
    this.onPadTriggered({
      padId,
      label: padBtn?.querySelector('.pad-label')?.textContent || pad.label,
      key: pad.key,
      latencyMs: latency
    });
  }

  releasePad(padId) {
    const padBtn = this.padElements.get(padId);
    if (padBtn) {
      padBtn.classList.remove('active');
    }
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when user is in input/select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      const padId = this.keyToPadMap.get(key) ?? this.keyToPadMap.get(code);

      if (padId !== undefined && !e.repeat) {
        e.preventDefault();
        this.triggerPad(padId);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      const padId = this.keyToPadMap.get(key) ?? this.keyToPadMap.get(code);

      if (padId !== undefined) {
        this.releasePad(padId);
      }
    });
  }
}
