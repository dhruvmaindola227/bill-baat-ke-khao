import { escapeHtml, formatCurrency, formatDateTime } from '../utils/helpers.js';
import Snackbar from '../utils/Snackbar.js';

export const SettleTab = {
  mount(container, group, svc) {
    container.innerHTML = this._getHTML(group, svc);
    this._bind(container, group, svc);
  },

  _getHTML(group, svc) {
    if (group.people.length < 2) {
      return `<div class="empty-state empty-state-sm"><p>Add at least 2 people to see settlements.</p></div>`;
    }
    if (group.expenses.length === 0) {
      return `<div class="empty-state empty-state-sm"><p>No expenses yet. Add some to see who owes what.</p></div>`;
    }

    const { balances, transactions } = svc.calculateSettlement(group);
    const settlements = group.settlements ?? [];

    return `
      <div class="tab-panel-inner">
        ${this._balanceSection(group, balances)}
        ${this._pendingSection(transactions, group)}
        ${settlements.length > 0 ? this._settledSection(settlements, group) : ''}
      </div>
    `;
  },

  _balanceSection(group, balances) {
    const cards = group.people.map(p => {
      const bal = Math.round((balances.get(p.id) ?? 0) * 100) / 100;
      let cls, label, amtStr;
      if (bal > 0.01) {
        cls = 'balance-positive';
        label = 'gets back';
        amtStr = `+${formatCurrency(bal, group.symbol)}`;
      } else if (bal < -0.01) {
        cls = 'balance-negative';
        label = 'owes';
        amtStr = formatCurrency(-bal, group.symbol);
      } else {
        cls = 'balance-zero';
        label = 'settled up';
        amtStr = formatCurrency(0, group.symbol);
      }
      return `
        <div class="balance-card ${cls}">
          <span class="balance-name">${escapeHtml(p.name)}</span>
          <span class="balance-label">${label}</span>
          <span class="balance-amount ${cls}">${escapeHtml(amtStr)}</span>
        </div>
      `;
    }).join('');

    return `
      <section class="settle-section">
        <h3 class="settle-section-title">Balances</h3>
        <div class="balance-grid">${cards}</div>
      </section>
    `;
  },

  _pendingSection(transactions, group) {
    const rows = transactions.length === 0
      ? `<p class="settled-message">All payments settled up!</p>`
      : transactions.map(t => `
          <div class="payment-row payment-pending" data-from="${escapeHtml(t.from)}"
               data-to="${escapeHtml(t.to)}" data-amount="${t.amount}"
               data-from-name="${escapeHtml(t.fromName)}" data-to-name="${escapeHtml(t.toName)}">
            <div class="payment-info">
              <span class="payment-from">${escapeHtml(t.fromName)}</span>
              <span class="payment-arrow">→</span>
              <span class="payment-to">${escapeHtml(t.toName)}</span>
            </div>
            <div class="payment-row-right">
              <span class="payment-amount">${formatCurrency(t.amount, group.symbol)}</span>
              <button class="btn btn-sm btn-settle js-mark-paid"
                      data-from="${escapeHtml(t.from)}"
                      data-to="${escapeHtml(t.to)}"
                      data-amount="${t.amount}"
                      data-from-name="${escapeHtml(t.fromName)}"
                      data-to-name="${escapeHtml(t.toName)}"
                      aria-label="Mark ${escapeHtml(t.fromName)} paid ${escapeHtml(t.toName)}">
                ✓ Mark as Paid
              </button>
            </div>
          </div>
        `).join('');

    return `
      <section class="settle-section">
        <h3 class="settle-section-title">Pending Payments</h3>
        <div class="payments-list">${rows}</div>
      </section>
    `;
  },

  _settledSection(settlements, group) {
    const rows = [...settlements].reverse().map(s => `
      <div class="payment-row payment-settled">
        <div class="payment-info">
          <span class="settled-check">✓</span>
          <span class="payment-from payment-settled-name">${escapeHtml(s.fromName)}</span>
          <span class="payment-arrow">paid</span>
          <span class="payment-to payment-settled-name">${escapeHtml(s.toName)}</span>
        </div>
        <div class="payment-row-right">
          <span class="payment-amount payment-settled-amount">${formatCurrency(s.amount, group.symbol)}</span>
          <span class="settled-date">${formatDateTime(s.settledAt)}</span>
        </div>
      </div>
    `).join('');

    return `
      <section class="settle-section">
        <h3 class="settle-section-title">Settled Payments</h3>
        <div class="payments-list">${rows}</div>
      </section>
    `;
  },

  _bind(container, group, svc) {
    container.addEventListener('click', e => {
      const btn = e.target.closest('.js-mark-paid');
      if (!btn) return;

      const { from, to, amount, fromName, toName } = btn.dataset;
      const parsedAmount = parseFloat(amount);

      const settlement = svc.recordSettlement(group.id, {
        from, fromName, to, toName, amount: parsedAmount,
      });

      Snackbar.show(
        `${escapeHtml(fromName)} paid ${escapeHtml(toName)} ${formatCurrency(parsedAmount, group.symbol)}`,
        () => svc.undoSettlement(group.id, settlement.id)
      );
    });
  },
};
