import { CURRENCIES, escapeHtml } from '../utils/helpers.js';
import Modal from '../utils/Modal.js';
import Toast from '../utils/Toast.js';

export class HomeView {
  constructor(appService, router) {
    this._svc = appService;
    this._router = router;
    this._el = document.getElementById('view-home');
  }

  render() {
    const groups = this._svc.getGroups();
    this._el.innerHTML = `
      <div class="home-page">
        <header class="page-header">
          <div class="header-inner container">
            <div class="brand">
              <div class="brand-icon">B</div>
              <span class="brand-name">Bill Baat Ke Khao</span>
            </div>
            <div class="header-actions">
              <button class="btn btn-primary" id="btn-create-group">+ New Group</button>
            </div>
          </div>
        </header>
        <div class="home-action-bar">
          <div class="container">
            <label class="btn btn-ghost btn-sm" title="Import backup">
              Import
              <input type="file" accept=".json" id="import-input" class="sr-only">
            </label>
            <button class="btn btn-ghost btn-sm" id="btn-export">Export</button>
          </div>
        </div>
        <main class="home-main container">
          ${groups.length === 0 ? this._emptyState() : this._groupsGrid(groups)}
        </main>
      </div>
    `;
    this._bind();
  }

  _emptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">◎</div>
        <h2>No groups yet</h2>
        <p>Create a group to start splitting expenses with friends.</p>
        <button class="btn btn-primary btn-lg" id="btn-create-empty">Create your first group</button>
      </div>
    `;
  }

  _groupsGrid(groups) {
    return `
      <div class="section-header">
        <h2 class="section-title">Your Groups</h2>
        <span class="count-badge">${groups.length}</span>
      </div>
      <div class="groups-grid">
        ${groups.map(g => this._groupCard(g)).join('')}
      </div>
    `;
  }

  _groupCard(g) {
    const total = g.expenses.reduce((s, e) => s + e.amount, 0);
    const totalStr = total > 0
      ? `${g.symbol}${Number.isInteger(total) ? total.toLocaleString('en-IN') : total.toFixed(2)}`
      : '—';
    return `
      <article class="group-card" data-id="${escapeHtml(g.id)}" role="button" tabindex="0"
               aria-label="Open group ${escapeHtml(g.name)}">
        <div class="group-card-top">
          <div class="group-avatar">${escapeHtml(g.name.slice(0, 2).toUpperCase())}</div>
          <button class="btn-icon-close js-delete-group" data-id="${escapeHtml(g.id)}"
                  title="Delete group" aria-label="Delete ${escapeHtml(g.name)}">✕</button>
        </div>
        <div class="group-card-body">
          <h3 class="group-card-name">${escapeHtml(g.name)}</h3>
          <p class="group-card-meta">
            ${g.people.length} ${g.people.length === 1 ? 'person' : 'people'}
            <span class="dot">·</span>
            ${g.expenses.length} ${g.expenses.length === 1 ? 'expense' : 'expenses'}
          </p>
        </div>
        <div class="group-card-footer">
          <div>
            <p class="total-label">Total spent</p>
            <p class="total-value">${escapeHtml(totalStr)}</p>
          </div>
          <span class="currency-tag">${escapeHtml(g.currency)}</span>
        </div>
      </article>
    `;
  }

  _showCreateModal() {
    const opts = CURRENCIES.map(c =>
      `<option value="${c.code}" data-symbol="${c.symbol}">${c.name} (${c.symbol})</option>`
    ).join('');
    Modal.show(`
      <div class="modal-header"><h2>New Group</h2></div>
      <form id="form-create-group" class="modal-form">
        <div class="form-group">
          <label for="grp-name">Group Name</label>
          <input type="text" id="grp-name" placeholder="e.g. Goa Trip" required maxlength="60" autocomplete="off">
        </div>
        <div class="form-group">
          <label for="grp-currency">Currency</label>
          <select id="grp-currency">${opts}</select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="btn-modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Group</button>
        </div>
      </form>
    `);

    document.getElementById('btn-modal-cancel').addEventListener('click', () => Modal.hide());
    document.getElementById('form-create-group').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('grp-name').value.trim();
      const sel = document.getElementById('grp-currency');
      const code = sel.value;
      const symbol = sel.options[sel.selectedIndex].dataset.symbol;
      if (!name) return;
      try {
        this._svc.createGroup({ name, currency: code, symbol });
        Modal.hide();
        Toast.show(`Group "${name}" created.`, 'success');
        this.render();
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  }

  async _deleteGroup(id) {
    const group = this._svc.getGroup(id);
    if (!group) return;
    const ok = await Modal.confirm(
      `Delete <strong>${escapeHtml(group.name)}</strong>? This will permanently remove all expenses.`,
      true
    );
    if (!ok) return;
    this._svc.deleteGroup(id);
    Toast.show('Group deleted.', 'info');
    this.render();
  }

  _bind() {
    this._el.addEventListener('click', e => {
      if (e.target.closest('#btn-create-group') || e.target.closest('#btn-create-empty')) {
        this._showCreateModal();
        return;
      }
      if (e.target.closest('#btn-export')) {
        this._svc.exportData();
        Toast.show('Backup downloaded.', 'success');
        return;
      }
      const deleteBtn = e.target.closest('.js-delete-group');
      if (deleteBtn) {
        e.stopPropagation();
        this._deleteGroup(deleteBtn.dataset.id);
        return;
      }
      const card = e.target.closest('.group-card');
      if (card) {
        this._router.navigate(`/group/${card.dataset.id}`);
      }
    }, { capture: false });

    this._el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.group-card');
        if (card) this._router.navigate(`/group/${card.dataset.id}`);
      }
    });

    const importInput = document.getElementById('import-input');
    if (importInput) {
      importInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            this._svc.importData(ev.target.result);
            Toast.show('Data imported successfully.', 'success');
            this.render();
          } catch {
            Toast.show('Invalid backup file.', 'error');
          }
        };
        reader.readAsText(file);
        importInput.value = '';
      });
    }
  }
}
