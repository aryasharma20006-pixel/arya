/**
 * ANTIGRAVITY — CINEMATIC CANVAS ENGINE
 * Three-phase scroll-driven particle & field system
 *
 * Phase 1: Ink-void particles dispersing to reveal logo
 * Phase 2: Magnetic field lines, energy rings, scroll velocity
 * Phase 3: Ascending ember sparks, sunrise gradient, logo convergence
 */

/* ══════════════════════════════════════════════
   INIT & CANVAS SETUP
══════════════════════════════════════════════ */

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let W = window.innerWidth;
let H = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio, 2);
let scrollY = 0;
let scrollVelocity = 0;
let smoothedVel = 0;  // exponentially smoothed velocity for readout
let lastScrollY = 0;
let animFrame;
let time = 0;

// Total scroll length
function getTotalScroll() {
  return document.documentElement.scrollHeight - H;
}

// Scroll progress 0..1 across full page
function getScrollProgress() {
  return Math.min(scrollY / getTotalScroll(), 1);
}

// Per-phase progress
// Phase 1: 0-0.40, Phase 2: 0.35-0.70, Phase 3: 0.65-1.0
function phaseProgress(start, end) {
  const sp = getScrollProgress();
  return Math.max(0, Math.min(1, (sp - start) / (end - start)));
}

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  initParticles();
  initFieldLines();
  initInkSplatters();
  initOrbitalNodes();
  initEmbersP3();
}

window.addEventListener('resize', resize, { passive: true });
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  scrollVelocity = scrollY - lastScrollY;
  lastScrollY = scrollY;
}, { passive: true });

/* ══════════════════════════════════════════════
   MATH UTILS
══════════════════════════════════════════════ */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ══════════════════════════════════════════════
   PHASE 1 — INK/VOID PARTICLE SYSTEM
   Particles form a silhouette cloud, disperse on scroll
══════════════════════════════════════════════ */

let inkParticles = [];
const INK_COUNT = 700;

class InkParticle {
  constructor() { this.reset(); }

  reset() {
    // Spawn in a roughly humanoid silhouette shape
    const shape = rand(0, 1);

    if (shape < 0.5) {
      // Body/torso region
      const angle = rand(0, Math.PI * 2);
      const r = rand(0, rand(30, 120));
      this.ox = W / 2 + Math.cos(angle) * r * 0.55;
      this.oy = H * 0.45 + Math.sin(angle) * r;
    } else {
      // Explosive ink splatter outward
      const angle = rand(0, Math.PI * 2);
      const r = rand(80, 350);
      this.ox = W / 2 + Math.cos(angle) * r;
      this.oy = H * 0.45 + Math.sin(angle) * r * rand(0.4, 1.2);
    }

    this.x = this.ox;
    this.y = this.oy;

    // Dispersal target — fly away
    const dispAngle = Math.atan2(this.oy - H * 0.45, this.ox - W / 2) + rand(-0.5, 0.5);
    const dispDist = rand(200, 600);
    this.tx = this.ox + Math.cos(dispAngle) * dispDist;
    this.ty = this.oy + Math.sin(dispAngle) * dispDist;

    // Kanji-cluster particles
    this.size = rand(1, 4.5);
    this.alpha = rand(0.3, 0.9);
    this.speed = rand(0.003, 0.012);
    this.wobble = rand(0, Math.PI * 2);
    this.wobbleSpeed = rand(0.02, 0.06);
    this.wobbleAmp = rand(0, 8);

    // Color range: deep blue to electric blue
    const t = Math.random();
    this.r = Math.round(lerp(10, 80, t));
    this.g = Math.round(lerp(20, 140, t));
    this.b = Math.round(lerp(80, 255, t));
  }

  draw(disperse) {
    // disperse 0..1: 0 = clustered, 1 = fully dispersed
    const px = lerp(this.ox, this.tx, easeOutExpo(disperse));
    const py = lerp(this.oy, this.ty, easeOutExpo(disperse));

    // Add wobble
    const wx = Math.sin(this.wobble + time * this.wobbleSpeed) * this.wobbleAmp;
    const wy = Math.cos(this.wobble + time * this.wobbleSpeed * 0.7) * this.wobbleAmp * 0.5;

    const a = this.alpha * (1 - disperse * 0.7);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${this.r},${this.g},${this.b})`;
    ctx.shadowColor = `rgb(${this.r},${this.g},${this.b})`;
    ctx.shadowBlur = this.size * 3;
    ctx.beginPath();
    ctx.arc(px + wx, py + wy, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initParticles() {
  inkParticles = [];
  for (let i = 0; i < INK_COUNT; i++) {
    inkParticles.push(new InkParticle());
  }
}

/* ══════════════════════════════════════════════
   PHASE 1 — DEEP SPACE BACKGROUND STARS
══════════════════════════════════════════════ */

let stars = [];
const STAR_COUNT = 180;

class Star {
  constructor() {
    this.x = rand(0, W);
    this.y = rand(0, H);
    this.size = rand(0.3, 2);
    this.alpha = rand(0.1, 0.7);
    this.twinkleSpeed = rand(0.005, 0.025);
    this.twinkleOffset = rand(0, Math.PI * 2);
  }

  draw(globalAlpha) {
    const a = this.alpha * (0.4 + 0.6 * Math.sin(this.twinkleOffset + time * this.twinkleSpeed));
    ctx.save();
    ctx.globalAlpha = a * globalAlpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star());
}

/* ══════════════════════════════════════════════
   PHASE 2 — MAGNETIC DIPOLE FIELD ARCS
   True dipole physics: arcs bow perpendicular
   to the field axis, snap under scroll velocity
══════════════════════════════════════════════ */

let fieldLines = [];
const FIELD_LINE_COUNT = 32;

class FieldLine {
  constructor(index) {
    this.index = index;
    // Distribute in pairs: mirrored across the dipole axis
    const pair = Math.floor(index / 2);
    const side = index % 2 === 0 ? 1 : -1;
    this.pairCount = FIELD_LINE_COUNT / 2;
    // Angle spread: tighter near poles (0, π), wider at equator
    const t = pair / (this.pairCount - 1); // 0..1
    this.spread = lerp(0.08, 1.0, t);       // bow amount
    this.side = side;
    this.baseAngle = rand(-0.15, 0.15);     // small jitter
    this.len = lerp(100, Math.min(W, H) * 0.52, Math.pow(t, 0.7));
    this.width = lerp(1.8, 0.5, t);
    this.alpha = lerp(0.75, 0.25, t);
    this.hue = Math.round(180 + t * 100);   // cyan → blue → purple
    this.phase = rand(0, Math.PI * 2);
    this.speed = rand(0.006, 0.018) * (index % 3 === 0 ? -1 : 1);
    this.segments = 48;
  }

  draw(progress, scrollVel) {
    if (progress < 0.01) return;

    const cx = W / 2;
    const cy = H / 2;
    // Velocity dramatically warps the arcs — this is the key effect
    const velFactor = clamp(Math.abs(scrollVel) * 0.08, 0, 1.4);
    const velSign = scrollVel > 0 ? 1 : -1;

    // Slow breathing animation + velocity shock
    const breathe = Math.sin(time * this.speed + this.phase) * 0.12;
    const currentSpread = this.spread + breathe + velFactor * 0.6 * velSign * this.side;
    const currentLen = this.len * (1 + velFactor * 0.25);

    // Dipole arc: drawn as a bezier from (-len,0) to (+len,0)
    // with control points bowed perpendicular by `spread * len`
    const x0 = cx - currentLen;
    const y0 = cy;
    const x1 = cx + currentLen;
    const y1 = cy;
    const bowY = cy + this.side * currentSpread * currentLen * 0.85;
    const cp1x = cx - currentLen * 0.35;
    const cp1y = bowY;
    const cp2x = cx + currentLen * 0.35;
    const cp2y = bowY;

    // Rotate the whole arc by per-index angle offset
    const rotAngle = (this.index / FIELD_LINE_COUNT) * Math.PI + this.baseAngle
                   + Math.sin(time * 0.008 + this.phase) * 0.04
                   + velFactor * 0.08 * velSign;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotAngle);
    ctx.translate(-cx, -cy);

    ctx.globalAlpha = this.alpha * progress * (1 + velFactor * 0.4);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1);

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0,   `hsla(${this.hue}, 100%, 70%, 0)`);
    grad.addColorStop(0.3, `hsla(${this.hue}, 100%, 72%, 0.9)`);
    grad.addColorStop(0.5, `hsla(${this.hue + 30}, 100%, 80%, 1)`);
    grad.addColorStop(0.7, `hsla(${this.hue}, 100%, 72%, 0.9)`);
    grad.addColorStop(1,   `hsla(${this.hue}, 100%, 70%, 0)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = this.width * (1 + velFactor * 2.5);
    ctx.shadowColor = `hsl(${this.hue + 20}, 100%, 75%)`;
    ctx.shadowBlur = 10 + velFactor * 35;
    ctx.stroke();

