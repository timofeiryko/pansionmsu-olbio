// Equal-mass discs: elastic contact, with short-range attraction in the liquid.
function collideParticles(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const distance = Math.hypot(dx, dy), contact = a.r + b.r;
  if (distance >= contact) return;
  const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
  const overlap = (contact - distance) / 2 + 0.0001;
  a.x -= nx * overlap; a.y -= ny * overlap;
  b.x += nx * overlap; b.y += ny * overlap;
  const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (approach >= 0) return;
  a.vx += approach * nx; a.vy += approach * ny;
  b.vx -= approach * nx; b.vy -= approach * ny;
}

function confineParticle(p, box) {
  if (p.x < box.left + p.r) { p.x = box.left + p.r; p.vx = Math.abs(p.vx); }
  if (p.x > box.right - p.r) {
    p.x = box.right - p.r;
    const wallSpeed = box.wallSpeed || 0;
    if (p.vx > wallSpeed) p.vx = 2 * wallSpeed - p.vx;
  }
  if (p.y < box.top + p.r) { p.y = box.top + p.r; p.vy = Math.abs(p.vy); }
  if (p.y > box.bottom - p.r) { p.y = box.bottom - p.r; p.vy = -Math.abs(p.vy); }
}

function stepParticles(particles, box, dt, liquid = false) {
  if (liquid) {
    for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      const contact = a.r + b.r, reach = contact + 22;
      if (d <= contact || d >= reach) continue;
      const impulse = 160 * (reach - d) / (reach - contact) * dt;
      a.vx += impulse * dx / d; a.vy += impulse * dy / d;
      b.vx -= impulse * dx / d; b.vy -= impulse * dy / d;
    }
    // Thermal kicks keep individual particles mobile instead of cooling into a rotating rigid cluster.
    const damping = Math.exp(-6 * dt), noise = 32 * Math.sqrt(6 * (1 - damping * damping));
    for (const p of particles) {
      p.vx = damping * p.vx + noise * (Math.random() - 0.5);
      p.vy = damping * p.vy + noise * (Math.random() - 0.5);
    }
  }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
  // Recheck contacts after displacement; clamp again so a neighbour cannot push a disc through a wall.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) collideParticles(particles[i], particles[j]);
    for (const p of particles) confineParticle(p, box);
  }
}

function drawParticles(particles) {
  for (const p of particles) { p.node.setAttribute('cx', p.x.toFixed(3)); p.node.setAttribute('cy', p.y.toFixed(3)); }
}

if (typeof document !== 'undefined') {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const printMode = matchMedia('print');
  const models = [...document.querySelectorAll('svg[data-particles]')].map(svg => {
    const particles = [...svg.querySelectorAll('circle')].map((node, i) => {
      const angle = i * 2.399963 + 0.4, speed = Number(svg.dataset.speed || 65) * (0.8 + (i * 7 % 11) / 25);
      return {node, x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')), r: Number(node.getAttribute('r')), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed};
    });
    return {svg, particles, slide: svg.closest('section'), demo: svg.closest('.demo'), fragment: svg.closest('.fragment'), wall: 347};
  });
  let previous;
  function animate(time) {
    const dt = Math.min((time - (previous ?? time)) / 1000, 0.04);
    previous = time;
    for (const model of models) {
      const {svg, particles, slide, demo, fragment} = model;
      const pressure = svg.dataset.particles === 'pressure';
      const right = pressure ? parseFloat(getComputedStyle(svg).getPropertyValue('--pressure-wall')) : svg.viewBox.baseVal.width - 12;
      const box = pressure ? {left:68, top:76, right, bottom:284, wallSpeed:(right-model.wall)/(dt || 1)} : {left:12, top:12, right, bottom:svg.viewBox.baseVal.height-12};
      if (!dt || document.hidden || reducedMotion.matches || printMode.matches || document.documentElement.classList.contains('print-pdf') || !slide.classList.contains('present') || demo.classList.contains('paused') || (fragment && !fragment.classList.contains('visible'))) {
        model.wall = right;
        if (pressure) {
          box.wallSpeed = 0;
          for (const p of particles) confineParticle(p, box);
          drawParticles(particles);
        }
        continue;
      }
      const steps = Math.ceil(dt / (1 / 240));
      for (let i = 1; i <= steps; i++) {
        if (pressure) box.right = model.wall + (right - model.wall) * i / steps;
        stepParticles(particles, box, dt / steps, svg.dataset.particles === 'liquid');
      }
      model.wall = right;
      drawParticles(particles);
    }
    requestAnimationFrame(animate);
  }
  if (models.length) requestAnimationFrame(animate);
}
