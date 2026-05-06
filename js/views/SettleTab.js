import { escapeHtml, formatCurrency } from '../utils/helpers.js';

export const SettleTab = {
  mount(container, group, svc) {
    container.innerHTML = this._getHTML(group, svc);
  },

  _getHTML(group, svc) {
    if (group.people.length < 2) {
      return `<div class="empty-state empty-state-sm"><p>Add at least 2 people to see settlements.</p></div>`;
    }
    if (group.expenses.length === 0) {
      return `<div class="empty-state empty-state-sm"><p>No expenses yet. Add some to see who owes what.</p></div>`;
    }

    const { balances, transactions } = svc.calculateSettlement(group);
    const personMap = new Map(group.people.map(p => [p.id, p.name]));

    const balanceCards = group.people.map(p => {
      const bal = balances.get(p.id) ?? 0;
      const rounded = Math.round(bal * 100) / 100;
      let cls, label;
      if (rounded > 0.01) {
        cls = 'balance-positive';
        label = `gets back ${formatCurrency(rounded, group.symbol)}`;
      } else if (rounded < -0.01) {
        cls = 'balance-negative';
        label = `owes ${formatCurrency(-rounded, group.symbol)}`;
      } else {
        cls = 'balance-zero';
        label = 'settled up';
      }
      return `
        <div class="balance-card ${cls}">
          <span class="balance-name">${escapeHtml(p.name)}</span>
          <span class="balance-label">${label}</span>
          <span class="balance-amount ${cls}">${rounded >= 0 ? '+' : ''}${formatCurrency(rounded, group.symbol)}</span>
        </div>
      `;
    }).join('');

    const paymentRows = transactions.length === 0
      ? `<p class="settled-message">Everyone is settled up!</p>`
      : transactions.map(t => `
          <div class="payment-row">
            <span class="payment-from">${escapeHtml(t.fromName)}</span>
            <span class="payment-arrow">→</span>
            <span class="payment-to">${escapeHtml(t.toName)}</span>
            <span class="payment-amount">${formatCurrency(t.amount, group.symbol)}</span>
          </div>
        `).join('');

    return `
      <div class="tab-panel-inner">
        <section class="settle-section">
          <h3 class="settle-section-title">Balances</h3>
          <div class="balance-grid">${balanceCards}</div>
        </section>
        <section class="settle-section">
          <h3 class="settle-section-title">Suggested Payments</h3>
          <div class="payments-list">${paymentRows}</div>
        </section>
      </div>
    `;
  },
};
