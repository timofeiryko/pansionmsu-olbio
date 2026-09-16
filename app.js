// Reveal.js handles navigation, overview, touch, keyboard, notes and printing.
const slides = [...document.querySelectorAll('.slides > section')];
const jump = document.getElementById('jump');
slides.forEach((slide, i) => {
  jump.add(new Option(`${String(i + 1).padStart(2, '0')}  ${slide.dataset.title || slide.querySelector('h2,h1')?.textContent}`, i));
  slide.querySelector('.slide-foot span:last-child').textContent = `${String(i + 1).padStart(2, '0')} / ${slides.length}`;
});
const deck = new Reveal(document.querySelector('.reveal'), {
  width: 1280, height: 720, margin: 0.025, minScale: 0.1, maxScale: 2,
  center: false, display: 'flex', controls: false, progress: false,
  hash: true, hashOneBasedIndex: true, transition: 'none',
  backgroundTransition: 'none', view: 'slide', pdfSeparateFragments: false,
  autoAnimate: false,
  plugins: [RevealNotes]
});
const overview = document.getElementById('overview');
function updateToolbar() {
  const i = deck.getIndices().h;
  jump.value = i;
  document.getElementById('counter').textContent = `${i + 1} / ${slides.length}`;
  const fragments = deck.availableFragments();
  document.getElementById('prev').disabled = i === 0 && !fragments.prev;
  document.getElementById('next').disabled = i === slides.length - 1 && !fragments.next;
  document.getElementById('progress').style.width = `${(i + 1) / slides.length * 100}%`;
}
deck.on('slidechanged', updateToolbar);
deck.on('fragmentshown', updateToolbar);
deck.on('fragmenthidden', updateToolbar);
deck.on('overviewshown', () => { overview.setAttribute('aria-pressed', 'true'); overview.textContent = 'К презентации'; });
deck.on('overviewhidden', () => { overview.setAttribute('aria-pressed', 'false'); overview.textContent = 'Все слайды'; });
document.getElementById('prev').onclick = () => deck.prev();
document.getElementById('next').onclick = () => deck.next();
jump.onchange = () => deck.slide(Number(jump.value), 0, -1);
overview.onclick = () => deck.toggleOverview();
document.getElementById('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { document.getElementById('fullscreen').textContent = 'Используйте F11'; }
};
document.addEventListener('fullscreenchange', () => { document.body.classList.toggle('presenting', !!document.fullscreenElement); deck.layout(); });
const motionToggle = document.getElementById('particle-motion');
motionToggle?.addEventListener('click', () => {
  const paused = motionToggle.closest('.heat-demo').classList.toggle('motion-paused');
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionToggle.textContent = paused ? 'Продолжить анимацию' : 'Пауза анимации';
});
deck.initialize().then(updateToolbar);
