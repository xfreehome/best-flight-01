// AeroRidge — the hand-in program (Node 22, standard library only).
// It gathers the game and its screenshots into the output directory and
// writes the dossier the judge reads, using the kit's vendored library.
//
// The game is plain static files: game/index.html plus the modules and the
// vendored three.js build it loads, all under game/, so it plays offline
// from any static server. The screenshots are real renders of that code.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps (from the competition's gate): the text budget
// shapes the dossier's bytes, and the rest refuse an entry the scorer
// would refuse — too many screenshots or one too large, too many files or
// bytes under game/, or a path under game/ too long. game/, screenshots/
// and dossier.json share /output's own 1,000-entry, 64 MiB cap.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  const shots = join(repoRoot, 'screenshots');
  if (existsSync(shots)) cpSync(shots, join(outDir, 'screenshots'), { recursive: true });
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
}

handIn();
