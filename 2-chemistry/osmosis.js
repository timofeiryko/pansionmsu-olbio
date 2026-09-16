// Coarse kinetic model: identical elastic discs, with solute excluded by the membrane.
// Volume follows the actual particle balance, with constant partial particle volumes.
// A conservative energy step represents the growing hydrostatic back-pressure. No directional
// crossing probability, scripted route, or target transfer count is used.
function createOsmosis(seed = 713) {
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  const particles = [];
  for (let side = 0; side < 2; side++) for (let i = 0; i < 60; i++) {
    const angle = random() * 2 * Math.PI;
    const speed = 105 * (0.8 + random() * 0.4);
    particles.push({x: 60 + side * 380 + (i % 10) * 36 + random() * 3,
      y: 212 + Math.floor(i / 10) * 23 + random() * 3, r: 7,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      solute: side === 1 && i % 2 === 0, side});
  }
  return {particles, kineticEnergy: particles.reduce((sum,p)=>sum+p.vx*p.vx+p.vy*p.vy,0),
    offset: 0, time: 0, forward: 0, backward: 0,
    contacts: 0, wallHits: 0, soluteHits: 0,
    pores: [[245, 280], [298, 340]]};
}

function confineOsmosis(p, model) {
  const top = 195 + (p.side ? -model.offset : model.offset);
  if (p.y < top + p.r) {
    p.y = top + p.r;
    if (p.vy < 0) {
      p.vy = -p.vy;
      model.wallHits++;
    }
  }
  if (p.x < 40 + p.r || p.x > 800 - p.r || p.y > 345 - p.r) model.wallHits++;
  confineParticle(p, {left:40, right:800, top:0, bottom:345});
  const inPore = !p.solute && model.pores.some(([a,b]) => p.y >= a + p.r + 2 && p.y <= b - p.r - 2);
  // A pore has the same geometry and permeability in either direction.
  if (inPore) {
    if ((p.side === 0 && p.x > 420 + p.r + 2) || (p.side === 1 && p.x < 420 - p.r - 2)) {
      // Climbing toward the higher column requires energy; returning releases it.
      // The same potential is used in both directions. At equal levels it is zero.
      const direction = p.side === 0 ? 1 : -1;
      const energy = p.vx*p.vx - direction * 2 * 90 * model.offset;
      if (energy < 0 || direction * model.offset >= 60) {
        p.x = 420 - direction * (p.r + 3); p.vx = -p.vx;
        return;
      }
      p.vx = direction * Math.sqrt(energy);
      if (p.side === 0) model.forward++; else model.backward++;
      p.side = 1 - p.side;
      model.offset = 150 * (model.forward - model.backward) / 60;
    }
  } else if (Math.abs(p.x - 420) < p.r + 3 || (p.side === 0 ? p.x > 420 : p.x < 420)) {
    p.x = 420 + (p.side ? 1 : -1) * (p.r + 3);
    if (p.side ? p.vx < 0 : p.vx > 0) {
      p.vx = -p.vx;
      model.wallHits++;
      if (p.solute) model.soluteHits++;
    }
  }
}

function stepOsmosis(model, dt) {
  model.time += dt;
  for (const p of model.particles) { p.x += p.vx * dt; p.y += p.vy * dt; confineOsmosis(p, model); }
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < model.particles.length; i++) for (let j = i + 1; j < model.particles.length; j++) {
      const a = model.particles[i], b = model.particles[j];
      if (Math.abs(a.x-b.x)>32 || Math.abs(a.y-b.y)>32) continue;
      if (a.side !== b.side && (Math.abs(a.x - 420) > 10 || Math.abs(b.x - 420) > 10)) continue;
      const distance = Math.hypot(a.x-b.x,a.y-b.y);
      if (distance < a.r + b.r) model.contacts++;
      collideParticles(a, b);
    }
    for (const p of model.particles) confineOsmosis(p, model);
  }
  // Both compartments share a temperature despite pressure work.
  for (const side of [0,1]) {
    const ps = model.particles.filter(p=>p.side===side);
    const energy = ps.reduce((sum,p)=>sum+p.vx*p.vx+p.vy*p.vy,0);
    const scale = 1 + (Math.sqrt(model.kineticEnergy * ps.length / (model.particles.length * energy)) - 1) * Math.min(4*dt,1);
    for (const p of ps) { p.vx *= scale; p.vy *= scale; }
  }
}