    // Velocity charge sparks: tiny bright dots erupting along the arc at high speed
    if (velFactor > 0.3) {
      const sparkCount = Math.floor(velFactor * 5);
      for (let s = 0; s < sparkCount; s++) {
        const st = rand(0.15, 0.85);
        // De Casteljau point on bezier
        const bx = Math.pow(1-st,3)*x0 + 3*Math.pow(1-st,2)*st*cp1x + 3*(1-st)*st*st*cp2x + Math.pow(st,3)*x1;
        const by = Math.pow(1-st,3)*y0 + 3*Math.pow(1-st,2)*st*cp1y + 3*(1-st)*st*st*cp2y + Math.pow(st,3)*y1;
        ctx.save();
        ctx.globalAlpha = (velFactor - 0.3) * rand(0.4, 1);
        ctx.beginPath();
        ctx.arc(bx, by, rand(1, 3 + velFactor * 3), 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue + 40}, 100%, 90%)`;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

function initFieldLines() {
  fieldLines = [];
  for (let i = 0; i < FIELD_LINE_COUNT; i++) fieldLines.push(new FieldLine(i));
}

/* ══════════════════════════════════════════════
   PHASE 2 — INK SPLATTER
   Dark fluid blobs radiating from the center,
   echoing the Phase 1 silhouette's explosive edge
══════════════════════════════════════════════ */

let inkSplatters = [];
const INK_SPLAT_COUNT = 55;

class InkSplat {
  constructor() {
    const angle = rand(0, Math.PI * 2);
    const r     = rand(60, Math.min(W, H) * 0.48);
    this.x  = W / 2 + Math.cos(angle) * r;
    this.y  = H / 2 + Math.sin(angle) * r;
    this.r  = rand(4, 28);
    // Irregular blobs: pre-bake random radial offsets
    this.lobes = randInt(5, 11);
    this.offsets = Array.from({length: this.lobes}, () => rand(0.45, 1.0));
    this.rot = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-0.004, 0.004);
    this.alpha = rand(0.06, 0.22);
    // Each splat has its own entry angle (grows in on phase entry)
    this.entryDelay = rand(0, 0.45);
    this.darkness = rand(0, 25); // rgb offset from pure black
  }

  draw(progress, scrollVel) {
    const p = clamp((progress - this.entryDelay) / (1 - this.entryDelay), 0, 1);
    if (p < 0.01) return;

    const velFactor = clamp(Math.abs(scrollVel) * 0.04, 0, 0.8);
    this.rot += this.rotSpeed * (1 + velFactor * 2);

    const scale = easeOutExpo(p) * (1 + velFactor * 0.15);
    const r = this.r * scale;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * p * (1 + velFactor * 0.5);

    ctx.beginPath();
    for (let i = 0; i <= this.lobes; i++) {
      const a = (i / this.lobes) * Math.PI * 2;
      const lobe = this.offsets[i % this.lobes];
      const rx = Math.cos(a) * r * lobe;
      const ry = Math.sin(a) * r * lobe * rand(0.6, 1.0);
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();

    const d = this.darkness;
    ctx.fillStyle = `rgb(${d},${d},${d + 5})`;
    ctx.fill();
    ctx.restore();
  }
}

function initInkSplatters() {
  inkSplatters = [];
  for (let i = 0; i < INK_SPLAT_COUNT; i++) inkSplatters.push(new InkSplat());
}

/* ══════════════════════════════════════════════
   PHASE 2 — ENERGY RINGS (upgraded)
   Arc-segmented, tilt-animated, velocity-reactive
   with charge burst arcs at high speed
══════════════════════════════════════════════ */

const RING_CONFIG = [
  { r: 100, speed:  0.010, tilt: 0.28, alpha: 0.70, width: 1.8, color: '#00d4ff', gap: 0.08 },
  { r: 158, speed: -0.006, tilt: 0.75, alpha: 0.50, width: 1.2, color: '#7b2fff', gap: 0.12 },
  { r: 220, speed:  0.014, tilt:-0.42, alpha: 0.38, width: 0.9, color: '#0066ff', gap: 0.05 },
  { r: 290, speed: -0.008, tilt: 1.08, alpha: 0.28, width: 0.7, color: '#00d4ff', gap: 0.16 },
  { r: 360, speed:  0.005, tilt: 0.55, alpha: 0.16, width: 0.5, color: '#aa44ff', gap: 0.20 },
];

function drawEnergyRings(progress, scrollVel) {
  if (progress < 0.01) return;
  const cx = W / 2;
  const cy = H / 2;
  const velFactor   = clamp(Math.abs(scrollVel) * 0.07, 0, 1.6);
  const velSign     = scrollVel > 0 ? 1 : -1;

  RING_CONFIG.forEach((ring, i) => {
    const rot = time * ring.speed * (1 + velFactor * 4 * (i % 2 === 0 ? 1 : -1));
    const tiltAngle = ring.tilt + Math.sin(time * 0.012 + i * 0.8) * 0.18
                    + velFactor * 0.12 * velSign;
    const scaleY = Math.cos(tiltAngle);
    const currentR = ring.r * (1 + velFactor * 0.12);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(1, scaleY);

    // ── Main ring arc (with gap for dashed feel) ──
    const gapAngle  = ring.gap * Math.PI;
    const arcStart  = gapAngle / 2;
    const arcEnd    = Math.PI * 2 - gapAngle / 2;

    ctx.globalAlpha = ring.alpha * progress * Math.min(1 + velFactor * 0.6, 1.8);
    ctx.beginPath();
    ctx.arc(0, 0, currentR, arcStart, arcEnd);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.width * (1 + velFactor * 4);
    ctx.shadowColor = ring.color;
    ctx.shadowBlur  = 18 + velFactor * 50;
    ctx.stroke();

    // ── Velocity burst arcs: short bright arcs erupting at high speed ──
    if (velFactor > 0.4) {
      const burstCount = Math.floor(velFactor * 4);
      for (let b = 0; b < burstCount; b++) {
        const ba = rand(0, Math.PI * 2);
        const bLen = rand(0.08, 0.22) * Math.PI;
        ctx.globalAlpha = (velFactor - 0.4) * rand(0.3, 0.8) * progress;
        ctx.beginPath();
        ctx.arc(0, 0, currentR + rand(-4, 4), ba, ba + bLen);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = ring.width * (2 + velFactor * 5);
        ctx.shadowColor = ring.color;
        ctx.shadowBlur  = 30 + velFactor * 60;
        ctx.stroke();
      }
    }

    // ── Energy nodes orbiting the ring ──
    const nodeCount = 3 + i * 2;
    for (let n = 0; n < nodeCount; n++) {
      const nodeAngle = (n / nodeCount) * Math.PI * 2;
      const nx = Math.cos(nodeAngle) * currentR;
      const ny = Math.sin(nodeAngle) * currentR;
      const nSize = (1.5 + i * 0.4) * (1 + velFactor * 3);

      ctx.globalAlpha = ring.alpha * 1.5 * progress;
      ctx.beginPath();
      ctx.arc(nx, ny, nSize, 0, Math.PI * 2);
      ctx.fillStyle = ring.color;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur  = 20 + velFactor * 50;
      ctx.fill();

      // Trailing line from node toward center
      if (velFactor > 0.2) {
        ctx.globalAlpha = (velFactor - 0.2) * ring.alpha * progress * 0.6;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx * 0.5, ny * 0.5);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = nSize * 0.6;
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
    }

    ctx.restore();
  });
}

/* ══════════════════════════════════════════════
   PHASE 2 — ORBITAL TECH NODE PARTICLES
   Mirror the DOM modules — particles that orbit
   the center at increasing radii, assembling
   as phase progress grows
══════════════════════════════════════════════ */

const MODULE_LABELS = ['KINETIC', 'ENERGY', 'FLUX', 'CORE', 'FIELD', 'PULSE'];
let orbitalNodes = [];

class OrbitalNode {
  constructor(index, total) {
    this.index    = index;
    this.total    = total;
    this.label    = MODULE_LABELS[index % MODULE_LABELS.length];
    // Orbit params
    this.orbitR   = 130 + index * 52;
    this.orbitSpeed = 0.004 + index * 0.0015;
    this.orbitDir = index % 2 === 0 ? 1 : -1;
    this.startAngle = (index / total) * Math.PI * 2;
    this.angle    = this.startAngle;
    this.tilt     = rand(0.2, 0.7);
    // Entry: each node assembles from outside
    this.entryR   = this.orbitR * 2.5;
    this.entryAngle = this.startAngle + rand(-0.6, 0.6);
    // Visual
    this.size     = 4;
    this.hue      = 185 + index * 20;
    this.pulseOffset = rand(0, Math.PI * 2);
  }

  draw(progress, scrollVel) {
    const entryThresh = (this.index / this.total) * 0.5;
    const localP = clamp((progress - entryThresh) / 0.5, 0, 1);
    if (localP < 0.005) return;

    const velFactor = clamp(Math.abs(scrollVel) * 0.06, 0, 1);
    this.angle += this.orbitSpeed * this.orbitDir * (1 + velFactor * 2.5);

    const p = easeOutExpo(localP);
    const currentR = lerp(this.entryR, this.orbitR, p);
    const cx = W / 2;
    const cy = H / 2;

    const x = cx + Math.cos(this.angle) * currentR;
    const y = cy + Math.sin(this.angle) * currentR * Math.cos(this.tilt);

    const pulse = 0.8 + 0.2 * Math.sin(time * 0.05 + this.pulseOffset);
    const nodeSize = this.size * (1 + velFactor * 2) * pulse;

    // ── Orbit trail ──
    if (p > 0.5) {
      const trailSegments = 24;
      for (let s = 0; s < trailSegments; s++) {
        const ta = this.angle - this.orbitDir * (s / trailSegments) * Math.PI * 0.35;
        const tx = cx + Math.cos(ta) * currentR;
        const ty = cy + Math.sin(ta) * currentR * Math.cos(this.tilt);
        const ta2 = (1 - s / trailSegments);
        ctx.save();
        ctx.globalAlpha = ta2 * localP * 0.35;
        ctx.beginPath();
        ctx.arc(tx, ty, nodeSize * ta2 * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Node dot ──
    ctx.save();
    ctx.globalAlpha = localP * (0.8 + velFactor * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${this.hue}, 100%, 72%)`;
    ctx.shadowColor = `hsl(${this.hue}, 100%, 80%)`;
    ctx.shadowBlur = 20 + velFactor * 40;
    ctx.fill();
    ctx.restore();

    // ── Radial spoke toward center (at high progress) ──
    if (p > 0.7) {
      const spokeAlpha = (p - 0.7) / 0.3 * localP * 0.35;
      ctx.save();
      ctx.globalAlpha = spokeAlpha;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx, cy);
      const spokeGrad = ctx.createLinearGradient(x, y, cx, cy);
      spokeGrad.addColorStop(0, `hsla(${this.hue}, 100%, 70%, 0.8)`);
      spokeGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = spokeGrad;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function initOrbitalNodes() {
  orbitalNodes = [];
  for (let i = 0; i < MODULE_LABELS.length; i++) {
    orbitalNodes.push(new OrbitalNode(i, MODULE_LABELS.length));
  }
}

/* ══════════════════════════════════════════════
   PHASE 2 — CENTER CORE REACTOR
   Multi-layer reactor: plasma ring, inner glow,
   spinning cross-hairs, velocity shockwave
══════════════════════════════════════════════ */

function drawCorePulse(progress, scrollVel) {
  if (progress < 0.01) return;
  const cx = W / 2;
  const cy = H / 2;
  const velFactor = clamp(Math.abs(scrollVel) * 0.12, 0, 1.5);
  const pulse = 0.72 + 0.28 * Math.sin(time * 0.09);
  const pulse2 = 0.65 + 0.35 * Math.sin(time * 0.14 + 1.2);

  // ── Layer 1: Wide diffuse plasma field ──
  const plasmaR = 110 + velFactor * 80;
  const plasmaGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, plasmaR);
  plasmaGrad.addColorStop(0,   `rgba(0, 212, 255, ${0.22 * progress * pulse})`);
  plasmaGrad.addColorStop(0.35,`rgba(0, 80,  255, ${0.14 * progress})`);
  plasmaGrad.addColorStop(0.7, `rgba(80, 0,  180, ${0.07 * progress})`);
  plasmaGrad.addColorStop(1,   'transparent');
  ctx.fillStyle = plasmaGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, plasmaR, 0, Math.PI * 2);
  ctx.fill();

