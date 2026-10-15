const demoFrame = document.getElementById('case-frame');
document.querySelectorAll('[data-demo]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    document.querySelectorAll('[data-demo]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    demoFrame.src = button.dataset.demo;
    demoFrame.title = `${button.dataset.name}：中文演奏试玩`;
    document.getElementById('demo-name').textContent = button.dataset.name;
    document.getElementById('demo-source').href = button.dataset.source;
    document.querySelector('.demo-full').href = button.dataset.demo;
  });
});
