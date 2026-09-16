// Run: node 2-chemistry/osmosis.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createOsmosis, stepOsmosis} = new Function(
  fs.readFileSync(`${__dirname}/particles.js`, 'utf8') + '\n' +
  fs.readFileSync(`${__dirname}/osmosis.js`, 'utf8') +
  '\nreturn {createOsmosis, stepOsmosis};')();

const model = createOsmosis();
let maxOverlap = 0;
for (let frame = 0; frame < 60 * 240; frame++) {
  stepOsmosis(model, 1 / 240);
  for (const p of model.particles) {
    assert.ok(Number.isFinite(p.x+p.y+p.vx+p.vy));
    const top = 195 + (p.side ? -model.offset : model.offset);
    assert.ok(p.x-p.r >= 40-1e-5 && p.x+p.r <= 800+1e-5 && p.y-p.r >= top-1e-5 && p.y+p.r <= 345+1e-5, 'Particle escaped a chamber');
    if (p.solute) assert.ok(p.side === 1 && p.x >= 430-1e-5, 'Solute crossed the membrane');
    if (!p.solute && Math.abs(p.x-420) < p.r+3-1e-5) {
      assert.ok(model.pores.some(([a,b])=>p.y>=a+p.r+2 && p.y<=b-p.r-2), 'Water crossed a solid membrane segment');
    }
  }
  assert.equal(model.particles.filter(p=>!p.solute && p.side===1).length - 30, model.forward-model.backward);
  assert.equal(model.offset, 150*(model.forward-model.backward)/60, 'Volume must follow actual water transfer');
  if (frame % 24 === 0) {
    for (let i=0;i<model.particles.length;i++) for (let j=i+1;j<model.particles.length;j++) {
      const a=model.particles[i], b=model.particles[j];
      if (a.side===b.side) maxOverlap=Math.max(maxOverlap,a.r+b.r-Math.hypot(a.x-b.x,a.y-b.y));
    }
  }
}
assert.equal(model.particles.length,120);
assert.equal(model.particles.filter(p=>p.solute).length,30);
assert.ok(model.forward>model.backward && model.backward>5, 'Both directions, with net flow into solution');
assert.ok(model.offset>0, 'Solution volume increased');
assert.ok(model.contacts>1000 && model.wallHits>1000 && model.soluteHits>20);
assert.ok(maxOverlap<1, `Excessive overlap: ${maxOverlap}`);
console.log(JSON.stringify({seconds:60,forward:model.forward,backward:model.backward,net:model.forward-model.backward,
  concentration:Math.round(100*150/(150+model.offset)),maxOverlap}));
console.log('Conservation, bidirectional pores, collisions and dilution: OK');
