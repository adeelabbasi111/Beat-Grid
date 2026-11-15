/**
 * StorageManager - LocalStorage State Persistence & Session Preset Engine
 * Manages saving, loading, auto-syncing, exporting, and importing of:
 * - Sequencer 16x16 patterns
 * - Tempo (BPM), Master Volume, Roger Linn Swing
 * - Active Drum Kit
 * - Master FX Rack parameters (Filter, Drive, Delay, Reverb)
 * - Custom Keyboard Mappings
 */

const STORAGE_KEY = 'beatgrid_session_v1';

export class StorageManager {
  constructor({ onSaveStatus = () => {} } = {}) {
    this.onSaveStatus = onSaveStatus;
    this.debounceTimer = null;
  }

  /**
   * Checks if a saved session exists in browser storage.
   */
  hasSavedSession() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Loads the saved session object from localStorage.
   */
  loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load session from localStorage:', e);
    }
    return null;
  }

  /**
   * Saves current session snapshot into localStorage.
   */
  saveSession(sessionData) {
    try {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        ...sessionData
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      this.onSaveStatus('Session saved to localStorage');
      return true;
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e);
      return false;
    }
  }

  /**
   * Debounced auto-save to avoid thrashing localStorage during slider drags.
   */
  autoSave(sessionDataProvider, delayMs = 400) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      try {
        const data = typeof sessionDataProvider === 'function' ? sessionDataProvider() : sessionDataProvider;
        this.saveSession(data);
      } catch (e) {
        console.warn('AutoSave error:', e);
      }
    }, delayMs);
  }

  /**
   * Clears saved session from browser storage.
   */
  resetSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.onSaveStatus('Session reset to factory defaults');
      return true;
    } catch (e) {
      console.warn('Failed to reset session:', e);
      return false;
    }
  }

  /**
   * Exports the pattern and sound settings as a portable JSON file.
   */
  exportPatternJSON(sessionData, filename = 'beatgrid-pattern.json') {
    try {
      const jsonStr = JSON.stringify(sessionData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.onSaveStatus(`Exported ${filename}`);
      return true;
    } catch (e) {
      console.error('Export pattern error:', e);
      return false;
    }
  }

  /**
   * Parses an imported JSON string or File object.
   */
  async importPatternJSON(fileOrString) {
    try {
      let rawText = '';
      if (typeof fileOrString === 'string') {
        rawText = fileOrString;
      } else if (fileOrString instanceof Blob) {
        rawText = await fileOrString.text();
      } else {
        throw new Error('Unsupported import source');
      }

      const parsed = JSON.parse(rawText);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format');
      }
      this.onSaveStatus('Imported custom beat preset');
      return parsed;
    } catch (e) {
      console.error('Import pattern error:', e);
      throw e;
    }
  }
}

export const storageManager = new StorageManager();
