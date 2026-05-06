import { escapeHtml, formatCurrency, formatDate, today } from '../utils/helpers.js';
import Modal from '../utils/Modal.js';
import Toast from '../utils/Toast.js';

export const ExpensesTab = {
  _controller: null,

  mount(container, group, svc, router) {
    this._controller?.abort();
    this._controller = new AbortController();
    container.innerHTML = this._getHTML(group);
    this._bind(container, group, svc, router, this._controller.signal);
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
          <div class="expense-actions">
            <button class="btn-text-primary js-edit-expense" data-id="${escapeHtml(e.id)}"
                    aria-label="Edit expense ${escapeHtml(e.title)}">Edit</button>
            <button class="btn-text-danger js-delete-expense" data-id="${escapeHtml(e.id)}"
                    aria-label="Delete expense ${escapeHtml(e.title)}">Delete</button>
          </div>
        </div>
      </div>
    `;
  },

  // ── Shared expense form ───────────────────────────────────────────────────

  _buildFormHTML(group, expense = null) {
    const isEdit = expense !== null;
    const personOptions = group.people.map(p =>
      `<option value="${escapeHtml(p.id)}"
               ${isEdit && expense.paidBy === p.id ? 'selected' : ''}
               >${escapeHtml(p.name)}</option>`
    ).join('');

    const splitCheckboxes = group.people.map(p => {
      const checked = !isEdit || expense.splitBetween.includes(p.id);
      return `
        <label class="checkbox-label">
          <input type="checkbox" name="split" value="${escapeHtml(p.id)}" ${checked ? 'checked' : ''}>
          <span>${escapeHtml(p.name)}</span>
        </label>
      `;
    }).join('');

    return `
      <div class="modal-header">
        <h2>${isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
      </div>
      <form id="form-expense" class="modal-form">
        <div class="form-group">
          <label for="exp-title">Title</label>
          <input type="text" id="exp-title" placeholder="e.g. Dinner"
                 required maxlength="80" autocomplete="off"
                 value="${isEdit ? escapeHtml(expense.title) : ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="exp-amount">Amount</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">${escapeHtml(group.symbol)}</span>
              <input type="number" id="exp-amount" min="0.01" step="0.01"
                     placeholder="0.00" required
                     value="${isEdit ? expense.amount : ''}">
            </div>
          </div>
          <div class="form-group">
            <label for="exp-date">Date</label>
            <input type="date" id="exp-date"
                   value="${isEdit ? expense.date : today()}" required>
          </div>
        </div>
        <div class="form-group">
          <label for="exp-paid-by">Paid by</label>
          <select id="exp-paid-by" required>${personOptions}</select>
        </div>
        <div class="form-group">
          <label>Split between</label>
          <div class="checkbox-group" id="split-group">
            <button type="button" class="btn-text-sm js-check-all">Toggle all</button>
            ${splitCheckboxes}
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-expense">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Expense'}</button>
        </div>
      </form>
    `;
  },

  _openExpenseModal(group, svc, expense = null) {
    const isEdit = expense !== null;
    Modal.show(this._buildFormHTML(group, expense));

    document.getElementById('btn-cancel-expense').addEventListener('click', () => Modal.hide());

    document.querySelector('.js-check-all').addEventListener('click', () => {
      const boxes = document.querySelectorAll('#split-group input[type=checkbox]');
      const allChecked = [...boxes].every(b => b.checked);
      boxes.forEach(b => { b.checked = !allChecked; });
    });

    document.getElementById('form-expense').addEventListener('submit', e => {
      e.preventDefault();
      const params = {
        title:        document.getElementById('exp-title').value,
        amount:       parseFloat(document.getElementById('exp-amount').value),
        paidBy:       document.getElementById('exp-paid-by').value,
        date:         document.getElementById('exp-date').value,
        splitBetween: [...document.querySelectorAll('#split-group input:checked')].map(b => b.value),
      };

      try {
        if (isEdit) {
          svc.updateExpense(group.id, expense.id, params);
          Toast.show('Expense updated.', 'success');
        } else {
          svc.addExpense(group.id, params);
          Toast.show('Expense added.', 'success');
        }
        Modal.hide();
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  },

  // ── Event binding ─────────────────────────────────────────────────────────

  _bind(container, group, svc, router, signal) {
    container.addEventListener('click', async e => {
      if (e.target.closest('#btn-add-expense')) {
        this._openExpenseModal(group, svc, null);
        return;
      }

      const editBtn = e.target.closest('.js-edit-expense');
      if (editBtn) {
        const exp = group.expenses.find(x => x.id === editBtn.dataset.id);
        if (exp) this._openExpenseModal(group, svc, exp);
        return;
      }

      const delBtn = e.target.closest('.js-delete-expense');
      if (delBtn) {
        const exp = group.expenses.find(x => x.id === delBtn.dataset.id);
        const ok = await Modal.confirm(
          `Delete expense <strong>${escapeHtml(exp?.title ?? '')}</strong>?`, true
        );
        if (ok) {
          svc.deleteExpense(group.id, delBtn.dataset.id);
          Toast.show('Expense deleted.', 'info');
        }
      }
    }, { signal });
  },
};
