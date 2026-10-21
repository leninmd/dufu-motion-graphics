/**
 * kit/index.js — the shared toolbox handed to every era.
 * Scenes use only this surface (plus their own local algorithms) so that the
 * film remains reproducible, and so a scene can be read/reviewed in isolation.
 */
import * as math from './math.js';
import * as canvas from './canvas.js';
import * as paper from './paper.js';
import * as ink from './ink-engine.js';
import * as type from './type.js';
import * as frames from './frames.js';
import * as particles from './particles.js';
import * as geometry3d from './geometry3d.js';
import * as debug from './debug.js';
import { drawEraCard, drawHud } from './hud.js';
import * as rig from '../rig/dufu-rig.js';
import * as clock from '../beat/clock.js';

export const KIT = {
  ...math,
  ...canvas,
  ...type,
  paper,
  ink,
  frames,
  particles,
  geometry3d,
  debug,
  rig,
  clock,
  hud: { drawEraCard, drawHud },
  TAU: Math.PI * 2,
  W: 1920,
  H: 1080,
};

export default KIT;
