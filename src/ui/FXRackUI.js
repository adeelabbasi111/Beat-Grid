/**
 * FXRackUI - Studio Outboard Effects Rack & Skeuomorphic Rotary Dials
 * Manages 4 hardware audio processors:
 * 1. Multi-mode Filter (Cutoff, Q, Mode switch)
 * 2. Tube Overdrive / Saturation (Drive amount)
 * 3. Tape Stereo Delay (Time, Feedback, Dry/Wet Mix)
 * 4. Algorithmic Studio Reverb (Decay time, Dry/Wet Mix)
 * Features 270° interactive rotary dials with drag, scroll, double-click reset,
 * accessible keyboard slider roles, and session persistence triggers.
 */

import { fxEngine } from '../audio/FXEngine.js';

export class FXRackUI {
  constructor(containerElement, {
    onStatusMessage = () => {},
    onSaveSession = () => {},
    onResetSession = () => {},
    onExportPattern = () => {},
    onImportPattern = () => {}
  } = {}) {
    this.container = containerElement;
    this.onStatusMessage = onStatusMessage;
    this.onSaveSession = onSaveSession;
    this.onResetSession = onResetSession;
    this.onExportPattern = onExportPattern;
    this.onImportPattern = onImportPattern;

    this.knobs = new Map();
    this.render();
    this.bindEvents();
    this.syncFromEngine(fxEngine.getState());

    fxEngine.onStateChange((state) => {
      this.syncFromEngine(state);
    });
  }

  render() {
    this.container.innerHTML = `
      <section class="fx-rack-container" aria-label="Master Sound Effects Processor Rack">
        <!-- Rack Header -->
        <div class="fx-header">
          <div class="fx-title-wrap">
            <svg class="fx-rack-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16"></path>
              <circle cx="8" cy="6" r="2"></circle>
              <circle cx="16" cy="12" r="2"></circle>
              <circle cx="10" cy="18" r="2"></circle>
            </svg>
            <h2 class="fx-title">Master FX Rack</h2>
            <span class="fx-rack-badge">DSP INSERT</span>
          </div>

          <div class="fx-actions" role="toolbar" aria-label="Master FX & Session Actions">
            <button id="fx-global-bypass-btn" type="button" class="btn-fx-action" aria-label="Toggle Global FX Bypass" aria-pressed="false" title="Bypass all insert effects">
              <span aria-hidden="true">⚡</span>
              <span id="fx-global-bypass-label">BYPASS ALL</span>
            </button>
            <button id="session-save-btn" type="button" class="btn-fx-action" aria-label="Save current session to browser storage" title="Save session to localStorage">
              <span aria-hidden="true">💾</span>
              <span>Save</span>
            </button>
            <button id="session-export-btn" type="button" class="btn-fx-action" aria-label="Export beat as JSON file" title="Download beat JSON">
              <span aria-hidden="true">📥</span>
              <span>Export</span>
            </button>
            <button id="session-import-btn" type="button" class="btn-fx-action" aria-label="Import beat from JSON file" title="Upload beat JSON">
              <span aria-hidden="true">📤</span>
              <span>Import</span>
            </button>
            <input type="file" id="session-file-input" accept=".json" style="display: none;" aria-hidden="true" />
            <button id="session-reset-btn" type="button" class="btn-fx-action" aria-label="Reset session to factory defaults" title="Reset all to defaults">
              <span aria-hidden="true">🔄</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        <!-- 4 Outboard FX Units -->
        <div class="fx-grid">
          <!-- 1. Filter Unit -->
          <div id="unit-filter" class="fx-unit is-active" aria-label="Dynamic Filter Processor">
            <div class="fx-unit-header">
              <span class="fx-unit-title">1. Resonant Filter</span>
              <button id="btn-power-filter" type="button" class="fx-power-btn active-led" aria-label="Toggle Filter" aria-pressed="true">
                <span class="fx-power-led" aria-hidden="true"></span>
              </button>
            </div>
            <div class="fx-filter-type-switch" role="group" aria-label="Filter type">
              <button id="btn-filter-lp" type="button" class="btn-filter-type active-type" aria-label="Lowpass filter mode">LP</button>
              <button id="btn-filter-hp" type="button" class="btn-filter-type" aria-label="Highpass filter mode">HP</button>
            </div>
            <div class="fx-dials-row">
              <div id="knob-filter-cutoff"></div>
              <div id="knob-filter-q"></div>
            </div>
          </div>

          <!-- 2. Analog Drive Unit -->
          <div id="unit-drive" class="fx-unit" aria-label="Analog Saturation and Tube Drive">
            <div class="fx-unit-header">
              <span class="fx-unit-title">2. Tube Saturation</span>
              <button id="btn-power-drive" type="button" class="fx-power-btn" aria-label="Toggle Drive" aria-pressed="false">
                <span class="fx-power-led" aria-hidden="true"></span>
              </button>
            </div>
            <div class="fx-dials-row" style="margin-top: 1.2rem;">
              <div id="knob-drive-amt"></div>
            </div>
          </div>

          <!-- 3. Stereo Delay Unit -->
          <div id="unit-delay" class="fx-unit" aria-label="Stereo Tape Delay Processor">
            <div class="fx-unit-header">
              <span class="fx-unit-title">3. Tape Delay</span>
              <button id="btn-power-delay" type="button" class="fx-power-btn" aria-label="Toggle Tape Delay" aria-pressed="false">
                <span class="fx-power-led" aria-hidden="true"></span>
              </button>
            </div>
            <div class="fx-dials-row">
              <div id="knob-delay-time"></div>
              <div id="knob-delay-feedback"></div>
              <div id="knob-delay-mix"></div>
            </div>
          </div>

          <!-- 4. Algorithmic Reverb Unit -->
          <div id="unit-reverb" class="fx-unit" aria-label="Algorithmic Studio Reverb">
            <div class="fx-unit-header">
              <span class="fx-unit-title">4. Studio Reverb</span>
              <button id="btn-power-reverb" type="button" class="fx-power-btn" aria-label="Toggle Studio Reverb" aria-pressed="false">
                <span class="fx-power-led" aria-hidden="true"></span>
              </button>
            </div>
            <div class="fx-dials-row">
              <div id="knob-reverb-decay"></div>
              <div id="knob-reverb-mix"></div>
            </div>
          </div>
        </div>
      </section>
    `;

    // Instantiate Rotary Knobs
    this.initKnobs();
  }

