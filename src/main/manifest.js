/**
 * manifest.js — the film's ledger: 18 eras, their metadata, palette, HUD tone,
 * transition grammar and freeze-frame choice for the final gallery.
 */
import { DISTANCE_ANCHORS } from '../beat/clock.js';

export const SCENE_SPECS = [
  {
    index: 0, no: '01', number: '01', file: 'scene_01.js', id: 'stone',
    zh: '汉唐石刻拓片', en: 'Rubbing & Stone Engraving', algorithm: 'Rubbing & Stone Engraving',
    year: '712 · 巩县降生', place: '巩县', distance: 0,
    style: 'rubbing', tone: 'dark', accent: '#b8342a',
    transition: 'seal', freezeU: 2.5,
    palette: ['#15130f', '#d9cdb6', '#2a241b', '#a52a22'],
    motif: 'stone',
  },
  {
    index: 1, no: '02', number: '02', file: 'scene_02.js', id: 'baimiao',
    zh: '吴道子白描', en: 'Bezier Ribbon Dynamics', algorithm: 'Bezier Ribbon Dynamics',
    year: '731 · 吴越壮游', place: '吴越', distance: 420,
    style: 'baimiao', tone: 'light', accent: '#a52a22',
    transition: 'ink', freezeU: 2.45,
    palette: ['#f3efe4', '#221c14', '#9b8c74', '#a52a22'],
    motif: 'ribbon',
  },
  {
    index: 2, no: '03', number: '03', file: 'scene_03.js', id: 'pointcloud',
    zh: '三维水墨点云', en: '3D Point Cloud Perspective', algorithm: '3D Point Cloud Perspective',
    year: '736 · 齐鲁望岳', place: '泰山', distance: 705,
    style: 'pointcloud', tone: 'dark', accent: '#8fcfc2',
    transition: 'orbit', freezeU: 3.05,
    palette: ['#07100f', '#dce8df', '#77b9aa', '#2d4d45'],
    motif: 'cloud',
  },
  {
    index: 3, no: '04', number: '04', file: 'scene_04.js', id: 'gold',
    zh: '盛唐泥金界画', en: 'Gold-Green Ruled Painting + 3D TypeField', algorithm: 'Gold-Green Ruled Painting + 3D TypeField',
    year: '746 · 初入长安', place: '长安', distance: 1037,
    style: 'gold', tone: 'dark', accent: '#d4af37',
    transition: 'gate', freezeU: 2.25,
    palette: ['#071c15', '#1b4d3e', '#d4af37', '#b4261e'],
    motif: 'gold',
  },
  {
    index: 4, no: '05', number: '05', file: 'scene_05.js', id: 'ledger',
    zh: '宋代尺页账簿', en: 'Song Album Leaf & Counting Rods', algorithm: 'Song Album Leaf & Counting Rods',
    year: '751 · 困守长安十年', place: '长安', distance: 1037,
    style: 'ledger', tone: 'light', accent: '#9d3024',
    transition: 'ledger', freezeU: 2.65,
    palette: ['#e5d9bd', '#3b2d1c', '#9d3024', '#6b5538'],
    motif: 'ledger',
  },
  {
    index: 5, no: '06', number: '06', file: 'scene_06.js', id: 'construct',
    zh: '构成主义切割', en: 'Russian Constructivism Split', algorithm: 'Russian Constructivism Split',
    year: '755 · 奉先咏怀', place: '奉先', distance: 1150,
    style: 'construct', tone: 'dark', accent: '#e13a2c',
    transition: 'construct', freezeU: 2.35,
    palette: ['#d8cfbc', '#cf2e25', '#12100d', '#cd9a36'],
    motif: 'construct',
  },
  {
    index: 6, no: '07', number: '07', file: 'scene_07.js', id: 'woodcut',
    zh: '表现主义木刻', en: 'Woodcut Print & Tape Meltdown', algorithm: 'Woodcut Print & Tape Meltdown',
    year: '755冬 · 安史之乱', place: '奉先—灵武', distance: 1420,
    style: 'woodcut', tone: 'dark', accent: '#c03026',
    transition: 'cut', freezeU: 2.5,
    palette: ['#e6dcc4', '#191511', '#b62b22'],
    motif: 'woodcut',
  },
  {
    index: 7, no: '08', number: '08', file: 'scene_08.js', id: 'spheres',
    zh: '金属球体挤压', en: 'PBR Gold Spheres Crush', algorithm: 'PBR Gold Spheres Crush',
    year: '757 · 长安春望', place: '长安', distance: 1880,
    style: 'pbr', tone: 'dark', accent: '#d8aa4f',
    transition: 'stamp', freezeU: 2.55,
    palette: ['#070706', '#2a2115', '#d8aa4f', '#f2e3c2'],
    motif: 'gold',
  },
  {
    index: 8, no: '09', number: '09', file: 'scene_09.js', id: 'shadow',
    zh: '关中镂空皮影', en: 'Shadow Puppetry @ 10fps', algorithm: 'Shadow Puppetry @ 10fps',
    year: '759 · 石壕吏与陇右古道', place: '石壕村', distance: 2600,
    style: 'shadow', tone: 'dark', accent: '#d7973b',
    transition: 'shadow', freezeU: 2.35,
    palette: ['#120b06', '#e3a94e', '#7c2d12', '#f4d49a'],
    motif: 'shadow',
  },
  {
    index: 9, no: '10', number: '10', file: 'scene_10.js', id: 'bullet',
    zh: '离屏粒子草堂', en: 'Offscreen Particle Dissolve & Bullet Time', algorithm: 'Offscreen Particle Dissolve & Bullet Time',
    year: '761 · 成都草堂秋风', place: '成都', distance: 3100,
    style: 'bullet', tone: 'dark', accent: '#c53227',
    transition: 'wind', freezeU: 3.3,
    palette: ['#28322b', '#0b120e', '#e5ddc6', '#c53227'],
    motif: 'wind',
  },
  {
    index: 10, no: '11', number: '11', file: 'scene_11.js', id: 'monument',
    zh: '北宋巨碑山水', en: 'Monumental Landscape Micro-Scale', algorithm: 'Monumental Landscape Micro-Scale',
    year: '766 · 夔州三峡登高', place: '夔州', distance: 3880,
    style: 'monument', tone: 'light', accent: '#3c3529',
    transition: 'zoom', freezeU: 3.05,
    palette: ['#e8dfc9', '#191711', '#6e6554', '#a52a22'],
    motif: 'mountain',
  },
  {
    index: 11, no: '12', number: '12', file: 'scene_12.js', id: 'bada',
    zh: '八大山人写意', en: 'Bada Shanren Minimalism & Water Shader', algorithm: 'Bada Shanren Minimalism & Water Shader',
    year: '768 · 出峡入湘江', place: '湘江', distance: 4350,
    style: 'minimal', tone: 'light', accent: '#a52a22',
    transition: 'water', freezeU: 2.6,
    palette: ['#f6f2e8', '#1b1812', '#a52a22', '#728c8e'],
    motif: 'water',
  },
  {
    index: 12, no: '13', number: '13', file: 'scene_13.js', id: 'crt',
    zh: '示波器心电图', en: '1960s Oscilloscope Vector CRT', algorithm: '1960s Oscilloscope Vector CRT',
    year: '770 · 潭州绝笔', place: '潭州', distance: 4739,
    style: 'crt', tone: 'dark', accent: '#00ff66',
    transition: 'crt', freezeU: 2.5,
    palette: ['#010703', '#00ff66', '#b5ffcd', '#1a6a3a'],
    motif: 'signal',
  },
  {
    index: 13, no: '14', number: '14', file: 'scene_14.js', id: 'collapse',
    zh: '刚体物理坍塌', en: 'Pre-Baked Rigid-Body Collapse', algorithm: 'Pre-Baked Rigid-Body Collapse',
    year: '跨时空叩问 · 现代黑屏', place: '无题', distance: 4739,
    style: 'black', tone: 'dark', accent: '#e9dcc4',
    transition: 'scan', freezeU: 2.65,
    palette: ['#050505', '#f1e6cf', '#a52a22', '#5b1114'],
    motif: 'black',
  },
  {
    index: 14, no: '15', number: '15', file: 'scene_15.js', id: 'cards',
    zh: '像素烂牌局', en: 'Retro Pixel & 3D Card Flip', algorithm: 'Retro Pixel & 3D Card Flip',
    year: '人生烂牌局', place: '八世纪 / 1980s', distance: 4739,
    style: 'pixel', tone: 'dark', accent: '#f4d03f',
    transition: 'pixel', freezeU: 2.75,
    palette: ['#0b0b12', '#f4d03f', '#e8413a', '#f4eee1'],
    motif: 'pixel',
  },
  {
    index: 15, no: '16', number: '16', file: 'scene_16.js', id: 'y2k',
    zh: '千禧年复古桌面', en: 'Y2K Retro OS Windows', algorithm: 'Y2K Retro OS Windows',
    year: '2000s · 后世公论', place: '历史检索系统', distance: 4739,
    style: 'y2k', tone: 'light', accent: '#103e79',
    transition: 'window', freezeU: 2.6,
    palette: ['#2b89a8', '#d4d0c8', '#0a246a', '#103e79'],
    motif: 'desktop',
  },
  {
    index: 16, no: '17', number: '17', file: 'scene_17.js', id: 'shorts',
    zh: '竖屏弹幕风暴', en: 'Vertical Short-Video & Danmaku Storm', algorithm: 'Vertical Short-Video & Danmaku Storm',
    year: '2020s · 移动算法时代', place: '一块竖屏', distance: 4739,
    style: 'shorts', tone: 'dark', accent: '#ff2b4d',
    transition: 'vertical', freezeU: 2.6,
    palette: ['#08090e', '#ffffff', '#ff2b4d', '#9e9b93'],
    motif: 'danmaku',
  },
  {
    index: 17, no: '18', number: '18', file: 'scene_18.js', id: 'code',
    zh: '现代代码美学', en: 'Dark IDE & Live SVG/Shader Coding', algorithm: 'Dark IDE & Live SVG/Shader Coding',
    year: '2026 · 大模型时代', place: '一台编辑器', distance: 4739,
    style: 'code', tone: 'dark', accent: '#7ec8ff',
    transition: 'compile', freezeU: 2.8,
    palette: ['#0b1016', '#7ec8ff', '#f1d58a', '#1b2634'],
    motif: 'code',
  },
];

for (let i = 0; i < SCENE_SPECS.length; i++) {
  const s = SCENE_SPECS[i];
  s.index = i;
  s.no = String(i + 1).padStart(2, '0');
  s.number = s.no;
  s.distance = DISTANCE_ANCHORS[i];
}

export const sceneSpec = (i) => SCENE_SPECS[i] || null;
export const sceneNumber = (i) => String(i + 1).padStart(2, '0');

/** Transition style entering era i (scene 0 enters from the intro seal). */
export const transitionInto = (i) => SCENE_SPECS[i]?.transition || 'cut';
