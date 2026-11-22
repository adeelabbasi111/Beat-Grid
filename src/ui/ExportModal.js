/**
 * ExportModal - Audio Export Dialog & Real-Time Master Recording Controller (Module 4)
 * Manages:
 * 1. Loop Bounce Modal (OfflineAudioContext multi-bar rendering)
 * 2. Live Master Audio Recording button in header
 * 3. 16-bit PCM Stereo WAV file downloads
 */

import { toast } from './Toast.js';

export class ExportModal {
  constructor({
    audioRecorder,
    sequencerEngine,
    bufferLoader,
    fxEngine,
    controls,
    onStatusMessage = () => {}
  }) {
    this.audioRecorder = audioRecorder;
    this.sequencerEngine = sequencerEngine;
    this.bufferLoader = bufferLoader;
    this.fxEngine = fxEngine;
    this.controls = controls;
    this.onStatusMessage = onStatusMessage;

    this.selectedBars = 2;
    this.dialog = null;

    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'export-dialog';
    this.dialog.className = 'export-dialog';
    this.dialog.setAttribute('aria-labelledby', 'export-title');
    this.dialog.setAttribute('aria-modal', 'true');

    this.dialog.innerHTML = `
      <div class="export-header">
        <div class="export-title-group">
          <h2 id="export-title" class="export-title">Export Loop Audio</h2>
          <span class="export-badge">16-BIT WAV</span>
        </div>
        <button id="btn-close-export" type="button" class="btn-close-export" aria-label="Close export dialog">✕</button>
      </div>

      <div class="export-body">
        <div class="export-form-group">
          <label class="export-label">Render Loop Duration:</label>
          <div class="export-options-grid" role="radiogroup" aria-label="Loop bar count">
            <button type="button" class="export-radio-btn" data-bars="1" role="radio" aria-checked="false">1 Bar (4 Beats)</button>
            <button type="button" class="export-radio-btn is-selected" data-bars="2" role="radio" aria-checked="true">2 Bars (8 Beats)</button>
            <button type="button" class="export-radio-btn" data-bars="4" role="radio" aria-checked="false">4 Bars (16 Beats)</button>
            <button type="button" class="export-radio-btn" data-bars="8" role="radio" aria-checked="false">8 Bars (32 Beats)</button>
          </div>
        </div>

        <div class="export-specs-box">
          <div class="spec-line">
            <span class="spec-label">Audio Format:</span>
            <span class="spec-val">Uncompressed Broadcast WAV (RIFF PCM)</span>
          </div>
          <div class="spec-line">
            <span class="spec-label">Sample Rate / Bit Depth:</span>
            <span class="spec-val">44.1 kHz • 16-Bit Stereo</span>
          </div>
          <div class="spec-line">
            <span class="spec-label">FX Processing:</span>
            <span class="spec-val">Master Insert Rack + 2.0s Natural Reverb Tail</span>
          </div>
          <div class="spec-line">
            <span class="spec-label">Tempo / Swing:</span>
            <span id="export-tempo-spec" class="spec-val">120 BPM • 0% Swing</span>
          </div>
        </div>

        <div id="render-progress-wrap" class="render-progress-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div id="render-progress-bar" class="render-progress-bar"></div>
        </div>
      </div>

      <div class="export-footer">
        <button id="btn-render-wav" type="button" class="btn-render-wav" aria-label="Start offline rendering and download WAV">
          <span aria-hidden="true">💾</span>
          <span id="btn-render-label">Render & Download WAV</span>
        </button>
      </div>
    `;

    document.body.appendChild(this.dialog);
  }

  bindEvents() {
    // 1. Close Modal
    const closeBtn = this.dialog.querySelector('#btn-close-export');
    closeBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      const rect = this.dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!inDialog) this.close();
    });

    // 2. Bar Selector Buttons
    const barBtns = this.dialog.querySelectorAll('.export-radio-btn');
    barBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        barBtns.forEach((b) => {
          b.classList.remove('is-selected');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('is-selected');
        btn.setAttribute('aria-checked', 'true');
        this.selectedBars = parseInt(btn.getAttribute('data-bars'), 10) || 2;
      });
    });

    // 3. Render Button
    const renderBtn = this.dialog.querySelector('#btn-render-wav');
    const renderLabel = this.dialog.querySelector('#btn-render-label');
    const progressWrap = this.dialog.querySelector('#render-progress-wrap');
    const progressBar = this.dialog.querySelector('#render-progress-bar');

    renderBtn?.addEventListener('click', async () => {
      renderBtn.disabled = true;
      if (renderLabel) renderLabel.textContent = 'Rendering Audio...';
      if (progressWrap) progressWrap.style.display = 'block';

      try {
        const pattern = this.sequencerEngine.getPattern();
        const bpm = this.sequencerEngine.bpm;
        const swing = this.sequencerEngine.swing;
        const fxState = this.fxEngine.getState();

        const wavBlob = await this.audioRecorder.bounceLoopOffline({
          pattern,
          bpm,
          swing,
          barCount: this.selectedBars,
          bufferLoader: this.bufferLoader,
          fxState,
          onProgress: (percent) => {
            if (progressBar) progressBar.style.width = `${percent}%`;
            progressWrap?.setAttribute('aria-valuenow', percent);
          }
        });

        const activeKit = this.controls.bankStatVal?.textContent?.replace(/\s+/g, '-').toLowerCase() || 'beat';
        const filename = `beatgrid-${activeKit}-${this.selectedBars}bars-${bpm}bpm.wav`;

        this.audioRecorder.downloadBlob(wavBlob, filename);
        toast.show(`Rendered & Downloaded ${filename}`, { type: 'success' });
        this.onStatusMessage(`Exported ${filename}`);

        setTimeout(() => {
          this.close();
          if (progressWrap) progressWrap.style.display = 'none';
          if (progressBar) progressBar.style.width = '0%';
          if (renderLabel) renderLabel.textContent = 'Render & Download WAV';
          renderBtn.disabled = false;
        }, 600);
      } catch (err) {
        console.error('Render audio error:', err);
        toast.show('Failed to render audio loop', { type: 'error' });
        renderBtn.disabled = false;
        if (renderLabel) renderLabel.textContent = 'Render & Download WAV';
      }
    });
  }

  open() {
    if (!this.dialog) return;
    const spec = this.dialog.querySelector('#export-tempo-spec');
    if (spec) {
      spec.textContent = `${this.sequencerEngine.bpm} BPM • ${this.sequencerEngine.swing}% Swing`;
    }
    this.dialog.showModal();
  }

  close() {
    this.dialog?.close();
  }
}
