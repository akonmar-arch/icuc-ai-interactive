const menuButton = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  siteNav.classList.toggle('open', open);
});
siteNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  siteNav.classList.remove('open');
}));

document.querySelector('.video-case-load')?.addEventListener('click', event => {
  const screen = event.currentTarget.closest('.video-case-screen');
  const video = screen.querySelector('iframe');
  video.src = video.dataset.src;
  video.hidden = false;
  screen.classList.add('is-playing');
});

document.querySelectorAll('.copy-prompt').forEach(button => {
  button.addEventListener('click', async () => {
    const prompt = button.closest('.prompt-box').querySelector('pre').textContent.trim();
    try {
      await navigator.clipboard.writeText(prompt);
      button.textContent = '已复制 ✓';
    } catch {
      const field = document.createElement('textarea');
      field.value = prompt;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      button.textContent = copied ? '已复制 ✓' : '请选中上方提示词';
    }
    setTimeout(() => { button.textContent = '复制提示词'; }, 2200);
  });
});