  // ── Layer 2: Plasma ring at middle radius ──
  const ringR = 55 + velFactor * 30;
  ctx.save();
  ctx.globalAlpha = 0.5 * progress * pulse2;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.5 + velFactor * 4;
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 25 + velFactor * 60;
  ctx.stroke();
  ctx.restore();

  // ── Layer 3: Spinning cross-hair lines ──
  const crossRot = time * 0.018;
  const crossLen = 45 + velFactor * 35;
  ctx.save();
  ctx.globalAlpha = 0.55 * progress * pulse;
  ctx.translate(cx, cy);
  ctx.rotate(crossRot);
  for (let arm = 0; arm < 4; arm++) {
    const ax = Math.cos((arm / 4) * Math.PI * 2) * crossLen;
    const ay = Math.sin((arm / 4) * Math.PI * 2) * crossLen;
    const armGrad = ctx.createLinearGradient(0, 0, ax, ay);
    armGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    armGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = armGrad;
    ctx.lineWidth = 1.2 + velFactor * 2;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10 + velFactor * 30;
    ctx.stroke();
  }
  ctx.restore();

  // ── Layer 4: Velocity shockwave ring ──
  if (velFactor > 0.3) {
    const shockR = ringR * (1 + (velFactor - 0.3) * 2.5);
    ctx.save();
    ctx.globalAlpha = (velFactor - 0.3) * progress * 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 + velFactor * 3;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 40 + velFactor * 80;
    ctx.stroke();
    ctx.restore();
  }

  // ── Core: White hot dot ──
  ctx.save();
  ctx.globalAlpha = progress * (0.85 + 0.15 * pulse);
  ctx.beginPath();
  ctx.arc(cx, cy, 5 + velFactor * 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 30 + velFactor * 80;
  ctx.fill();
  ctx.restore();
}

/* ══════════════════════════════════════════════
   PHASE 3 — EMBER/SPARK PARTICLES
══════════════════════════════════════════════ */

let embersP3 = [];
const EMBER_COUNT = 200;

class EmberP3 {
  constructor() { this.reset(true); }

  reset(initial = false) {
    this.x = rand(0, W);
    this.y = initial ? rand(0, H) : H + 20;
    this.vx = rand(-0.8, 0.8);
    this.vy = rand(-1.5, -0.3);
    this.size = rand(0.8, 3.5);
    this.alpha = rand(0.4, 1);
    this.life = 1;
    this.decay = rand(0.003, 0.01);
    // Warm color: gold to orange to rose
    const t = Math.random();
    this.hue = Math.round(lerp(35, 10, t)); // gold->orange
    this.sat = rand(80, 100);
    this.lit = rand(55, 80);
    this.tail = [];
    this.tailMax = randInt(3, 8);
  }

  update(progress) {
    if (progress < 0.01) return;
    // Store tail
    this.tail.push({ x: this.x, y: this.y });
    if (this.tail.length > this.tailMax) this.tail.shift();

    this.x += this.vx + Math.sin(time * 0.02 + this.x * 0.01) * 0.3;
    this.y += this.vy;
    this.life -= this.decay;

    if (this.life <= 0 || this.y < -20) this.reset();
  }

