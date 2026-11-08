/**
 * Factory Drum Patterns & Rhythm Presets
 * Defines 16-step rhythmic loops across 16 drum pad tracks for each kit.
 */

// Helper to create empty 16x16 grid
export function createEmptyPattern() {
  return Array.from({ length: 16 }, () => new Array(16).fill(0));
}

// Helper to create patterned matrix from note definitions
function buildPattern(tempo, swing, trackEvents) {
  const grid = createEmptyPattern();
  for (const [trackId, steps] of Object.entries(trackEvents)) {
    const id = parseInt(trackId, 10);
    if (grid[id]) {
      steps.forEach((s) => {
        if (s >= 0 && s < 16) grid[id][s] = 1;
      });
    }
  }
  return { tempo, swing, grid };
}

export const FACTORY_PATTERNS = {
  '808-trap': buildPattern(140, 5, {
    0:  [0, 7, 10],                        // Kick 808
    1:  [4, 12],                           // Snare Hard
    2:  [0, 2, 4, 6, 8, 10, 12, 14, 15],   // HiHat Closed (rolling 16ths)
    3:  [6, 14],                           // HiHat Open
    4:  [4, 12],                           // Clap Crisp
    9:  [11],                              // Perc Blip
    11: [0, 7]                             // Sub 808 C
  }),

  'lofi-chill': buildPattern(85, 26, {
    0:  [0, 10],                           // Kick Mellow
    1:  [4, 12],                           // Snare Vinyl
    2:  [0, 2, 4, 6, 8, 10, 12, 14],       // HiHat Warm (Swung 8ths)
    5:  [4, 12],                           // Rim Click
    8:  [14],                              // Tom Low
    15: [1, 3, 5, 7, 9, 11, 13, 15]        // Shaker Groove
  }),

  'electro-synth': buildPattern(126, 10, {
    0:  [0, 4, 8, 12],                     // 4-on-the-Floor Kick
    2:  [0, 2, 4, 6, 8, 10, 12, 14],       // HiHat Closed
    3:  [2, 6, 10, 14],                     // Offbeat Open Hat
    4:  [4, 12],                           // Snappy Clap
    14: [3, 7, 11, 15]                     // Synced Cowbell
  })
};
