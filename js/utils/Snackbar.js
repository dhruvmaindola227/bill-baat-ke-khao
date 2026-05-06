let _timer = null;
let _progressTimer = null;

const Snackbar = {
  show(message, onUndo, duration = 15000) {
    this.hide();

    const container = document.getElementById('snackbar-container');
    const el = document.createElement('div');
    el.className = 'snackbar';
    el.id = 'active-snackbar';
    el.innerHTML = `
      <span class="snackbar-message">${message}</span>
      <div class="snackbar-right">
        <div class="snackbar-progress" id="snackbar-progress"></div>
        <button class="snackbar-undo" id="snackbar-undo-btn">Undo</button>
      </div>
    `;
    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('snackbar-show'));
    });

    // Progress bar drain
    const progressEl = el.querySelector('#snackbar-progress');
    progressEl.style.transitionDuration = `${duration}ms`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { progressEl.style.width = '0%'; });
    });

    // Undo handler
    el.querySelector('#snackbar-undo-btn').addEventListener('click', () => {
      onUndo();
      this.hide();
    });

    _timer = setTimeout(() => this.hide(), duration);
  },

  hide() {
    clearTimeout(_timer);
    clearTimeout(_progressTimer);
    const el = document.getElementById('active-snackbar');
    if (!el) return;
    el.classList.remove('snackbar-show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  },
};

export default Snackbar;