  draw(progress) {
    if (progress < 0.01 || this.life <= 0) return;
    const a = this.life * this.alpha * progress;

    // Draw tail
    for (let i = 0; i < this.tail.length; i++) {
      const ta = (i / this.tail.length) * a * 0.5;
      ctx.save();
      ctx.globalAlpha = ta;
      ctx.beginPath();
      ctx.arc(this.tail[i].x, this.tail[i].y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${this.hue}, ${this.sat}%, ${this.lit}%)`;
      ctx.fill();
      ctx.restore();
    }

    // Draw ember
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${this.hue}, ${this.sat}%, ${this.lit}%)`;
    ctx.shadowColor = `hsl(${this.hue}, 100%, 70%)`;
    ctx.shadowBlur = this.size * 4;
    ctx.fill();
    ctx.restore();
  }
}

function initEmbersP3() {
  embersP3 = [];
  for (let i = 0; i < EMBER_COUNT; i++) embersP3.push(new EmberP3());
}

/* ══════════════════════════════════════════════
   PHASE 3 — SUNRISE GRADIENT BACKGROUND
══════════════════════════════════════════════ */

function drawSunrise(progress) {
  if (progress < 0.01) return;

  // Gradient from bottom (warm) to top (deep sky)
  const grad = ctx.createLinearGradient(0, H, 0, 0);
  const a = easeInOutCubic(progress);

  grad.addColorStop(0, `rgba(255, 107, 53, ${0.6 * a})`);   // ember orange
  grad.addColorStop(0.2, `rgba(255, 180, 50, ${0.3 * a})`); // warm gold
  grad.addColorStop(0.5, `rgba(20, 40, 100, ${0.7 * a})`);  // twilight blue
  grad.addColorStop(1, `rgba(2, 8, 30, ${a})`);              // void deep

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ══════════════════════════════════════════════
   PHASE 3 — CLOUD/HORIZON LAYER
══════════════════════════════════════════════ */

function drawHorizon(progress) {
  if (progress < 0.01) return;
  const a = easeInOutCubic(progress);

  // Horizon glow
  const hGrad = ctx.createRadialGradient(W / 2, H * 0.65, 0, W / 2, H * 0.65, W * 0.6);
  hGrad.addColorStop(0, `rgba(255, 220, 80, ${0.25 * a})`);
  hGrad.addColorStop(0.4, `rgba(255, 120, 30, ${0.1 * a})`);
  hGrad.addColorStop(1, 'transparent');

  ctx.save();
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ══════════════════════════════════════════════
   PHASE 3 — LOGO CONVERGENCE PARTICLES
   Particles flow inward to form text shape
══════════════════════════════════════════════ */

let convergenceParticles = [];
const CONV_COUNT = 120;

class ConvergenceParticle {
  constructor() {
    // Random start position
    this.sx = rand(0, W);
    this.sy = rand(0, H);

    // Target: orbit around final logo position (bottom-right area)
    const tCx = W * 0.82;
    const tCy = H * 0.88;
    const ang = rand(0, Math.PI * 2);
    const r = rand(5, 60);
    this.tx = tCx + Math.cos(ang) * r;
    this.ty = tCy + Math.sin(ang) * r * 0.4;

    this.x = this.sx;
    this.y = this.sy;

    this.size = rand(0.5, 2.5);
    this.alpha = rand(0.4, 1);
    this.orbitAngle = ang;
    this.orbitSpeed = rand(0.005, 0.02) * (Math.random() < 0.5 ? 1 : -1);

    const t = Math.random();
    this.hue = Math.round(lerp(40, 55, t)); // gold tones
  }

  draw(progress) {
    if (progress < 0.01) return;

    const p = easeOutExpo(progress);
    // Orbit at target
    const cx = lerp(this.sx, this.tx, p);
    const cy = lerp(this.sy, this.ty, p);

    this.orbitAngle += this.orbitSpeed * progress;
    const orbitR = (1 - p) * 50;
    const fx = cx + Math.cos(this.orbitAngle) * orbitR;
    const fy = cy + Math.sin(this.orbitAngle) * orbitR * 0.4;

    const a = this.alpha * progress;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(fx, fy, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
    ctx.shadowColor = `hsl(${this.hue}, 100%, 80%)`;
    ctx.shadowBlur = this.size * 6;
    ctx.fill();
    ctx.restore();
  }
}

function initConvergenceParticles() {
  convergenceParticles = [];
  for (let i = 0; i < CONV_COUNT; i++) convergenceParticles.push(new ConvergenceParticle());
}

/* ══════════════════════════════════════════════
   BACKGROUND BASE GRADIENT
══════════════════════════════════════════════ */

function drawBackground(p1, p2, p3) {
  // Images are CSS backgrounds — canvas only needs clearing
  ctx.clearRect(0, 0, W, H);
}

/* ══════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════ */

let cursorEl, cursorRingEl;
let mouseX = -100, mouseY = -100;
let ringX = -100, ringY = -100;

function initCursor() {
  cursorEl = document.createElement('div');
  cursorEl.id = 'custom-cursor';
  cursorRingEl = document.createElement('div');
  cursorRingEl.id = 'custom-cursor-ring';
  document.body.appendChild(cursorEl);
  document.body.appendChild(cursorRingEl);

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });
}

function updateCursor() {
  if (!cursorEl) return;
  cursorEl.style.left = mouseX + 'px';
  cursorEl.style.top = mouseY + 'px';

  ringX = lerp(ringX, mouseX, 0.12);
  ringY = lerp(ringY, mouseY, 0.12);
  cursorRingEl.style.left = ringX + 'px';
  cursorRingEl.style.top = ringY + 'px';
}

/* ══════════════════════════════════════════════
   HUD — Phase Progress Indicator
══════════════════════════════════════════════ */

const hudEl = document.getElementById('hud');
const hudLabel = document.getElementById('hud-phase-label');
const hudFill = document.getElementById('hud-progress-fill');

function updateHUD(sp) {
  hudFill.style.height = (sp * 100) + '%';

  if (sp < 0.01) {
    hudEl.classList.remove('visible');
    return;
  }
  hudEl.classList.add('visible');

  if (sp < 0.4) {
    hudLabel.textContent = 'Phase I — Discovery';
  } else if (sp < 0.7) {
    hudLabel.textContent = 'Phase II — Experience';
  } else {
    hudLabel.textContent = 'Phase III — Ascent';
  }
}

/* ══════════════════════════════════════════════
   DOM — Phase-driven element reveal
══════════════════════════════════════════════ */

function updateDOM(p1, p2, p3) {
  const sp = getScrollProgress();

  // Phase 1 logo reveal
  const logoText = document.getElementById('logo-text');
  const kanjiBg = document.getElementById('kanji-bg');
  const scrollHint = document.getElementById('scroll-hint');

  if (p1 > 0.2) {
    logoText.classList.add('revealed');
    kanjiBg.classList.add('active');
  } else {
    logoText.classList.remove('revealed');
  }

  // Fade scroll hint
  if (scrollHint) {
    scrollHint.style.opacity = Math.max(0, 1 - p1 * 4);
  }

  // Phase 2 elements
  const p2Panel = document.getElementById('p2-panel');
  const velReadout = document.getElementById('vel-readout');

  if (p2 > 0.15) {
    p2Panel?.classList.add('visible');
    velReadout?.classList.add('visible');
  } else {
    p2Panel?.classList.remove('visible');
    velReadout?.classList.remove('visible');
  }

  // Live velocity readout values
  if (p2 > 0.01 && velReadout) {
    const rawVel = Math.abs(scrollVelocity);
    smoothedVel = lerp(smoothedVel, rawVel, 0.08);
    const orbitV = 0.004 * (1 + clamp(rawVel * 0.06, 0, 1) * 2.5);

    const fluxEl   = document.getElementById('vel-flux');
    const fieldEl  = document.getElementById('vel-field');
    const orbitEl  = document.getElementById('vel-orbit');

    if (fluxEl)  fluxEl.textContent  = rawVel.toFixed(3);
    if (fieldEl) fieldEl.textContent = smoothedVel.toFixed(3);
    if (orbitEl) orbitEl.textContent = orbitV.toFixed(4);

    // Accent color spikes under fast scroll
    const hotColor = rawVel > 8 ? 'rgba(255, 100, 100, 0.95)' : 'rgba(0, 212, 255, 0.9)';
    if (fluxEl)  fluxEl.style.color = hotColor;
  }

  // Phase 3 elements
  const ascentText = document.getElementById('ascent-text');
  const finalLogo = document.getElementById('final-logo');

  if (p3 > 0.15) {
    ascentText?.classList.add('visible');
    finalLogo?.classList.add('visible');
  } else {
    ascentText?.classList.remove('visible');
    finalLogo?.classList.remove('visible');
  }
}

/* ══════════════════════════════════════════════
   MAIN RENDER LOOP
══════════════════════════════════════════════ */

function render() {
  time++;
  const sp = getScrollProgress();

  const p1 = phaseProgress(0, 0.42);      // Phase 1: 0–42%
  const p2 = phaseProgress(0.35, 0.72);   // Phase 2: 35–72%
  const p3 = phaseProgress(0.65, 1.0);    // Phase 3: 65–100%

  // ── Background ──────────────────────────
  drawBackground(p1, p2, p3);

  // ── Phase 1 ─────────────────────────────
  // Stars — subtle, since image provides the void
  const starAlpha = Math.max(0, (1 - p2 * 2) * 0.55);
  stars.forEach(s => s.draw(starAlpha));

  // Ink particles disperse as p1 increases (lighter since image has ink)
  const disperse = easeOutExpo(p1 * 1.2);
  inkParticles.forEach(p => p.draw(disperse));

  // ── Phase 2 ─────────────────────────────
  // Fade out all Phase 2 canvas effects as Phase 3 enters
  // p3 starts at 0.65 scroll progress — by 0.72 Phase 2 is fully gone
  const p2Fade = clamp(1 - p3 * 3.5, 0, 1);   // reaches 0 at ~p3=0.28
  if (p2 > 0.01 && p2Fade > 0.001) {
    const p2e = easeInOutCubic(p2) * p2Fade;
    // Dipole arc field
    fieldLines.forEach(fl => fl.draw(p2e, scrollVelocity));
    // Energy rings
    drawEnergyRings(p2e, scrollVelocity);
    // Orbital tech nodes
    orbitalNodes.forEach(n => n.draw(p2 * p2Fade, scrollVelocity));
    // Core reactor
    drawCorePulse(p2e, scrollVelocity);
  }

  // ── Phase 3 ─────────────────────────────
  // Image provides the warm ascent — just add embers + convergence sparks
  if (p3 > 0.01) {
    embersP3.forEach(e => {
      e.update(p3);
      e.draw(p3);
    });
    convergenceParticles.forEach(cp => cp.draw(p3));
  }

  // ── HUD ─────────────────────────────────
  updateHUD(sp);

  // ── DOM sync ────────────────────────────
  updateDOM(p1, p2, p3);

  // ── Cursor ──────────────────────────────
  updateCursor();

  // Decay scroll velocity
  scrollVelocity *= 0.88;

  animFrame = requestAnimationFrame(render);
}

/* ══════════════════════════════════════════════
   LOADING OVERLAY
══════════════════════════════════════════════ */

function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-logo">DESTINY X</div>
    <div class="loading-bar"></div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

async function fontsReady() {
  try {
    await document.fonts.ready;
  } catch (e) {
    // fallback: just wait a bit
    await new Promise(r => setTimeout(r, 800));
  }
}

/* ══════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════ */

async function init() {
  const overlay = showLoadingOverlay();

  // Wait for fonts
  await fontsReady();
  // Small pause for dramatic effect
  await new Promise(r => setTimeout(r, 600));

  // Setup canvas
  resize();
  initStars();
  initConvergenceParticles();
  initCursor();
  // Phase 2 systems (resize already calls initFieldLines/initInkSplatters/initOrbitalNodes)

  // Hide loading
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 900);

  // HUD visible after a moment
  setTimeout(() => hudEl.classList.add('visible'), 2000);

  // Start loop
  render();
}

init();

/* ══════════════════════════════════════════════
   PHASE 01 — FOUNDATION SLIDES CONTROLLER
   Scroll-driven reveal for slides 02, 03, 04
══════════════════════════════════════════════ */

(function foundationSlides() {

  // ── Helpers ──────────────────────────────────

  // Get a section's scroll progress 0..1 as it passes through the viewport
  function getSectionProgress(el) {
    const rect  = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    if (total <= 0) return rect.top <= 0 ? 1 : 0;
    const scrolled = -rect.top;
    return Math.max(0, Math.min(1, scrolled / total));
  }

  // Stagger-in cards with per-index delay
  function staggerCards(gridEl, staggerMs = 80) {
    const cards = gridEl.querySelectorAll('.deliverable-card');
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add('card-in'), i * staggerMs);
    });
  }

