/**
 * scenes/index.js — explicit era manifest. No directory globbing: a malformed
 * file must fail loudly during development, not silently disappear on a render.
 */
import * as s01 from './scene_01.js';
import * as s02 from './scene_02.js';
import * as s03 from './scene_03.js';
import * as s04 from './scene_04.js';
import * as s05 from './scene_05.js';
import * as s06 from './scene_06.js';
import * as s07 from './scene_07.js';
import * as s08 from './scene_08.js';
import * as s09 from './scene_09.js';
import * as s10 from './scene_10.js';
import * as s11 from './scene_11.js';
import * as s12 from './scene_12.js';
import * as s13 from './scene_13.js';
import * as s14 from './scene_14.js';
import * as s15 from './scene_15.js';
import * as s16 from './scene_16.js';
import * as s17 from './scene_17.js';
import * as s18 from './scene_18.js';
import { SCENE_SPECS } from '../main/manifest.js';

const MODS = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18];

export const SCENES = MODS.map((mod, i) => {
  const spec = SCENE_SPECS[i];
  if (typeof mod.renderAt !== 'function') {
    console.error(`[scenes] scene ${spec.no} has no renderAt()`);
  }
  return {
    ...spec,
    renderAt: mod.renderAt,
    frameColor: mod.frameColor || null,
    placeholder: mod.placeholder === true,
  };
});

export const sceneAt = (i) => SCENES[i] || null;