  initKnobs() {
    // 1. Filter Cutoff (20Hz - 20000Hz, logarithmic)
    this.knobs.set('filter-cutoff', this.createRotaryKnob({
      container: this.container.querySelector('#knob-filter-cutoff'),
      label: 'Cutoff',
      min: 20,
      max: 20000,
      value: fxEngine.state.filter.cutoff,
      isLog: true,
      defaultVal: 20000,
      format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}Hz`,
      onChange: (val) => fxEngine.setFilterCutoff(val)
    }));

    // 2. Filter Resonance Q (0.1 - 18.0)
    this.knobs.set('filter-q', this.createRotaryKnob({
      container: this.container.querySelector('#knob-filter-q'),
      label: 'Res (Q)',
      min: 0.1,
      max: 18.0,
      value: fxEngine.state.filter.q,
      defaultVal: 1.0,
      format: (v) => v.toFixed(1),
      onChange: (val) => fxEngine.setFilterQ(val)
    }));

    // 3. Drive Amount (0 - 50)
    this.knobs.set('drive-amt', this.createRotaryKnob({
      container: this.container.querySelector('#knob-drive-amt'),
      label: 'Drive',
      min: 0,
      max: 50,
      value: fxEngine.state.drive.amount,
      defaultVal: 0,
      format: (v) => `${Math.round((v / 50) * 100)}%`,
      onChange: (val) => {
        fxEngine.setDriveAmount(val);
        if (val > 0 && !fxEngine.state.drive.enabled) {
          fxEngine.setDriveEnabled(true);
        }
      }
    }));

    // 4. Delay Time (0.05s - 1.0s)
    this.knobs.set('delay-time', this.createRotaryKnob({
      container: this.container.querySelector('#knob-delay-time'),
      label: 'Time',
      min: 0.05,
      max: 1.0,
      value: fxEngine.state.delay.time,
      defaultVal: 0.30,
      format: (v) => `${Math.round(v * 1000)}ms`,
      onChange: (val) => fxEngine.setDelayTime(val)
    }));

    // 5. Delay Feedback (0% - 85%)
    this.knobs.set('delay-fb', this.createRotaryKnob({
      container: this.container.querySelector('#knob-delay-feedback'),
      label: 'Feedback',
      min: 0.0,
      max: 0.85,
      value: fxEngine.state.delay.feedback,
      defaultVal: 0.35,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (val) => fxEngine.setDelayFeedback(val)
    }));

    // 6. Delay Mix (0% - 100%)
    this.knobs.set('delay-mix', this.createRotaryKnob({
      container: this.container.querySelector('#knob-delay-mix'),
      label: 'Mix',
      min: 0.0,
      max: 1.0,
      value: fxEngine.state.delay.mix,
      defaultVal: 0.30,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (val) => fxEngine.setDelayMix(val)
    }));

    // 7. Reverb Decay (0.2s - 4.0s)
    this.knobs.set('reverb-decay', this.createRotaryKnob({
      container: this.container.querySelector('#knob-reverb-decay'),
      label: 'Decay',
      min: 0.2,
      max: 4.0,
      value: fxEngine.state.reverb.decay,
      defaultVal: 1.5,
      format: (v) => `${v.toFixed(1)}s`,
      onChange: (val) => fxEngine.setReverbDecay(val)
    }));

    // 8. Reverb Mix (0% - 100%)
    this.knobs.set('reverb-mix', this.createRotaryKnob({
      container: this.container.querySelector('#knob-reverb-mix'),
      label: 'Mix',
      min: 0.0,
      max: 1.0,
      value: fxEngine.state.reverb.mix,
      defaultVal: 0.25,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (val) => fxEngine.setReverbMix(val)
    }));
  }

  /**
   * Factory function generating a tactile 270° rotary dial.
   */
  createRotaryKnob({
    container,
    label,
    min,
    max,
    value,
    isLog = false,
    defaultVal,
    format = (v) => v.toString(),
    onChange = () => {}
  }) {
    if (!container) return null;

    let currentVal = value !== undefined ? value : (defaultVal || min);

    container.innerHTML = `
      <div class="rotary-knob-wrap" role="slider" tabindex="0"
           aria-label="${label} rotary knob"
           aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${currentVal}"
           title="${label} (Drag up/down, scroll, or double-click to reset)">
        <div class="rotary-dial">
          <div class="rotary-pointer-rotor">
            <span class="rotary-pointer-line"></span>
          </div>
          <div class="rotary-cap"></div>
        </div>
        <span class="knob-label">${label}</span>
        <span class="knob-val">${format(currentVal)}</span>
      </div>
    `;

    const wrap = container.querySelector('.rotary-knob-wrap');
    const rotor = container.querySelector('.rotary-pointer-rotor');
    const valBadge = container.querySelector('.knob-val');

    // Converts actual value to normalized 0.0 - 1.0
    const toNormalized = (val) => {
      if (isLog) {
        return Math.log(val / min) / Math.log(max / min);
      }
      return (val - min) / (max - min);
    };

    // Converts normalized 0.0 - 1.0 to actual value
    const toActual = (norm) => {
      const clamped = Math.max(0, Math.min(1, norm));
      if (isLog) {
        return min * Math.pow(max / min, clamped);
      }
      return min + clamped * (max - min);
    };

    const updateDisplay = (val) => {
      currentVal = val;
      const norm = toNormalized(val);
      // Map normalized 0.0 -> 1.0 to -135deg -> +135deg (270 degree span)
      const deg = -135 + norm * 270;
      rotor.style.transform = `rotate(${deg}deg)`;
      valBadge.textContent = format(val);
      wrap.setAttribute('aria-valuenow', val);
    };

    updateDisplay(currentVal);

    // Pointer Drag Listeners
    let isDragging = false;
    let startY = 0;
    let startNorm = 0;

    wrap.addEventListener('pointerdown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startNorm = toNormalized(currentVal);
      wrap.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    wrap.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      // 150px drag distance spans entire 0 -> 1 range
      const deltaY = startY - e.clientY;
      const newNorm = Math.max(0, Math.min(1, startNorm + deltaY / 150));
      const actual = toActual(newNorm);
      updateDisplay(actual);
      onChange(actual);
    });

    const endDrag = (e) => {
      if (isDragging) {
        isDragging = false;
        try { wrap.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);

    // Mouse Wheel support
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = (e.deltaY < 0 ? 1 : -1) * 0.04;
      const newNorm = Math.max(0, Math.min(1, toNormalized(currentVal) + step));
      const actual = toActual(newNorm);
      updateDisplay(actual);
      onChange(actual);
    }, { passive: false });

    // Double-click to reset
    wrap.addEventListener('dblclick', () => {
      const resetTo = defaultVal !== undefined ? defaultVal : min;
      updateDisplay(resetTo);
      onChange(resetTo);
    });

    // Keyboard Arrow Controls
    wrap.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const newNorm = Math.max(0, Math.min(1, toNormalized(currentVal) + 0.05));
        const actual = toActual(newNorm);
        updateDisplay(actual);
        onChange(actual);
      } else if (['ArrowDown', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        const newNorm = Math.max(0, Math.min(1, toNormalized(currentVal) - 0.05));
        const actual = toActual(newNorm);
        updateDisplay(actual);
        onChange(actual);
      }
    });

    return {
      setValue: (val) => updateDisplay(val)
    };
  }

  bindEvents() {
    // 1. Global Bypass Button
    const globalBypassBtn = this.container.querySelector('#fx-global-bypass-btn');
    const globalBypassLabel = this.container.querySelector('#fx-global-bypass-label');

    globalBypassBtn?.addEventListener('click', () => {
      const isBypassed = !fxEngine.state.globalBypass;
      fxEngine.setGlobalBypass(isBypassed);
      globalBypassBtn.classList.toggle('active-bypass', isBypassed);
      globalBypassBtn.setAttribute('aria-pressed', isBypassed ? 'true' : 'false');
      if (globalBypassLabel) {
        globalBypassLabel.textContent = isBypassed ? 'FX BYPASSED' : 'BYPASS ALL';
      }
      this.onStatusMessage(isBypassed ? 'Master FX bypassed' : 'Master FX enabled');
    });

    // 2. Unit Bypass / Power Buttons
    const bindPowerBtn = (btnId, unitId, setEnabledFn) => {
      const btn = this.container.querySelector(btnId);
      const unit = this.container.querySelector(unitId);
      btn?.addEventListener('click', () => {
        const isActive = !unit.classList.contains('is-active');
        setEnabledFn(isActive);
        unit.classList.toggle('is-active', isActive);
        unit.classList.toggle('is-bypassed', !isActive);
        btn.classList.toggle('active-led', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    bindPowerBtn('#btn-power-filter', '#unit-filter', (en) => fxEngine.setFilterEnabled(en));
    bindPowerBtn('#btn-power-drive', '#unit-drive', (en) => fxEngine.setDriveEnabled(en));
    bindPowerBtn('#btn-power-delay', '#unit-delay', (en) => fxEngine.setDelayEnabled(en));
    bindPowerBtn('#btn-power-reverb', '#unit-reverb', (en) => fxEngine.setReverbEnabled(en));

    // 3. Filter Type Switch (LP / HP)
    const btnLp = this.container.querySelector('#btn-filter-lp');
    const btnHp = this.container.querySelector('#btn-filter-hp');

    btnLp?.addEventListener('click', () => {
      fxEngine.setFilterType('lowpass');
      btnLp.classList.add('active-type');
      btnHp.classList.remove('active-type');
      this.onStatusMessage('Filter: Lowpass mode');
    });

    btnHp?.addEventListener('click', () => {
      fxEngine.setFilterType('highpass');
      btnHp.classList.add('active-type');
      btnLp.classList.remove('active-type');
      this.onStatusMessage('Filter: Highpass mode');
    });

    // 4. Session Actions (Save, Reset, Export, Import)
    const saveBtn = this.container.querySelector('#session-save-btn');
    saveBtn?.addEventListener('click', () => {
      this.onSaveSession();
    });

    const resetBtn = this.container.querySelector('#session-reset-btn');
    resetBtn?.addEventListener('click', () => {
      if (window.confirm('Reset current session, patterns, and FX to factory defaults?')) {
        this.onResetSession();
      }
    });

    const exportBtn = this.container.querySelector('#session-export-btn');
    exportBtn?.addEventListener('click', () => {
      this.onExportPattern();
    });

    const importBtn = this.container.querySelector('#session-import-btn');
    const fileInput = this.container.querySelector('#session-file-input');

    importBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await this.onImportPattern(file);
        fileInput.value = '';
      }
    });
  }

  syncFromEngine(state) {
    if (!state) return;

    // Filter sync
    const unitFilter = this.container.querySelector('#unit-filter');
    const btnPowerFilter = this.container.querySelector('#btn-power-filter');
    unitFilter?.classList.toggle('is-active', state.filter.enabled);
    unitFilter?.classList.toggle('is-bypassed', !state.filter.enabled);
    btnPowerFilter?.classList.toggle('active-led', state.filter.enabled);

    const btnLp = this.container.querySelector('#btn-filter-lp');
    const btnHp = this.container.querySelector('#btn-filter-hp');
    btnLp?.classList.toggle('active-type', state.filter.type === 'lowpass');
    btnHp?.classList.toggle('active-type', state.filter.type === 'highpass');

    this.knobs.get('filter-cutoff')?.setValue(state.filter.cutoff);
    this.knobs.get('filter-q')?.setValue(state.filter.q);

    // Drive sync
    const unitDrive = this.container.querySelector('#unit-drive');
    const btnPowerDrive = this.container.querySelector('#btn-power-drive');
    unitDrive?.classList.toggle('is-active', state.drive.enabled);
    unitDrive?.classList.toggle('is-bypassed', !state.drive.enabled);
    btnPowerDrive?.classList.toggle('active-led', state.drive.enabled);
    this.knobs.get('drive-amt')?.setValue(state.drive.amount);

    // Delay sync
    const unitDelay = this.container.querySelector('#unit-delay');
    const btnPowerDelay = this.container.querySelector('#btn-power-delay');
    unitDelay?.classList.toggle('is-active', state.delay.enabled);
    unitDelay?.classList.toggle('is-bypassed', !state.delay.enabled);
    btnPowerDelay?.classList.toggle('active-led', state.delay.enabled);
    this.knobs.get('delay-time')?.setValue(state.delay.time);
    this.knobs.get('delay-fb')?.setValue(state.delay.feedback);
    this.knobs.get('delay-mix')?.setValue(state.delay.mix);

    // Reverb sync
    const unitReverb = this.container.querySelector('#unit-reverb');
    const btnPowerReverb = this.container.querySelector('#btn-power-reverb');
    unitReverb?.classList.toggle('is-active', state.reverb.enabled);
    unitReverb?.classList.toggle('is-bypassed', !state.reverb.enabled);
    btnPowerReverb?.classList.toggle('active-led', state.reverb.enabled);
    this.knobs.get('reverb-decay')?.setValue(state.reverb.decay);
    this.knobs.get('reverb-mix')?.setValue(state.reverb.mix);

    // Global bypass sync
    const globalBypassBtn = this.container.querySelector('#fx-global-bypass-btn');
    const globalBypassLabel = this.container.querySelector('#fx-global-bypass-label');
    globalBypassBtn?.classList.toggle('active-bypass', state.globalBypass);
    globalBypassBtn?.setAttribute('aria-pressed', state.globalBypass ? 'true' : 'false');
    if (globalBypassLabel) {
      globalBypassLabel.textContent = state.globalBypass ? 'FX BYPASSED' : 'BYPASS ALL';
    }
  }
}
