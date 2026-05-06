import { escapeHtml } from '../utils/helpers.js';
import EventBus from '../utils/EventBus.js';
import Toast from '../utils/Toast.js';
import Modal from '../utils/Modal.js';
import { ExpensesTab } from './ExpensesTab.js';
import { SettleTab } from './SettleTab.js';
import { SummaryTab } from './SummaryTab.js';

const TAB_LABELS = { expenses: 'Expenses', settle: 'Settle Up', summary: 'Summary' };

export class GroupView {
  constructor(appService, router) {
    this._svc = appService;
    this._router = router;
    this._el = document.getElementById('view-group');
    this._groupId = null;
    this._tab = 'expenses';
    this._unsubscribe = null;
  }

  render(groupId, tab = 'expenses') {
    const group = this._svc.getGroup(groupId);
    if (!group) { this._router.navigate('/'); return; }

    this._groupId = groupId;
    this._tab = tab;

    // Unsubscribe previous listener before re-mounting
    this._unsubscribe?.();
    this._unsubscribe = EventBus.on('data:changed', () => this._onDataChanged());

    this._el.innerHTML = this._template(group);
    this._mountTab(group);
    this._bind();
  }

  _onDataChanged() {
    const group = this._svc.getGroup(this._groupId);
    if (!group) { this._router.navigate('/'); return; }

    // Patch people strip in-place to avoid scroll reset
    const strip = this._el.querySelector('#people-strip');
    if (strip) strip.innerHTML = this._peopleChips(group);

    // Re-mount the active tab
    this._mountTab(group);
  }

  _template(group) {
    return `
      <div class="group-page">
        <header class="page-header">
          <div class="header-inner container">
            <button class="btn btn-ghost btn-sm" id="btn-back">← Back</button>
            <div class="group-title-wrap">
              <h1 class="group-page-title">${escapeHtml(group.name)}</h1>
              <span class="currency-tag">${escapeHtml(group.currency)} ${escapeHtml(group.symbol)}</span>
            </div>
            <div style="width:80px"></div>
          </div>
        </header>

        <div class="people-strip-wrap">
          <div class="container">
            <div class="people-strip-row">
              <span class="people-label">People</span>
              <div class="people-strip" id="people-strip">${this._peopleChips(group)}</div>
            </div>
          </div>
        </div>

        <div class="tab-bar-wrap">
          <div class="container">
            <nav class="tab-bar" role="tablist">
              ${Object.entries(TAB_LABELS).map(([key, label]) => `
                <button class="tab-btn${this._tab === key ? ' active' : ''}"
                        data-tab="${key}" role="tab"
                        aria-selected="${this._tab === key}">${label}</button>
              `).join('')}
            </nav>
          </div>
        </div>

        <div class="tab-content" id="tab-content">
          <div class="container" id="tab-inner"></div>
        </div>
      </div>
    `;
  }

  _peopleChips(group) {
    const chips = group.people.map(p => `
      <span class="person-chip">
        ${escapeHtml(p.name)}
        <button class="chip-remove js-remove-person" data-id="${escapeHtml(p.id)}"
                aria-label="Remove ${escapeHtml(p.name)}">×</button>
      </span>
    `).join('');
    return chips + `<button class="person-chip chip-add js-add-person">+ Add</button>`;
  }

  _mountTab(group) {
    const inner = this._el.querySelector('#tab-inner');
    if (!inner) return;
    const tabs = { expenses: ExpensesTab, settle: SettleTab, summary: SummaryTab };
    tabs[this._tab]?.mount(inner, group, this._svc, this._router);
  }

  _showAddPersonModal(group) {
    Modal.show(`
      <div class="modal-header"><h2>Add Person</h2></div>
      <form id="form-add-person" class="modal-form">
        <div class="form-group">
          <label for="person-name">Name</label>
          <input type="text" id="person-name" placeholder="e.g. Rohan" required maxlength="40" autocomplete="off">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-person">Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </form>
    `);
    document.getElementById('btn-cancel-person').addEventListener('click', () => Modal.hide());
    document.getElementById('form-add-person').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('person-name').value;
      try {
        this._svc.addPerson(group.id, name);
        Modal.hide();
        Toast.show(`${name.trim()} added.`, 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  }

  async _removePerson(group, personId) {
    const person = group.people.find(p => p.id === personId);
    if (!person) return;
    try {
      const ok = await Modal.confirm(
        `Remove <strong>${escapeHtml(person.name)}</strong> from the group?`, true
      );
      if (!ok) return;
      this._svc.removePerson(group.id, personId);
      Toast.show(`${person.name} removed.`, 'info');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  _bind() {
    this._el.addEventListener('click', e => {
      if (e.target.closest('#btn-back')) {
        this._unsubscribe?.();
        this._unsubscribe = null;
        this._router.navigate('/');
        return;
      }

      const tabBtn = e.target.closest('.tab-btn');
      if (tabBtn) {
        const tab = tabBtn.dataset.tab;
        if (tab === this._tab) return;
        this._tab = tab;
        this._el.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tab);
          b.setAttribute('aria-selected', b.dataset.tab === tab);
        });
        const group = this._svc.getGroup(this._groupId);
        if (group) this._mountTab(group);
        return;
      }

      if (e.target.closest('.js-add-person')) {
        const group = this._svc.getGroup(this._groupId);
        if (group) this._showAddPersonModal(group);
        return;
      }

      const removeBtn = e.target.closest('.js-remove-person');
      if (removeBtn) {
        const group = this._svc.getGroup(this._groupId);
        if (group) this._removePerson(group, removeBtn.dataset.id);
      }
    });
  }
}