  // Stagger-in task columns
  function staggerCols(container, staggerMs = 100) {
    const cols = container.querySelectorAll('.task-col');
    cols.forEach((col, i) => {
      setTimeout(() => col.classList.add('col-in'), i * staggerMs);
    });
  }

  // ── Slide 02 ─────────────────────────────────
  const s02   = document.getElementById('slide-02');
  const s02c  = document.getElementById('s02-content');
  const s02f  = document.getElementById('s02-fill');
  const grid  = document.getElementById('deliverables-grid');

  let s02CardsIn = false;

  function updateSlide02() {
    if (!s02) return;
    const p = getSectionProgress(s02);

    // Progress bar
    if (s02f) s02f.style.width = (p * 100) + '%';

    // Content visible once we're past the entry
    if (p > 0.05) {
      s02c?.classList.add('visible');
      if (!s02CardsIn && grid) {
        s02CardsIn = true;
        staggerCards(grid, 90);
      }
    } else {
      s02c?.classList.remove('visible');
    }
  }

  // ── Slide 03 ─────────────────────────────────
  const s03   = document.getElementById('slide-03');
  const s03c  = document.getElementById('s03-content');
  const s03f  = document.getElementById('s03-fill');

  let s03ColsIn = false;

  function updateSlide03() {
    if (!s03) return;
    const p = getSectionProgress(s03);

    if (s03f) s03f.style.width = (p * 100) + '%';

    if (p > 0.06) {
      s03c?.classList.add('visible');
      if (!s03ColsIn) {
        s03ColsIn = true;
        staggerCols(s03c, 110);
      }
    } else {
      s03c?.classList.remove('visible');
    }
  }

  // ── Slide 04 ─────────────────────────────────
  const s04   = document.getElementById('slide-04');
  const s04c  = document.getElementById('s04-content');
  const s04f  = document.getElementById('s04-fill');

  let s04ColsIn = false;

  function updateSlide04() {
    if (!s04) return;
    const p = getSectionProgress(s04);

    if (s04f) s04f.style.width = (p * 100) + '%';

    if (p > 0.06) {
      s04c?.classList.add('visible');
      if (!s04ColsIn) {
        s04ColsIn = true;
        staggerCols(s04c, 110);
      }
    } else {
      s04c?.classList.remove('visible');
    }
  }

  // ── Purple particle overlay (canvas-less — pure CSS glow nodes) ──
  // Injects subtle floating orbs via IntersectionObserver on each slide
  function spawnPurpleOrbs(section) {
    if (section.dataset.orbsSpawned) return;
    section.dataset.orbsSpawned = '1';

    const COUNT = 18;
    const orbs  = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
      const orb = document.createElement('div');
      const size = 2 + Math.random() * 5;   // px
      const x    = Math.random() * 100;      // vw %
      const y    = Math.random() * 100;      // vh %
      const dur  = 8 + Math.random() * 14;  // s
      const delay= -(Math.random() * dur);   // start mid-cycle
      const hue  = 260 + Math.random() * 60; // purple range

      Object.assign(orb.style, {
        position:     'absolute',
        left:         x + '%',
        top:          y + '%',
        width:        size + 'px',
        height:       size + 'px',
        borderRadius: '50%',
        background:   `hsl(${hue}, 100%, 70%)`,
        boxShadow:    `0 0 ${size * 3}px ${size}px hsla(${hue}, 100%, 70%, 0.5)`,
        pointerEvents:'none',
        zIndex:       2,
        opacity:      (0.1 + Math.random() * 0.35).toFixed(2),
        animation:    `orb-float-${i % 3} ${dur}s ${delay}s ease-in-out infinite`,
      });
      orbs.appendChild(orb);
    }

    // Inject keyframes once
    if (!document.getElementById('orb-keyframes')) {
      const style = document.createElement('style');
      style.id    = 'orb-keyframes';
      style.textContent = `
        @keyframes orb-float-0 {
          0%,100% { transform: translateY(0) translateX(0) scale(1); }
          33%      { transform: translateY(-18px) translateX(8px) scale(1.15); }
          66%      { transform: translateY(10px) translateX(-6px) scale(0.9); }
        }
        @keyframes orb-float-1 {
          0%,100% { transform: translateY(0) translateX(0) scale(1); }
          40%      { transform: translateY(14px) translateX(-10px) scale(1.2); }
          70%      { transform: translateY(-8px) translateX(12px) scale(0.85); }
        }
        @keyframes orb-float-2 {
          0%,100% { transform: translateY(0) translateX(0) scale(1); }
          50%      { transform: translateY(-22px) translateX(5px) scale(1.1); }
          80%      { transform: translateY(12px) translateX(-8px) scale(0.95); }
        }
      `;
      document.head.appendChild(style);
    }

