/**
 * HelpModal - Interactive Keyboard Shortcuts & User Guide Dialog (Module 4)
 */

export class HelpModal {
  constructor() {
    this.dialog = null;
    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'help-dialog';
    this.dialog.className = 'help-dialog';
    this.dialog.setAttribute('aria-labelledby', 'help-title');
    this.dialog.setAttribute('aria-modal', 'true');

    this.dialog.innerHTML = `
      <div class="help-header">
        <div class="help-title-group">
          <h2 id="help-title" class="help-title">BeatGrid Studio Guide</h2>
          <span class="help-badge">v1.0 FED-02</span>
        </div>
        <button id="btn-close-help" type="button" class="btn-close-help" aria-label="Close guide modal">✕</button>
      </div>

      <div class="help-section">
        <h3 class="help-section-title">⌨️ Default Keyboard Trigger Matrix</h3>
        <div class="help-shortcuts-grid">
          <div class="shortcut-item">
            <span class="shortcut-kbd">1 - 4</span>
            <span class="shortcut-desc">Row 1: Kicks, Snares, Hats</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-kbd">Q - R</span>
            <span class="shortcut-desc">Row 2: Claps, Rims, High Toms</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-kbd">A - F</span>
            <span class="shortcut-desc">Row 3: Low Toms, Percs, Subs</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-kbd">Z - V</span>
            <span class="shortcut-desc">Row 4: Tuned Subs, Cowbell, Shaker</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-kbd">Space</span>
            <span class="shortcut-desc">Start / Pause Sequencer Loop</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-kbd">Shift + Clear</span>
            <span class="shortcut-desc">Clear All 16 Sequencer Tracks</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h3 class="help-section-title">🎛️ Step Sequencer & Live Recording</h3>
        <ul class="help-list">
          <li><b>Track Focus:</b> Click any drum pad or press its key to focus that track in the 16-step sequencer rack.</li>
          <li><b>Step Programming:</b> Click step buttons (01–16) to toggle beats on the active track.</li>
          <li><b>Quantized Overdub (REC):</b> Turn on <b>● REC</b> and strike pads while playing to record beats in real-time.</li>
          <li><b>Roger Linn Swing:</b> Adjust the <b>Swing slider</b> (0–50%) to delay off-beat 16th notes for authentic MPC groove.</li>
        </ul>
      </div>

      <div class="help-section">
        <h3 class="help-section-title">🎚️ Master FX Rack & Outboard Dials</h3>
        <ul class="help-list">
          <li><b>Rotary Knobs:</b> Click and drag vertically up/down to adjust values; or hover and scroll mouse wheel.</li>
          <li><b>Quick Reset:</b> Double-click any knob to instantly return to its factory calibrated default.</li>
          <li><b>Audio Export:</b> Click <b>🔴 REC MASTER</b> to record live performances to WAV, or click <b>💾 BOUNCE</b> to render clean loops.</li>
          <li><b>Sample Drag & Drop:</b> Drag any <code>.WAV</code> or <code>.MP3</code> directly onto any drum pad to replace its sound.</li>
        </ul>
      </div>
    `;

    document.body.appendChild(this.dialog);
  }

  bindEvents() {
    const closeBtn = this.dialog.querySelector('#btn-close-help');
    closeBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      const rect = this.dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!inDialog) this.close();
    });
  }

  open() {
    this.dialog?.showModal();
  }

  close() {
    this.dialog?.close();
  }
}
