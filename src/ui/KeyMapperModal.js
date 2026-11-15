/**
 * KeyMapperModal - Accessible Custom Keyboard Mapping Dialog (Module 3)
 * Provides visual 4x4 pad remapping with interactive "Learn Key" listening mode,
 * conflict swapping, factory resets, and live PadGrid keyboard synchronization.
 */

import { PAD_MAPPINGS } from '../config/soundBanks.js';

export class KeyMapperModal {
  constructor({
    initialKeyMap = null,
    onKeyMapChange = () => {},
    onStatusMessage = () => {}
  } = {}) {
    this.keyMap = initialKeyMap ? { ...initialKeyMap } : this.getDefaultKeyMap();
    this.onKeyMapChange = onKeyMapChange;
    this.onStatusMessage = onStatusMessage;

    this.listeningPadId = null;
    this.dialog = null;

    this.createDOM();
    this.bindEvents();
  }

  getDefaultKeyMap() {
    const map = {};
    PAD_MAPPINGS.forEach((pad) => {
      map[pad.id] = pad.key.toUpperCase();
    });
    return map;
  }

  createDOM() {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'keymap-dialog';
    this.dialog.className = 'keymap-dialog';
    this.dialog.setAttribute('aria-labelledby', 'keymap-title');
    this.dialog.setAttribute('aria-modal', 'true');

    this.dialog.innerHTML = `
      <div class="keymap-header">
        <div class="keymap-title-group">
          <h2 id="keymap-title" class="keymap-title">Custom Keyboard Mapping</h2>
          <span class="keymap-badge">16 PADS</span>
        </div>
        <button id="btn-close-keymap" type="button" class="btn-close-keymap" aria-label="Close key mapping dialog">✕</button>
      </div>

      <p class="keymap-help-text">
        Click any pad below, then press a key on your keyboard to assign it. Keys are auto-saved to your browser.
      </p>

      <div id="keymap-grid" class="keymap-grid" role="group" aria-label="16 Drum Pad Key Binding Matrix"></div>

      <div class="keymap-footer">
        <button id="btn-keymap-reset" type="button" class="btn-keymap-reset" aria-label="Reset all keys to factory MPC defaults">
          Reset to Factory Keys
        </button>
        <button id="btn-keymap-done" type="button" class="btn-keymap-done" aria-label="Save and close modal">
          Done
        </button>
      </div>
    `;

    document.body.appendChild(this.dialog);
    this.renderPadButtons();
  }

  renderPadButtons() {
    const grid = this.dialog.querySelector('#keymap-grid');
    if (!grid) return;
    grid.innerHTML = '';

    PAD_MAPPINGS.forEach((pad) => {
      const currentKey = this.keyMap[pad.id] || pad.key;
      const isListening = this.listeningPadId === pad.id;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `keymap-pad-btn ${isListening ? 'is-listening' : ''}`;
      btn.id = `keymap-btn-${pad.id}`;
      btn.setAttribute('data-pad-id', pad.id);
      btn.setAttribute('aria-label', `Pad ${pad.id + 1}: ${pad.label}. Current key: ${currentKey}. Click to remap.`);

      btn.innerHTML = `
        <span class="keymap-pad-num">PAD ${(pad.id + 1).toString().padStart(2, '0')}</span>
        <span class="keymap-pad-key">${isListening ? '...' : currentKey}</span>
        <span class="keymap-pad-label">${pad.label}</span>
      `;

      btn.addEventListener('click', () => {
        this.selectPadForListening(pad.id);
      });

      grid.appendChild(btn);
    });
  }

  selectPadForListening(padId) {
    if (this.listeningPadId === padId) {
      this.listeningPadId = null;
    } else {
      this.listeningPadId = padId;
      const pad = PAD_MAPPINGS[padId];
      this.onStatusMessage(`Press any key to assign to ${pad?.label || 'pad'}...`);
    }
    this.renderPadButtons();
  }

  bindEvents() {
    // Close on X or Done
    const closeBtn = this.dialog.querySelector('#btn-close-keymap');
    const doneBtn = this.dialog.querySelector('#btn-keymap-done');
    const resetBtn = this.dialog.querySelector('#btn-keymap-reset');

    const handleClose = () => {
      this.listeningPadId = null;
      this.dialog.close();
    };

    closeBtn?.addEventListener('click', handleClose);
    doneBtn?.addEventListener('click', handleClose);

    // Backdrop click close
    this.dialog.addEventListener('click', (e) => {
      const rect = this.dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        handleClose();
      }
    });

    // Reset Keys
    resetBtn?.addEventListener('click', () => {
      this.keyMap = this.getDefaultKeyMap();
      this.listeningPadId = null;
      this.renderPadButtons();
      this.onKeyMapChange(this.keyMap);
      this.onStatusMessage('Reset key bindings to factory defaults');
    });

    // Global Key Listener for "Learn Key"
    window.addEventListener('keydown', (e) => {
      if (!this.dialog.open || this.listeningPadId === null) return;

      // Escape cancels current listening without closing dialog
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.listeningPadId = null;
        this.renderPadButtons();
        return;
      }

      // Ignore modifiers alone
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const pressedKey = e.key.toUpperCase();
      const targetPadId = this.listeningPadId;

      // Check if key is already assigned to another pad -> swap keys
      let swappedWith = null;
      for (const [idStr, assignedKey] of Object.entries(this.keyMap)) {
        const id = parseInt(idStr, 10);
        if (id !== targetPadId && assignedKey === pressedKey) {
          swappedWith = id;
          this.keyMap[id] = this.keyMap[targetPadId];
          break;
        }
      }

      this.keyMap[targetPadId] = pressedKey;
      this.listeningPadId = null;
      this.renderPadButtons();

      this.onKeyMapChange(this.keyMap);

      const targetPad = PAD_MAPPINGS[targetPadId];
      if (swappedWith !== null) {
        const otherPad = PAD_MAPPINGS[swappedWith];
        this.onStatusMessage(`Assigned '${pressedKey}' to ${targetPad.label} (swapped with ${otherPad.label})`);
      } else {
        this.onStatusMessage(`Assigned key '${pressedKey}' to ${targetPad.label}`);
      }
    }, true);
  }

  open() {
    if (!this.dialog) return;
    this.listeningPadId = null;
    this.renderPadButtons();
    this.dialog.showModal();
  }

  close() {
    this.dialog?.close();
  }

  setKeyMap(newMap) {
    if (!newMap) return;
    this.keyMap = { ...newMap };
    this.renderPadButtons();
  }

  getKeyMap() {
    return { ...this.keyMap };
  }
}
