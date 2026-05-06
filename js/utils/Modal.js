const overlay = () => document.getElementById('modal-overlay');
const box = () => document.getElementById('modal-box');
const content = () => document.getElementById('modal-content');

let _resolveConfirm = null;

function show(html) {
  content().innerHTML = html;
  overlay().setAttribute('aria-hidden', 'false');
  overlay().classList.add('active');
  // Focus first focusable element
  requestAnimationFrame(() => {
    const el = box().querySelector('input, select, textarea, button:not(.modal-close)');
    el?.focus();
  });
}

function hide() {
  overlay().setAttribute('aria-hidden', 'true');
  overlay().classList.remove('active');
  content().innerHTML = '';
  if (_resolveConfirm) {
    _resolveConfirm(false);
    _resolveConfirm = null;
  }
}

function confirm(message, danger = false) {
  return new Promise(resolve => {
    _resolveConfirm = resolve;
    show(`
      <div class="confirm-dialog">
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">Confirm</button>
        </div>
      </div>
    `);
    document.getElementById('confirm-cancel').addEventListener('click', () => { resolve(false); hide(); });
    document.getElementById('confirm-ok').addEventListener('click', () => { resolve(true); hide(); });
  });
}

function init() {
  overlay().addEventListener('click', e => {
    if (e.target === overlay()) hide();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay().classList.contains('active')) hide();
  });
}

export default { show, hide, confirm, init };