    // Append to foundation-frame (position:relative/sticky container)
    const frame = section.querySelector('.foundation-frame');
    if (frame) frame.appendChild(orbs);
  }

  // Spawn orbs when slides scroll into view
  const orbObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) spawnPurpleOrbs(e.target);
    });
  }, { threshold: 0.1 });

  [s02, s03, s04].forEach(el => { if (el) orbObserver.observe(el); });

  // ── Main tick — piggyback on the existing scroll listener ────────
  const origScroll = window.onscroll;

  function foundationTick() {
    updateSlide02();
    updateSlide03();
    updateSlide04();
  }

  window.addEventListener('scroll', foundationTick, { passive: true });

  // Also run once on load in case user refreshes mid-page
  window.addEventListener('load', foundationTick);
  foundationTick();

})();


/* ══════════════════════════════════════════════
   PHASE 02 — CORE FEATURES SLIDES CONTROLLER
   Scroll-driven reveal for slides 05, 06, 07, 08
══════════════════════════════════════════════ */

(function coreSlides() {

  // ── Helpers (local copies, no global deps needed) ─────────
  function secProgress(el) {
    const rect  = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    if (total <= 0) return rect.top <= 0 ? 1 : 0;
    return Math.max(0, Math.min(1, -rect.top / total));
  }

  function staggerIn(els, cls, ms) {
    els.forEach((el, i) => setTimeout(() => el.classList.add(cls), i * ms));
  }

  // ── Slide 05 — Phase header + 6 feature cards ───────────
  const s05  = document.getElementById('slide-05');
  const s05c = document.getElementById('s05-content');
  const s05f = document.getElementById('s05-fill');
  const fgrid = document.getElementById('features-grid');
  let s05CardsIn = false;

  function updateSlide05() {
    if (!s05) return;
    const p = secProgress(s05);
    if (s05f) s05f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s05c?.classList.add('visible');
      if (!s05CardsIn && fgrid) {
        s05CardsIn = true;
        staggerIn(fgrid.querySelectorAll('.feature-card'), 'card-in', 90);
      }
    } else { s05c?.classList.remove('visible'); }
  }

  // ── Slide 06 — Palm Reading pipeline + specs ────────────
  const s06  = document.getElementById('slide-06');
  const s06c = document.getElementById('s06-content');
  const s06f = document.getElementById('s06-fill');
  let s06In = false;

  function updateSlide06() {
    if (!s06) return;
    const p = secProgress(s06);
    if (s06f) s06f.style.width = (p * 100) + '%';
    if (p > 0.06) {
      s06c?.classList.add('visible');
      if (!s06In) {
        s06In = true;
        // Pipeline steps stagger left-in
        const steps = s06?.querySelectorAll('.pipeline-step') || [];
        staggerIn(steps, 'step-in', 110);
        // Spec blocks stagger right-in
        const specs = s06?.querySelectorAll('.spec-block') || [];
        staggerIn(specs, 'spec-in', 130);
      }
    } else { s06c?.classList.remove('visible'); }
  }

  // ── Slide 07 — Astrology pipeline + specs ───────────────
  const s07  = document.getElementById('slide-07');
  const s07c = document.getElementById('s07-content');
  const s07f = document.getElementById('s07-fill');
  let s07In = false;

  function updateSlide07() {
    if (!s07) return;
    const p = secProgress(s07);
    if (s07f) s07f.style.width = (p * 100) + '%';
    if (p > 0.06) {
      s07c?.classList.add('visible');
      if (!s07In) {
        s07In = true;
        const steps = s07?.querySelectorAll('.pipeline-step') || [];
        staggerIn(steps, 'step-in', 100);
        const specs = s07?.querySelectorAll('.spec-block') || [];
        staggerIn(specs, 'spec-in', 120);
      }
    } else { s07c?.classList.remove('visible'); }
  }

  // ── Slide 08 — Trio columns (Num + Compat + Reports) ────
  const s08  = document.getElementById('slide-08');
  const s08c = document.getElementById('s08-content');
  const s08f = document.getElementById('s08-fill');
  let s08In = false;

  function updateSlide08() {
    if (!s08) return;
    const p = secProgress(s08);
    if (s08f) s08f.style.width = (p * 100) + '%';
    if (p > 0.06) {
      s08c?.classList.add('visible');
      if (!s08In) {
        s08In = true;
        const cols = s08?.querySelectorAll('.trio-col') || [];
        staggerIn(cols, 'trio-in', 130);
      }
    } else { s08c?.classList.remove('visible'); }
  }

  // ── Indigo ambient orbs (distinct from purple ones) ─────
  function spawnIndigoOrbs(section) {
    if (section.dataset.indigoOrbs) return;
    section.dataset.indigoOrbs = '1';

    const COUNT = 20;
    const frag  = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
      const orb  = document.createElement('div');
      const size = 1.5 + Math.random() * 4;
      const x    = Math.random() * 100;
      const y    = Math.random() * 100;
      const dur  = 10 + Math.random() * 16;
      const dly  = -(Math.random() * dur);
      // Indigo → sapphire → violet band
      const hue  = 225 + Math.random() * 55;
      const sat  = 80 + Math.random() * 20;

      Object.assign(orb.style, {
        position:      'absolute',
        left:          x + '%',
        top:           y + '%',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    `hsl(${hue},${sat}%,68%)`,
        boxShadow:     `0 0 ${size*3}px ${size}px hsla(${hue},${sat}%,68%,0.45)`,
        pointerEvents: 'none',
        zIndex:        2,
        opacity:       (0.08 + Math.random() * 0.28).toFixed(2),
        animation:     `orb-float-${i % 3} ${dur}s ${dly}s ease-in-out infinite`,
      });
      frag.appendChild(orb);
    }

    const frame = section.querySelector('.core-frame');
    if (frame) frame.appendChild(frag);
  }

  const orbObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) spawnIndigoOrbs(e.target); });
  }, { threshold: 0.1 });

  [s05, s06, s07, s08].forEach(el => { if (el) orbObs.observe(el); });

  // ── Main tick ────────────────────────────────────────────
  function coreTick() {
    updateSlide05();
    updateSlide06();
    updateSlide07();
    updateSlide08();
  }

  window.addEventListener('scroll', coreTick, { passive: true });
  window.addEventListener('load',   coreTick);
  coreTick();

})();


/* ══════════════════════════════════════════════
   PHASE 03 — AI & INTELLIGENCE SLIDES CONTROLLER
   Scroll-driven reveal for slides 09, 10, 11
══════════════════════════════════════════════ */

