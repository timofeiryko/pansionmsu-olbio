// Run: node 2-chemistry/particles.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let seed = 4721;
const seededMath = Object.create(Math);
seededMath.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2**32);
const physics = {Math: seededMath};
vm.runInNewContext(fs.readFileSync(`${__dirname}/particles.js`, 'utf8'), physics);
const energy = ps => ps.reduce((s,p) => s+p.vx*p.vx+p.vy*p.vy,0);
const momentum = (ps, key) => ps.reduce((s,p) => s+p[key],0);
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b}`);
for (const [dx,dy] of [[18,0],[12,12]]) {
  const pair=[{x:0,y:0,r:10,vx:60,vy:20},{x:dx,y:dy,r:10,vx:-30,vy:-10}];
  const before=[energy(pair),momentum(pair,'vx'),momentum(pair,'vy')];
  physics.collideParticles(...pair);
  [energy(pair),momentum(pair,'vx'),momentum(pair,'vy')].forEach((x,i)=>close(x,before[i]));
  assert.ok(Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y)>=20);
}
const source=fs.readFileSync(`${__dirname}/index.html`,'utf8');
const models=[...source.matchAll(/<svg\b[^>]*data-particles="([^"]+)"[^>]*>[\s\S]*?<\/svg>/g)];
assert.equal(models.length,5);
const nearest = ps => ps.map((p,i)=>ps.reduce((best,q,j)=>i!==j&&Math.hypot(p.x-q.x,p.y-q.y)<best.d?{j,d:Math.hypot(p.x-q.x,p.y-q.y)}:best,{j:-1,d:Infinity}).j);
for(const [svg,mode] of models) {
  const speed=Number(svg.match(/data-speed="([^"]+)"/)[1]);
  const [width,height]=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
  const ps=[...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g)].map((m,i)=>({x:+m[1],y:+m[2],r:+m[3],vx:Math.cos(i*2.399963+.4)*speed*(.8+(i*7%11)/25),vy:Math.sin(i*2.399963+.4)*speed*(.8+(i*7%11)/25)}));
  const initialEnergy=energy(ps), previousNeighbours=nearest(ps);
  let changes=0, maxOverlap=0, meanDistance=0, lastRight=347;
  for(let frame=0;frame<7200;frame++) {
    const right=mode==='pressure'?382-35*Math.cos(frame/240*Math.PI):width-12;
    const box=mode==='pressure'?{left:68,top:76,right,bottom:284,wallSpeed:(right-lastRight)*240}:{left:12,top:12,right,bottom:height-12};
    lastRight=right;
    physics.stepParticles(ps,box,1/240,mode==='liquid');
    for(const p of ps) {
      assert.ok(Number.isFinite(p.x+p.y+p.vx+p.vy));
      assert.ok(p.x-p.r>=box.left-1e-6&&p.x+p.r<=box.right+1e-6&&p.y-p.r>=box.top-1e-6&&p.y+p.r<=box.bottom+1e-6,`${mode}: escaped`);
    }
    for(let i=0;i<ps.length;i++) for(let j=i+1;j<ps.length;j++) maxOverlap=Math.max(maxOverlap,ps[i].r+ps[j].r-Math.hypot(ps[i].x-ps[j].x,ps[i].y-ps[j].y));
    if(frame%240===0) nearest(ps).forEach((j,i)=>{if(j!==previousNeighbours[i])changes++;previousNeighbours[i]=j;});
  }
  if(mode==='gas') close(energy(ps),initialEnergy);
  if(mode==='pressure') assert.equal(ps.length,8);
  if(mode==='liquid') {
    const cx=ps.reduce((s,p)=>s+p.x,0)/ps.length,cy=ps.reduce((s,p)=>s+p.y,0)/ps.length;
    meanDistance=ps.reduce((s,p)=>s+Math.hypot(p.x-cx,p.y-cy),0)/ps.length;
    assert.ok(changes>30, 'Liquid must keep changing neighbours');
    assert.ok(meanDistance<60, 'Liquid must stay together');
  }
  assert.ok(maxOverlap<0.2,`${mode}: excessive overlap ${maxOverlap}`);
  console.log(`${mode}: ${ps.length} particles; 30 s confined; max overlap ${maxOverlap.toFixed(3)}; neighbour changes ${changes}; cluster radius ${meanDistance.toFixed(1)}`);
}
console.log('Elastic energy/momentum, moving piston, liquid cohesion and neighbour exchange: OK');
