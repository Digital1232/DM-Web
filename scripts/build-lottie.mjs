/**
 * Generates the One Desk Lottie animations in img/lottie/*.json.
 *
 *   node scripts/build-lottie.mjs
 *
 * They're plain Lottie (Bodymovin) JSON, drawn in the app's colours. To use a
 * LottieFiles animation instead, download its "Lottie JSON" and save it over
 * the matching file in img/lottie/ (e.g. img/lottie/task-complete.json).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'img', 'lottie');
const W = 200, H = 200, FR = 60;

// ── helpers ──────────────────────────────────────────────────────────────
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1]; };
const st = (k) => ({ a: 0, k });
const EASE = {
  out: [[0.33, 1], [0.68, 1]],
  inOut: [[0.65, 0], [0.35, 1]],
  back: [[0.34, 1.56], [0.64, 1]],
  linear: [[0, 0], [1, 1]],
};
// Animated property from [[frame, value], ...]
function kf(frames, ease = 'out') {
  const dims = Array.isArray(frames[0][1]) ? frames[0][1].length : 1;
  const [o, i] = EASE[ease];
  const rep = (v) => Array(dims).fill(v);
  return {
    a: 1,
    k: frames.map(([t, v], idx) => {
      const s = Array.isArray(v) ? v : [v];
      return idx < frames.length - 1
        ? { t, s, o: { x: rep(o[0]), y: rep(o[1]) }, i: { x: rep(i[0]), y: rep(i[1]) } }
        : { t, s };
    }),
  };
}
const tr = (o = {}) => ({
  ty: 'tr', p: o.p || st([0, 0]), a: st([0, 0]), s: o.s || st([100, 100]),
  r: o.r || st(0), o: o.o || st(100), sk: st(0), sa: st(0),
});
const group = (items, t = {}, nm = 'g') => ({ ty: 'gr', nm, np: items.length, it: [...items, tr(t)] });
const ellipse = (size, pos = [0, 0]) => ({ ty: 'el', d: 1, p: st(pos), s: Array.isArray(size) ? st(size) : st([size, size]) });
const rect = (w, h, r = 0, pos = [0, 0]) => ({ ty: 'rc', d: 1, p: st(pos), s: st([w, h]), r: st(r) });
const pathShape = (v, closed = false, inT, outT) => ({
  ty: 'sh', ks: st({ v, i: inT || v.map(() => [0, 0]), o: outT || v.map(() => [0, 0]), c: closed }),
});
const fill = (color, op = 100) => ({ ty: 'fl', c: st(hex(color)), o: typeof op === 'object' ? op : st(op), r: 1 });
const stroke = (color, w, op = 100) => ({ ty: 'st', c: st(hex(color)), o: typeof op === 'object' ? op : st(op), w: st(w), lc: 2, lj: 2, ml: 4 });
const trim = (s, e) => ({ ty: 'tm', s: s || st(0), e: e || st(100), o: st(0), m: 1 });

function layer(nm, shapes, { p, s, r, o, op, masks } = {}) {
  const L = {
    ddd: 0, ty: 4, nm, sr: 1, ao: 0, bm: 0, ip: 0, op, st: 0,
    ks: {
      o: o || st(100), r: r || st(0),
      p: p || st([W / 2, H / 2, 0]), a: st([0, 0, 0]), s: s || st([100, 100, 100]),
    },
    shapes,
  };
  if (masks) { L.hasMask = true; L.masksProperties = masks; }
  return L;
}
const mask = (v, mode = 'a', inv = false) => ({
  inv, mode, nm: 'mask', o: st(100), x: st(0),
  pt: st({ v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), c: true }),
});
// Circle as a bezier path (for masks)
function circlePath(cx, cy, r) {
  const k = 0.5523 * r;
  return {
    v: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]],
    i: [[-k, 0], [0, -k], [k, 0], [0, k]],
    o: [[k, 0], [0, k], [-k, 0], [0, -k]],
  };
}
function anim(nm, op, layers) {
  // Lottie draws the first layer on top; callers list layers back-to-front.
  const ordered = [...layers].reverse().map((l, i) => ({ ...l, ind: i + 1, op }));
  return { v: '5.7.4', fr: FR, ip: 0, op, w: W, h: H, nm, ddd: 0, assets: [], layers: ordered };
}
const pop = (t0, size = 100) => kf([[t0, [0, 0, 100]], [t0 + 16, [size * 1.1, size * 1.1, 100]], [t0 + 26, [size, size, 100]]], 'out');
const ring = (color, t0, from = 100, to = 165, peak = 55) => layer('ring', [group([ellipse(104), stroke(color, 4)])], {
  s: kf([[t0, [from, from, 100]], [t0 + 34, [to, to, 100]]], 'out'),
  o: kf([[t0, peak], [t0 + 34, 0]], 'out'),
});

// Confetti burst from the centre
function confetti(t0, count = 14) {
  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#a855f7', '#f43f5e'];
  const out = [];
  for (let n = 0; n < count; n++) {
    const ang = (n / count) * Math.PI * 2 + (n % 2 ? 0.18 : -0.12);
    const dist = 62 + (n % 3) * 12;
    const x = W / 2 + Math.cos(ang) * dist, y = H / 2 + Math.sin(ang) * dist;
    const shape = n % 3 === 0 ? ellipse(7) : rect(9, 5, 1.5);
    const t = t0 + (n % 4);
    out.push(layer('confetti', [group([shape, fill(colors[n % colors.length])])], {
      p: kf([[t, [W / 2, H / 2, 0]], [t + 26, [x, y, 0]], [t + 50, [x, y + 14, 0]]], 'out'),
      r: kf([[t, 0], [t + 50, (n % 2 ? 1 : -1) * 260]], 'out'),
      s: kf([[t, [40, 40, 100]], [t + 12, [110, 110, 100]], [t + 50, [70, 70, 100]]], 'out'),
      o: kf([[t, 0], [t + 4, 100], [t + 34, 100], [t + 52, 0]], 'linear'),
    }));
  }
  return out;
}

// ── animations ───────────────────────────────────────────────────────────

// Task completed: green disc pops, check draws in, confetti burst
function taskComplete() {
  const green = '#10b981';
  return anim('task-complete', 100, [
    ring(green, 10, 80, 150, 60),
    layer('disc', [group([ellipse(108), fill(green)])], { s: pop(0) }),
    layer('check', [group([
      pathShape([[-24, 2], [-7, 19], [26, -16]]),
      trim(null, kf([[14, 0], [34, 100]], 'out')),
      stroke('#ffffff', 11),
    ])]),
    ...confetti(16),
  ]);
}

// Task started / work resumed: disc pops, play icon springs in, ripples
function playBurst(name, color) {
  return anim(name, 90, [
    ring(color, 6), ring(color, 22),
    layer('disc', [group([ellipse(100), fill(color)])], { s: pop(0) }),
    layer('play', [group([
      pathShape([[-11, -18], [20, 0], [-11, 18]], true),
      fill('#ffffff'), stroke('#ffffff', 6),
    ], { p: st([3, 0]) })], {
      s: kf([[8, [0, 0, 100]], [26, [100, 100, 100]]], 'back'),
      r: kf([[8, -25], [26, 0]], 'back'),
    }),
  ]);
}

// Check in: the sun rises over the horizon, rays fan out
function checkIn() {
  const sun = '#f59e0b';
  const horizonY = 30;
  const clip = mask([[-100, -100], [100, -100], [100, horizonY - 2], [-100, horizonY - 2]]);
  const rays = [];
  for (let n = 0; n < 8; n++) {
    const a = (n / 8) * Math.PI * 2;
    rays.push(pathShape([[Math.cos(a) * 44, Math.sin(a) * 44], [Math.cos(a) * 56, Math.sin(a) * 56]]));
  }
  const rise = kf([[0, [0, 70]], [36, [0, -6]]], 'out');
  return anim('check-in', 110, [
    layer('glow', [group([ellipse(118), fill('#fde68a', 55)], { p: rise })], { masks: [clip] }),
    layer('rays', [group([...rays, stroke(sun, 6)], {
      p: kf([[0, [0, 70]], [36, [0, -6]]], 'out'),
      s: kf([[26, [0, 0]], [48, [100, 100]]], 'back'),
      r: kf([[26, 0], [110, 40]], 'linear'),
    })], { masks: [clip] }),
    layer('sun', [group([ellipse(66), fill(sun)], { p: rise })], { masks: [clip] }),
    layer('horizon', [group([
      pathShape([[-74, horizonY], [74, horizonY]]),
      trim(kf([[0, 50], [22, 0]], 'out'), kf([[0, 50], [22, 100]], 'out')),
      stroke('#f59e0b', 6),
    ])]),
  ]);
}

// Check out: crescent moon swings in, stars twinkle
function checkOut() {
  const moon = '#8b5cf6';
  const c = circlePath(20, -14, 34);
  const bite = { inv: false, mode: 's', nm: 'bite', o: st(100), x: st(0), pt: st({ ...c, c: true }) };
  const star = (cx, cy, size, t0) => {
    const k = size, q = size * 0.28;
    return layer('star', [group([
      pathShape([[0, -k], [q, -q], [k, 0], [q, q], [0, k], [-q, q], [-k, 0], [-q, -q]], true),
      fill('#fbbf24'),
    ])], {
      p: st([W / 2 + cx, H / 2 + cy, 0]),
      s: kf([[t0, [0, 0, 100]], [t0 + 14, [120, 120, 100]], [t0 + 30, [70, 70, 100]], [t0 + 46, [110, 110, 100]], [t0 + 62, [85, 85, 100]]], 'inOut'),
    });
  };
  return anim('check-out', 120, [
    layer('glow', [group([ellipse(116), fill('#c4b5fd', 28)])], { s: pop(0) }),
    layer('moon', [group([ellipse(80), fill(moon)])], {
      masks: [bite],
      s: kf([[4, [0, 0, 100]], [22, [108, 108, 100]], [32, [100, 100, 100]]], 'out'),
      r: kf([[4, -40], [32, 0]], 'back'),
    }),
    star(-48, -40, 9, 18), star(52, -30, 7, 28), star(44, 44, 8, 38), star(-50, 40, 6, 46),
  ]);
}

// Break: coffee cup with rising steam (loops)
function breakCup() {
  const cup = '#6366f1';
  const steam = (x, delay) => {
    const v = [[0, 0], [0, -14], [0, -28]];
    const inT = [[0, 0], [6, 5], [-6, 5]];
    const outT = [[6, -5], [-6, -5], [0, 0]];
    const t0 = delay, T = 120;
    return layer('steam', [group([
      pathShape(v, false, inT, outT), stroke('#94a3b8', 5),
    ], { p: st([x, -22]) })], {
      p: kf([[t0, [W / 2, H / 2 + 2, 0]], [t0 + 80, [W / 2, H / 2 - 16, 0]]], 'linear'),
      o: kf([[t0, 0], [t0 + 20, 85], [t0 + 60, 60], [t0 + 80, 0], [T, 0]], 'linear'),
    });
  };
  return anim('break', 120, [
    layer('saucer', [group([rect(104, 10, 5, [-4, 52]), fill('#c7d2fe')])]),
    layer('handle', [group([ellipse([30, 32], [34, 16]), stroke(cup, 8)])]),
    layer('cup', [group([rect(74, 62, 18, [-6, 18]), fill(cup)])]),
    layer('coffee', [group([ellipse([60, 12], [-6, -8]), fill('#92400e')])]),
    steam(-26, 0), steam(-6, 30), steam(14, 60),
  ]);
}

// Sparkle lines bursting outward from the centre
function sparkles(color, t0, count = 8, r0 = 62, r1 = 84) {
  const lines = [];
  for (let n = 0; n < count; n++) {
    const a = (n / count) * Math.PI * 2 + Math.PI / count;
    lines.push(pathShape([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]]));
  }
  return layer('sparkles', [group([
    ...lines,
    trim(kf([[t0 + 8, 0], [t0 + 24, 100]], 'out'), kf([[t0, 0], [t0 + 16, 100]], 'out')),
    stroke(color, 5),
  ])]);
}

// 8-hour goal: a ring fills up, then a star pops in the middle
function goalReached() {
  const indigo = '#6366f1';
  const star5 = [];
  for (let n = 0; n < 10; n++) {
    const a = -Math.PI / 2 + (n / 10) * Math.PI * 2;
    const r = n % 2 ? 11 : 26;
    star5.push([Math.cos(a) * r, Math.sin(a) * r + 2]);
  }
  return anim('goal-reached', 100, [
    layer('track', [group([ellipse(118), stroke('#e0e7ff', 12)])]),
    layer('arc', [group([
      ellipse(118), trim(null, kf([[0, 0], [40, 100]], 'inOut')), stroke(indigo, 12),
    ], { r: st(-90) })]),
    layer('disc', [group([ellipse(84), fill(indigo)])], { s: pop(36) }),
    layer('star', [group([pathShape(star5, true), fill('#fbbf24'), stroke('#fbbf24', 3)])], {
      s: kf([[44, [0, 0, 100]], [62, [100, 100, 100]]], 'back'),
      r: kf([[44, -60], [62, 0]], 'back'),
    }),
    sparkles('#fbbf24', 52),
  ]);
}

// QC approved: a gold seal spins in, check draws, sparkles
function qcApproved() {
  const gold = '#f59e0b';
  const seal = [];
  for (let n = 0; n < 24; n++) {
    const a = (n / 24) * Math.PI * 2;
    const r = n % 2 ? 50 : 56;
    seal.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return anim('qc-approved', 100, [
    layer('seal', [group([pathShape(seal, true), fill(gold)])], {
      s: kf([[0, [0, 0, 100]], [20, [108, 108, 100]], [28, [100, 100, 100]]], 'out'),
      r: kf([[0, -120], [28, 0]], 'out'),
    }),
    layer('inner', [group([ellipse(80), stroke('#fde68a', 4)])], { s: pop(10) }),
    layer('check', [group([
      pathShape([[-20, 2], [-6, 16], [22, -14]]),
      trim(null, kf([[22, 0], [40, 100]], 'out')),
      stroke('#ffffff', 10),
    ])]),
    sparkles(gold, 30, 10, 66, 88),
  ]);
}

// Daily Plan cleared: three checklist rows tick off one by one, then confetti
function planCleared() {
  const indigo = '#6366f1', green = '#10b981';
  const row = (y, t0) => [
    layer('row-line', [group([pathShape([[-6, y], [30, y]]), stroke('#c7d2fe', 7)])]),
    layer('row-dot', [group([ellipse(22, [-26, y]), fill(green)])], {
      p: st([W / 2 - 26, H / 2 + y, 0]),
      s: kf([[t0, [0, 0, 100]], [t0 + 12, [100, 100, 100]]], 'back'),
    }),
    layer('row-check', [group([
      pathShape([[-31, y], [-27, y + 4], [-20, y - 4]]),
      trim(null, kf([[t0 + 6, 0], [t0 + 16, 100]], 'out')),
      stroke('#ffffff', 3.5),
    ])]),
  ];
  // row-dot is drawn around its own centre, so shift its shape back to the origin
  const fixDots = (layers) => layers.map((l) => (l.nm === 'row-dot'
    ? { ...l, shapes: [group([ellipse(22), fill(green)])] } : l));
  return anim('plan-cleared', 110, [
    layer('board', [group([rect(96, 116, 16, [0, 6]), fill('#eef2ff'), stroke(indigo, 5)])], { s: pop(0) }),
    layer('clip', [group([rect(40, 14, 6, [0, -52]), fill(indigo)])], { s: pop(4) }),
    ...fixDots([...row(-20, 16), ...row(8, 30), ...row(36, 44)]),
    ...confetti(58, 12),
  ]);
}

// Leave approved: a calendar drops in, a green check badge pops on it
function leaveApproved() {
  const indigo = '#6366f1', green = '#10b981';
  const dots = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) dots.push(rect(14, 10, 3, [-24 + c * 24, 4 + r * 20]));
  return anim('leave-approved', 100, [
    layer('calendar', [
      group([...dots, fill('#c7d2fe')]),
      group([rect(98, 22, 0, [0, -27]), fill(indigo)]),
      group([rect(98, 86, 16, [0, 0]), fill('#ffffff'), stroke(indigo, 5)]),
    ], {
      p: kf([[0, [W / 2 - 4, H / 2 - 40, 0]], [22, [W / 2 - 4, H / 2 + 2, 0]]], 'back'),
      o: kf([[0, 0], [8, 100]], 'linear'),
    }),
    layer('rings', [group([
      pathShape([[-22, -48], [-22, -34]]), pathShape([[22, -48], [22, -34]]), stroke('#4338ca', 7),
    ])], {
      p: kf([[0, [W / 2 - 4, H / 2 - 40, 0]], [22, [W / 2 - 4, H / 2 + 2, 0]]], 'back'),
      o: kf([[0, 0], [8, 100]], 'linear'),
    }),
    layer('badge', [group([ellipse(46), fill(green), stroke('#ffffff', 5)])], {
      p: st([W / 2 + 38, H / 2 + 38, 0]), s: pop(26),
    }),
    layer('badge-check', [group([
      pathShape([[-10, 1], [-3, 8], [11, -7]]),
      trim(null, kf([[36, 0], [50, 100]], 'out')),
      stroke('#ffffff', 6),
    ])], { p: st([W / 2 + 38, H / 2 + 38, 0]) }),
  ]);
}

// ── write ────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const files = {
  'task-complete': taskComplete(),
  'task-start': playBurst('task-start', '#6366f1'),
  'resume': playBurst('resume', '#10b981'),
  'check-in': checkIn(),
  'check-out': checkOut(),
  'break': breakCup(),
  'goal-reached': goalReached(),
  'qc-approved': qcApproved(),
  'plan-cleared': planCleared(),
  'leave-approved': leaveApproved(),
};
for (const [name, data] of Object.entries(files)) {
  const file = path.join(OUT, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data));
  console.log(`${name}.json  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}