(function aiSlides() {

  // ── Shared helpers ───────────────────────────────────────
  function secProgress(el) {
    const rect  = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    if (total <= 0) return rect.top <= 0 ? 1 : 0;
    return Math.max(0, Math.min(1, -rect.top / total));
  }

  function staggerIn(els, cls, ms) {
    els.forEach((el, i) => setTimeout(() => el.classList.add(cls), i * ms));
  }

  // ── Slide 09 — Phase header + 6 AI module cards ─────────
  const s09   = document.getElementById('slide-09');
  const s09c  = document.getElementById('s09-content');
  const s09f  = document.getElementById('s09-fill');
  const aiGrid = document.getElementById('ai-cards-grid');
  let s09CardsIn = false;

  function updateSlide09() {
    if (!s09) return;
    const p = secProgress(s09);
    if (s09f) s09f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s09c?.classList.add('visible');
      if (!s09CardsIn && aiGrid) {
        s09CardsIn = true;
        staggerIn(aiGrid.querySelectorAll('.ai-card'), 'card-in', 90);
      }
    } else { s09c?.classList.remove('visible'); }
  }

  // ── Slide 10 — Dual pipeline (AI Chat + Voice) ───────────
  const s10   = document.getElementById('slide-10');
  const s10c  = document.getElementById('s10-content');
  const s10f  = document.getElementById('s10-fill');
  let s10In = false;

  function updateSlide10() {
    if (!s10) return;
    const p = secProgress(s10);
    if (s10f) s10f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s10c?.classList.add('visible');
      if (!s10In) {
        s10In = true;
        // Stagger all .ai-step rows across both pipeline columns
        const steps = s10.querySelectorAll('.ai-step');
        staggerIn(steps, 'step-in', 85);
      }
    } else { s10c?.classList.remove('visible'); }
  }

  // ── Slide 11 — Push + Performance split panels ───────────
  const s11   = document.getElementById('slide-11');
  const s11c  = document.getElementById('s11-content');
  const s11f  = document.getElementById('s11-fill');
  let s11In = false;

  function updateSlide11() {
    if (!s11) return;
    const p = secProgress(s11);
    if (s11f) s11f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s11c?.classList.add('visible');
      if (!s11In) {
        s11In = true;
        // Panels stagger in
        const panels = s11.querySelectorAll('.split-panel');
        staggerIn(panels, 'panel-in', 160);
        // Rows inside panels stagger after panels land
        setTimeout(() => {
          const rows = s11.querySelectorAll('.split-row');
          staggerIn(rows, 'row-in', 65);
        }, 220);
      }
    } else { s11c?.classList.remove('visible'); }
  }

  // ── Teal ambient orbs ────────────────────────────────────
  function spawnTealOrbs(section) {
    if (section.dataset.tealOrbs) return;
    section.dataset.tealOrbs = '1';

    const COUNT = 22;
    const frag  = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
      const orb  = document.createElement('div');
      const size = 1.5 + Math.random() * 3.5;
      const x    = Math.random() * 100;
      const y    = Math.random() * 100;
      const dur  = 9 + Math.random() * 15;
      const dly  = -(Math.random() * dur);
      // teal → cyan → emerald band  (165–175 hue)
      const hue  = 162 + Math.random() * 28;
      const sat  = 78 + Math.random() * 20;

      Object.assign(orb.style, {
        position:      'absolute',
        left:          x + '%',
        top:           y + '%',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    `hsl(${hue},${sat}%,64%)`,
        boxShadow:     `0 0 ${size * 3}px ${size}px hsla(${hue},${sat}%,64%,0.4)`,
        pointerEvents: 'none',
        zIndex:        2,
        opacity:       (0.07 + Math.random() * 0.26).toFixed(2),
        animation:     `orb-float-${i % 3} ${dur}s ${dly}s ease-in-out infinite`,
      });
      frag.appendChild(orb);
    }

    const frame = section.querySelector('.ai-frame');
    if (frame) frame.appendChild(frag);
  }

  const orbObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) spawnTealOrbs(e.target); });
  }, { threshold: 0.1 });

  [s09, s10, s11].forEach(el => { if (el) orbObs.observe(el); });

  // ── Main tick ────────────────────────────────────────────
  function aiTick() {
    updateSlide09();
    updateSlide10();
    updateSlide11();
  }

  window.addEventListener('scroll', aiTick, { passive: true });
  window.addEventListener('load',   aiTick);
  aiTick();

})();


/* ══════════════════════════════════════════════
   PHASE 04 — MONETISATION SLIDES CONTROLLER
   Scroll-driven reveal for slides 12, 13, 14
══════════════════════════════════════════════ */

(function monetisationSlides() {

  // ── Shared helpers ───────────────────────────────────────
  function secProgress(el) {
    const rect  = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    if (total <= 0) return rect.top <= 0 ? 1 : 0;
    return Math.max(0, Math.min(1, -rect.top / total));
  }

  function staggerIn(els, cls, ms) {
    els.forEach((el, i) => setTimeout(() => el.classList.add(cls), i * ms));
  }

  // ── Slide 12 — Phase header + 4 revenue pillar cards ────
  const s12  = document.getElementById('slide-12');
  const s12c = document.getElementById('s12-content');
  const s12f = document.getElementById('s12-fill');
  const pillarsGrid = document.getElementById('mo-pillars-grid');
  let s12In = false;

  function updateSlide12() {
    if (!s12) return;
    const p = secProgress(s12);
    if (s12f) s12f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s12c?.classList.add('visible');
      if (!s12In && pillarsGrid) {
        s12In = true;
        staggerIn(pillarsGrid.querySelectorAll('.mo-pillar'), 'card-in', 110);
      }
    } else { s12c?.classList.remove('visible'); }
  }

  // ── Slide 13 — Payment pipeline + spec blocks ────────────
  const s13  = document.getElementById('slide-13');
  const s13c = document.getElementById('s13-content');
  const s13f = document.getElementById('s13-fill');
  let s13In = false;

  function updateSlide13() {
    if (!s13) return;
    const p = secProgress(s13);
    if (s13f) s13f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s13c?.classList.add('visible');
      if (!s13In) {
        s13In = true;
        staggerIn(s13.querySelectorAll('.mo-step'), 'step-in', 90);
        setTimeout(() => {
          staggerIn(s13.querySelectorAll('.mo-spec-block'), 'spec-in', 120);
        }, 180);
      }
    } else { s13c?.classList.remove('visible'); }
  }

  // ── Slide 14 — Analytics, GST, Churn, Referral quartet ──
  const s14  = document.getElementById('slide-14');
  const s14c = document.getElementById('s14-content');
  const s14f = document.getElementById('s14-fill');

  // ── Progress bars update on scroll ───────────────────────
  function moTick() {
    if (s12 && s12f) s12f.style.width = (secProgress(s12) * 100) + '%';
    if (s13 && s13f) s13f.style.width = (secProgress(s13) * 100) + '%';
    if (s14 && s14f) s14f.style.width = (secProgress(s14) * 100) + '%';
  }

  window.addEventListener('scroll', moTick, { passive: true });

  // ── IntersectionObserver: show content on entry ───────────
  // threshold 0.01 = fires as soon as 1% of section is visible
  const contentObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id;

      if (id === 'slide-12') {
        s12c?.classList.add('visible');
        if (pillarsGrid) {
          staggerIn(pillarsGrid.querySelectorAll('.mo-pillar'), 'card-in', 110);
        }
      }

      if (id === 'slide-13') {
        s13c?.classList.add('visible');
        staggerIn(e.target.querySelectorAll('.mo-step'), 'step-in', 90);
        setTimeout(() => {
          staggerIn(e.target.querySelectorAll('.mo-spec-block'), 'spec-in', 120);
        }, 180);
      }

      if (id === 'slide-14') {
        s14c?.classList.add('visible');
        staggerIn(e.target.querySelectorAll('.mo-qcol'), 'qcol-in', 130);
      }

      // Once fired, unobserve so it doesn't re-trigger
      contentObs.unobserve(e.target);
    });
  }, { threshold: 0.01 });

  [s12, s13, s14].forEach(el => { if (el) contentObs.observe(el); });

  // ── Amber ambient orbs ───────────────────────────────────
  function spawnAmberOrbs(section) {
    if (section.dataset.amberOrbs) return;
    section.dataset.amberOrbs = '1';

    const COUNT = 20;
    const frag  = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
      const orb  = document.createElement('div');
      const size = 1.5 + Math.random() * 3.5;
      const x    = Math.random() * 100;
      const y    = Math.random() * 100;
      const dur  = 10 + Math.random() * 16;
      const dly  = -(Math.random() * dur);
      // amber → gold → orange band (28–42 hue)
      const hue  = 28 + Math.random() * 18;
      const sat  = 90 + Math.random() * 10;

      Object.assign(orb.style, {
        position:      'absolute',
        left:          x + '%',
        top:           y + '%',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    `hsl(${hue},${sat}%,60%)`,
        boxShadow:     `0 0 ${size * 3}px ${size}px hsla(${hue},${sat}%,60%,0.38)`,
        pointerEvents: 'none',
        zIndex:        2,
        opacity:       (0.06 + Math.random() * 0.22).toFixed(2),
        animation:     `orb-float-${i % 3} ${dur}s ${dly}s ease-in-out infinite`,
      });
      frag.appendChild(orb);
    }

    const frame = section.querySelector('.mo-frame');
    if (frame) frame.appendChild(frag);
  }

  const orbObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) spawnAmberOrbs(e.target); });
  }, { threshold: 0.1 });

  [s12, s13, s14].forEach(el => { if (el) orbObs.observe(el); });


  window.addEventListener('scroll', moTick, { passive: true });
  window.addEventListener('load',   moTick);
  moTick();

})();


/* ══════════════════════════════════════════════
   PHASE 05 — LAUNCH + GANTT SLIDES CONTROLLER
   Scroll-driven reveal for slides 15-18
══════════════════════════════════════════════ */