if (typeof document !== 'undefined') {
  const slide = document.getElementById('osmosis');
  const demo = slide.querySelector('.osmosis-demo');
  const svg = slide.querySelector('.osmosis-molecular');
  const layer = svg.querySelector('.osmosis-particles');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const printMode = matchMedia('print');
  let model = createOsmosis(), previous, wasVisible = false, shownOffset = 0;
  const nodes = model.particles.map(p => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('r', p.r);
    node.setAttribute('class', p.solute ? 'solute-molecule' : 'water-molecule');
    layer.appendChild(node);
    return node;
  });
  const leftFill = svg.querySelector('.osmo-level-left'), rightFill = svg.querySelector('.osmo-level-right');
  const leftSurface = svg.querySelector('.osmo-surface-left'), rightSurface = svg.querySelector('.osmo-surface-right');
  const volume = slide.querySelector('[data-osmosis="volume"]');
  const concentration = slide.querySelector('[data-osmosis="concentration"]'), bar = slide.querySelector('.concentration-track>span');
  function draw() {
    model.particles.forEach((p,i) => {
      const sign = p.side ? -1 : 1;
      const height = 150 - sign * model.offset, shownHeight = 150 - sign * shownOffset;
      nodes[i].setAttribute('cx', p.x.toFixed(2));
      nodes[i].setAttribute('cy', (345 - p.r - (345 - p.r - p.y) * (shownHeight - 2*p.r) / (height - 2*p.r)).toFixed(2));
    });
    for (const [fill, surface, sign] of [[leftFill,leftSurface,1],[rightFill,rightSurface,-1]]) {
      const top = 195 + sign * shownOffset;
      fill.setAttribute('y', top.toFixed(2)); fill.setAttribute('height', (345 - top).toFixed(2));
      surface.setAttribute('y1', top.toFixed(2)); surface.setAttribute('y2', top.toFixed(2));
    }
    const ratio = (150 + shownOffset) / 150;
    volume.textContent = `${ratio.toFixed(2).replace('.', ',')} V₀`;
    concentration.textContent = `${Math.round(100 / ratio)}%`;
    bar.style.width = `${100 / ratio}%`;
    svg.setAttribute('aria-label', `Вода движется через мембрану в обе стороны. В раствор: ${model.forward}, обратно: ${model.backward}. 30 частиц растворённого вещества остаются справа`);
  }
  function reset() { model = createOsmosis(); shownOffset = 0; draw(); }
  slide.querySelector('[data-osmosis-reset]').addEventListener('click', () => {
    demo.classList.remove('paused');
    const pause = demo.querySelector('[data-motion]');
    pause.setAttribute('aria-pressed', 'false'); pause.textContent = 'Пауза анимации';
    reset();
  });
  function animate(time) {
    const dt = Math.min((time - (previous ?? time)) / 1000, 0.04);
    previous = time;
    const visible = slide.classList.contains('present') && demo.classList.contains('visible');
    if (!visible && wasVisible) reset();
    wasVisible = visible;
    if (visible && !demo.classList.contains('paused') && !document.hidden && !reducedMotion.matches && !printMode.matches && !document.documentElement.classList.contains('print-pdf')) {
      const steps = Math.ceil(dt / (1 / 240));
      for (let i = 0; i < steps; i++) stepOsmosis(model, dt / steps);
      // Show a macroscopic level: progressively average the small-number fluctuations.
      const smoothingTime = 2 + Math.min(model.time / 5, 10);
      shownOffset += (model.offset - shownOffset) * (1 - Math.exp(-dt / smoothingTime));
      draw();
    }
    requestAnimationFrame(animate);
  }
  draw();
  requestAnimationFrame(animate);
}
