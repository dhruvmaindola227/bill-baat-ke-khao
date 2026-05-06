import { escapeHtml, formatCurrency, formatDate, today } from '../utils/helpers.js';
import Modal from '../utils/Modal.js';
import Toast from '../utils/Toast.js';

export const ExpensesTab = {
  mount(container, group, svc, router) {
    container.innerHTML = this._getHTML(group);
    this._bind(container, group, svc, router);
  },

  _getHTML(group) {
    const sorted = [...group.expenses].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });

    const total = group.expenses.reduce((s, e) => s + e.amount, 0);
    const personMap = new Map(group.people.map(p => [p.id, p.name]));

    return `
      <div class="tab-panel-inner">
        <div class="expenses-toolbar">
          <div class="total-card">
            <span class="total-label">Total Expenditure</span>
            <span class="total-amount">${formatCurrency(total, group.symbol)}</span>
          </div>
          <button class="btn btn-primary" id="btn-add-expense"
                  ${group.people.length < 2 ? 'disabled title="Add at least 2 people first"' : ''}>
            + Add Expense
          </button>
        </div>

        ${sorted.length === 0
          ? `<div class="empty-state empty-state-sm">
               <p>No expenses yet.</p>
               <p class="text-muted">Tap "+ Add Expense" to record one.</p>
             </div>`
          : `<div class="expense-list">
               ${sorted.map(e => this._expenseRow(e, group, personMap)).join('')}
             </div>`
        }
      </div>
    `;
  },

  _expenseRow(e, group, personMap) {
    const paidBy = personMap.get(e.paidBy) ?? 'Unknown';
    const splitNames = e.splitBetween.map(id => personMap.get(id) ?? '?').join(', ');
    return `
      <div class="expense-row" data-id="${escapeHtml(e.id)}">
        <div class="expense-row-main">
          <div class="expense-info">
            <span class="expense-title">${escapeHtml(e.title)}</span>
            <span class="expense-split-hint">Split: ${escapeHtml(splitNames)}</span>
          </div>
          <div class="expense-right">
            <span class="expense-amount">${formatCurrency(e.amount, group.symbol)}</span>
            <span class="expense-paid-by">by ${escapeHtml(paidBy)}</span>
          </div>
        </div>
        <div class="expense-row-foot">
          <span class="expense-date">${formatDate(e.date)}</span>
          <button class="btn-text-danger js-delete-expense" data-id="${escapeHtml(e.id)}"
                  aria-label="Delete expense ${escapeHtml(e.title)}">Delete</button>
        </div>
      </div>
    `;
  },

  _showAddModal(group, svc, router) {
    const personOptions = group.people
      .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
      .join('');

    const splitCheckboxes = group.people.map(p => `
      <label class="checkbox-label">
        <input type="checkbox" name="split" value="${escapeHtml(p.id)}" checked>
        <span>${escapeHtml(p.name)}</span>
      </label>
    `).join('');

    Modal.show(`
      <div class="modal-header"><h2>Add Expense</h2></div>
      <form id="form-add-expense" class="modal-form">
        <div class="form-group">
          <label for="exp-title">Title</label>
          <input type="text" id="exp-title" placeholder="e.g. Dinner" required maxlength="80" autocomplete="off">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="exp-amount">Amount</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">${escapeHtml(group.symbol)}</span>
              <input type="number" id="exp-amount" min="0.01" step="0.01" placeholder="0.00" required>
            </div>
          </div>
          <div class="form-group">
            <label for="exp-date">Date</label>
            <input type="date" id="exp-date" value="${today()}" required>
          </div>
        </div>
        <div class="form-group">
          <label for="exp-paid-by">Paid by</label>
          <select id="exp-paid-by" required>${personOptions}</select>
        </div>
        <div class="form-group">
          <label>Split between</label>
          <div class="checkbox-group" id="split-group">
            <button type="button" class="btn-text-sm js-check-all">Select all</button>
            ${splitCheckboxes}
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-expense">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Expense</button>
        </div>
      </form>
    `);

    document.getElementById('btn-cancel-expense').addEventListener('click', () => Modal.hide());

    document.querySelector('.js-check-all').addEventListener('click', () => {
      const boxes = document.querySelectorAll('#split-group input[type=checkbox]');
      const allChecked = [...boxes].every(b => b.checked);
      boxes.forEach(b => { b.checked = !allChecked; });
    });

    document.getElementById('form-add-expense').addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('exp-title').value;
      const amount = parseFloat(document.getElementById('exp-amount').value);
      const paidBy = document.getElementById('exp-paid-by').value;
      const date = document.getElementById('exp-date').value;
      const splitBetween = [...document.querySelectorAll('#split-group input:checked')].map(b => b.value);

      try {
        svc.addExpense(group.id, { title, amount, paidBy, date, splitBetween });
        Modal.hide();
        Toast.show('Expense added.', 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  },

  _bind(container, group, svc, router) {
    container.addEventListener('click', async e => {
      if (e.target.closest('#btn-add-expense')) {
        this._showAddModal(group, svc, router);
        return;
      }
      const del = e.target.closest('.js-delete-expense');
      if (del) {
        const expId = del.dataset.id;
        const exp = group.expenses.find(x => x.id === expId);
        const ok = await Modal.confirm(
          `Delete expense <strong>${escapeHtml(exp?.title ?? '')}</strong>?`, true
        );
        if (ok) {
          svc.deleteExpense(group.id, expId);
          Toast.show('Expense deleted.', 'info');
        }
      }
    });
  },
};