(function launchSlides() {

  function secProgress(el) {
    const rect  = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    if (total <= 0) return rect.top <= 0 ? 1 : 0;
    return Math.max(0, Math.min(1, -rect.top / total));
  }

  function staggerIn(els, cls, ms) {
    els.forEach((el, i) => setTimeout(() => el.classList.add(cls), i * ms));
  }

  // ── Slide 15 — Phase header + 5 pillar cards ────────────
  const s15  = document.getElementById('slide-15');
  const s15c = document.getElementById('s15-content');
  const s15f = document.getElementById('s15-fill');
  const laPillars = document.getElementById('la-pillars-grid');
  let s15In = false;

  function updateSlide15() {
    if (!s15) return;
    const p = secProgress(s15);
    if (s15f) s15f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s15c?.classList.add('visible');
      if (!s15In && laPillars) {
        s15In = true;
        staggerIn(laPillars.querySelectorAll('.la-pillar'), 'card-in', 100);
      }
    } else { s15c?.classList.remove('visible'); }
  }

  // ── Slide 16 — QA pipeline + security spec blocks ───────
  const s16  = document.getElementById('slide-16');
  const s16c = document.getElementById('s16-content');
  const s16f = document.getElementById('s16-fill');
  let s16In = false;

  function updateSlide16() {
    if (!s16) return;
    const p = secProgress(s16);
    if (s16f) s16f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s16c?.classList.add('visible');
      if (!s16In) {
        s16In = true;
        staggerIn(s16.querySelectorAll('.la-step'), 'step-in', 90);
        setTimeout(() => {
          staggerIn(s16.querySelectorAll('.la-spec-block'), 'spec-in', 130);
        }, 200);
      }
    } else { s16c?.classList.remove('visible'); }
  }

  // ── Slide 17 — Store + Growth Marketing panels ──────────
  const s17  = document.getElementById('slide-17');
  const s17c = document.getElementById('s17-content');
  const s17f = document.getElementById('s17-fill');
  let s17In = false;

  function updateSlide17() {
    if (!s17) return;
    const p = secProgress(s17);
    if (s17f) s17f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s17c?.classList.add('visible');
      if (!s17In) {
        s17In = true;
        staggerIn(s17.querySelectorAll('.la-panel'), 'panel-in', 150);
        setTimeout(() => {
          staggerIn(s17.querySelectorAll('.la-row'), 'row-in', 60);
        }, 220);
      }
    } else { s17c?.classList.remove('visible'); }
  }

  // ── Slide 18 — Gantt timeline ────────────────────────────
  const s18  = document.getElementById('slide-18');
  const s18c = document.getElementById('s18-content');
  const s18f = document.getElementById('s18-fill');
  const gtRowsEl = document.getElementById('gt-rows');
  let s18In = false;
  let ganttAnimated = false;

  function animateGanttBars() {
    if (ganttAnimated || !gtRowsEl) return;
    ganttAnimated = true;

    const bars = gtRowsEl.querySelectorAll('.gt-bar');
    bars.forEach((bar, i) => {
      const target = bar.dataset.target || '20%';
      setTimeout(() => {
        bar.style.width = target;
      }, 260 + i * 180);
    });

    // Stagger rows in
    staggerIn(gtRowsEl.querySelectorAll('.gt-row'), 'row-in', 140);
  }

  function updateSlide18() {
    if (!s18) return;
    const p = secProgress(s18);
    if (s18f) s18f.style.width = (p * 100) + '%';
    if (p > 0.05) {
      s18c?.classList.add('visible');
      if (!s18In) {
        s18In = true;
        // Delay gantt animation so content fade-in completes first
        setTimeout(animateGanttBars, 480);
      }
    } else { s18c?.classList.remove('visible'); }
  }

  // ── Emerald ambient orbs ────────────────────────────────
  function spawnEmeraldOrbs(section) {
    if (section.dataset.emeraldOrbs) return;
    section.dataset.emeraldOrbs = '1';
    const COUNT = 20;
    const frag  = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const orb  = document.createElement('div');
      const size = 1.5 + Math.random() * 3;
      const x    = Math.random() * 100;
      const y    = Math.random() * 100;
      const dur  = 10 + Math.random() * 15;
      const dly  = -(Math.random() * dur);
      const hue  = 145 + Math.random() * 28;   // emerald–teal band
      const sat  = 80 + Math.random() * 18;
      Object.assign(orb.style, {
        position:      'absolute',
        left:          x + '%',
        top:           y + '%',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    `hsl(${hue},${sat}%,60%)`,
        boxShadow:     `0 0 ${size * 3}px ${size}px hsla(${hue},${sat}%,60%,0.38)`,
        pointerEvents: 'none',
        zIndex:        2,
        opacity:       (0.06 + Math.random() * 0.22).toFixed(2),
        animation:     `orb-float-${i % 3} ${dur}s ${dly}s ease-in-out infinite`,
      });
      frag.appendChild(orb);
    }
    const frame = section.querySelector('.la-frame');
    if (frame) frame.appendChild(frag);
  }

  const orbObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) spawnEmeraldOrbs(e.target); });
  }, { threshold: 0.1 });

  [s15, s16, s17, s18].forEach(el => { if (el) orbObs.observe(el); });

  // ── Scroll-driven Background Image Sequence ──────────────
  const sequenceCanvas = document.getElementById('sequence-canvas');
  const sCtx = sequenceCanvas?.getContext('2d');
  const frameCount = 250;
  const sequenceImages = [];
  let framesLoaded = 0;

  function resizeSequenceCanvas() {
    if (!sequenceCanvas) return;
    sequenceCanvas.width = window.innerWidth;
    sequenceCanvas.height = window.innerHeight;
    drawSequenceFrame();
  }

  function preloadSequenceImages() {
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const paddedIndex = String(i).padStart(3, '0');
      img.src = `frames/ezgif-frame-${paddedIndex}.jpg`;
      img.onload = () => {
        framesLoaded++;
        if (framesLoaded === 1 || framesLoaded % 50 === 0 || framesLoaded === frameCount) {
          drawSequenceFrame();
        }
      };
      sequenceImages.push(img);
    }
  }

  function drawSequenceFrame() {
    if (!sequenceCanvas || !sCtx || sequenceImages.length === 0) return;
    
    // Get scroll progress (0..1)
    const sp = getScrollProgress();
    
    // Map progress to frame index (0..249)
    const frameIndex = Math.min(frameCount - 1, Math.floor(sp * frameCount));
    const img = sequenceImages[frameIndex];

    if (img && img.complete) {
      sCtx.clearRect(0, 0, sequenceCanvas.width, sequenceCanvas.height);

      const canvasRatio = sequenceCanvas.width / sequenceCanvas.height;
      const imgRatio = img.width / img.height;

      let drawWidth, drawHeight, drawX, drawY;
      if (canvasRatio > imgRatio) {
        drawWidth = sequenceCanvas.width;
        drawHeight = sequenceCanvas.width / imgRatio;
        drawX = 0;
        drawY = (sequenceCanvas.height - drawHeight) / 2;
      } else {
        drawWidth = sequenceCanvas.height * imgRatio;
        drawHeight = sequenceCanvas.height;
        drawX = (sequenceCanvas.width - drawWidth) / 2;
        drawY = 0;
      }

      sCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
  }

  // Bind scroll and resize listeners for sequence
  window.addEventListener('resize', resizeSequenceCanvas, { passive: true });
  window.addEventListener('scroll', drawSequenceFrame, { passive: true });

  // Init sequence
  if (sequenceCanvas) {
    resizeSequenceCanvas();
    preloadSequenceImages();
  }

  // ── 3D Card Tilt & Shine Init ────────────────────────────
  function init3DTilt() {
    const cardSelectors = [
      '.deliverable-card',
      '.feature-card',
      '.task-col',
      '.mo-pillar',
      '.la-pillar',
      '.la-spec-block',
      '.la-panel'
    ];
    const cards = document.querySelectorAll(cardSelectors.join(', '));

    cards.forEach(card => {
      // Append shine element dynamically if not present
      if (!card.querySelector('.card-shine')) {
        const shine = document.createElement('div');
        shine.className = 'card-shine';
        card.appendChild(shine);
      }

      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Custom mouse position CSS vars for shine
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Rotations calculation (max 12 degrees)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((centerY - y) / centerY) * 12;
        const rotateY = ((x - centerX) / centerX) * 12;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  // Bind init3DTilt
  window.addEventListener('DOMContentLoaded', init3DTilt);
  window.addEventListener('load', init3DTilt);
  // Also call it immediately for any elements already rendered
  setTimeout(init3DTilt, 100);

  // ── Main tick ────────────────────────────────────────────
  function laTick() {
    updateSlide15();
    updateSlide16();
    updateSlide17();
    updateSlide18();
  }

  window.addEventListener('scroll', laTick, { passive: true });
  window.addEventListener('load',   laTick);
  laTick();

})();

