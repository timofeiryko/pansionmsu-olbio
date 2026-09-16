// Edit the LaTeX directly inside <span class="math">…</span> in index.html.
document.querySelectorAll('.math').forEach(element => {
  katex.render(element.textContent, element, {
    displayMode: element.classList.contains('display-math'),
    throwOnError: false,
    output: 'htmlAndMathml',
    strict: 'warn',
    trust: false
  });
});
