/**
 * Sound Bank & 16-Pad Layout Configuration
 * Defines default kits, pad metadata, keyboard triggers, and generator mappings.
 */

export const PAD_MAPPINGS = [
  // Row 1 (Top)
  { id: 0,  label: 'Kick 808',  key: '1',  code: 'Digit1', type: 'kick',     color: '#ef4444' },
  { id: 1,  label: 'Snare Hard', key: '2',  code: 'Digit2', type: 'snare',    color: '#f97316' },
  { id: 2,  label: 'HiHat Clsd', key: '3',  code: 'Digit3', type: 'closedHat',color: '#eab308' },
  { id: 3,  label: 'HiHat Open', key: '4',  code: 'Digit4', type: 'openHat',  color: '#84cc16' },

  // Row 2
  { id: 4,  label: 'Clap Crisp', key: 'Q',  code: 'KeyQ',   type: 'clap',     color: '#06b6d4' },
  { id: 5,  label: 'Rim Click',  key: 'W',  code: 'KeyW',   type: 'rim',      color: '#3b82f6' },
  { id: 6,  label: 'Tom High',   key: 'E',  code: 'KeyE',   type: 'tomHigh',  color: '#8b5cf6' },
  { id: 7,  label: 'Tom Mid',    key: 'R',  code: 'KeyR',   type: 'tomMid',   color: '#a855f7' },

  // Row 3
  { id: 8,  label: 'Tom Low',    key: 'A',  code: 'KeyA',   type: 'tomLow',   color: '#ec4899' },
  { id: 9,  label: 'Perc Blip',  key: 'S',  code: 'KeyS',   type: 'perc1',    color: '#10b981' },
  { id: 10, label: 'Perc Drop',  key: 'D',  code: 'KeyD',   type: 'perc2',    color: '#14b8a6' },
  { id: 11, label: 'Sub 808 C',  key: 'F',  code: 'KeyF',   type: 'subC',     color: '#f43f5e' },

  // Row 4 (Bottom)
  { id: 12, label: 'Sub 808 D',  key: 'Z',  code: 'KeyZ',   type: 'subD',     color: '#f59e0b' },
  { id: 13, label: 'Snare Ghost',key: 'X',  code: 'KeyX',   type: 'snareGhost',color: '#38bdf8' },
  { id: 14, label: 'Cowbell',    key: 'C',  code: 'KeyC',   type: 'cowbell',  color: '#6366f1' },
  { id: 15, label: 'Shaker',     key: 'V',  code: 'KeyV',   type: 'shaker',   color: '#22c55e' }
];

export const SOUND_BANKS = {
  '808-trap': {
    id: '808-trap',
    name: '808 Trap Kit',
    description: 'Punchy subs, sharp claps, and sizzle hi-hats for modern beat production.',
    isSynthesized: true
  },
  'lofi-chill': {
    id: 'lofi-chill',
    name: 'Lo-Fi Chill Kit',
    description: 'Warm, textured analog drums and soft filtered transients for bedroom beats.',
    isSynthesized: true
  },
  'electro-synth': {
    id: 'electro-synth',
    name: 'Electro Synth Kit',
    description: 'Classic electronic percussion and synthesized punchy tones.',
    isSynthesized: true
  }
};
