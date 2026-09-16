// Process diagrams follow native Reveal fragments; the only looping demo can pause.
document.querySelectorAll('[data-motion]').forEach(button => {
  button.addEventListener('click', () => {
    const paused = button.closest('.demo').classList.toggle('paused');
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? 'Продолжить анимацию' : 'Пауза анимации';
  });
});
document.fonts.ready.then(() => deck.layout());
