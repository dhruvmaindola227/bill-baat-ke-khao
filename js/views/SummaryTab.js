import { escapeHtml, formatCurrency, formatDate, formatDateTime, round2 } from '../utils/helpers.js';

export const SummaryTab = {
  _controller: null,

  mount(container, group, svc) {
    this._controller?.abort();
    this._controller = new AbortController();
    container.innerHTML = this._getHTML(group, svc);
    this._bind(container, group, this._controller.signal);
  },

  _getHTML(group, svc) {
    if (group.expenses.length === 0) {
      return `<div class="empty-state empty-state-sm"><p>No expenses to summarise yet.</p></div>`;
    }

    const sorted = [...group.expenses].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });

    const personMap = new Map(group.people.map(p => [p.id, p.name]));
    const { transactions } = svc.calculateSettlement(group);

    // Build person-column totals (running share total)
    const personTotals = new Map(group.people.map(p => [p.id, 0]));

    const dataRows = sorted.map(e => {
      const paidByName = personMap.get(e.paidBy) ?? 'Unknown';
      const cells = group.people.map(p => {
        const isInSplit = e.splitBetween.includes(p.id);
        if (!isInSplit) return `<td class="num-cell text-muted">—</td>`;
        const share = round2(e.amount / e.splitBetween.length);
        personTotals.set(p.id, round2((personTotals.get(p.id) ?? 0) + share));
        return `<td class="num-cell amount-negative">${formatCurrency(share, group.symbol)}</td>`;
      }).join('');

      return `
        <tr>
          <td class="title-cell">${escapeHtml(e.title)}</td>
          <td class="num-cell amount-bold">${formatCurrency(e.amount, group.symbol)}</td>
          <td class="text-cell">${escapeHtml(paidByName)}</td>
          <td class="date-cell">${formatDate(e.date)}</td>
          <td class="date-cell text-muted">${formatDateTime(e.createdAt)}</td>
          ${cells}
        </tr>
      `;
    }).join('');

    const totalRow = (() => {
      const grandTotal = group.expenses.reduce((s, e) => s + e.amount, 0);
      const personCells = group.people.map(p =>
        `<td class="num-cell amount-negative amount-bold">${formatCurrency(personTotals.get(p.id) ?? 0, group.symbol)}</td>`
      ).join('');
      return `
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="num-cell amount-bold">${formatCurrency(grandTotal, group.symbol)}</td>
          <td></td><td></td><td></td>
          ${personCells}
        </tr>
      `;
    })();

    const personHeaders = group.people.map(p =>
      `<th class="num-cell">${escapeHtml(p.name)}</th>`
    ).join('');

    const paymentRows = transactions.length === 0
      ? `<tr><td colspan="3" class="settled-cell">Everyone is settled up!</td></tr>`
      : transactions.map(t => `
          <tr>
            <td>${escapeHtml(t.fromName)}</td>
            <td class="arrow-cell">→</td>
            <td>${escapeHtml(t.toName)}</td>
            <td class="num-cell amount-bold">${formatCurrency(t.amount, group.symbol)}</td>
          </tr>
        `).join('');

    return `
      <div class="tab-panel-inner summary-panel">
        <div class="summary-toolbar">
          <h3 class="settle-section-title">All Expenses</h3>
          <button class="btn btn-ghost btn-sm" id="btn-export-csv">Download CSV</button>
        </div>
        <div class="table-scroll-wrap">
          <table class="summary-table">
            <thead>
              <tr>
                <th class="title-cell">Title</th>
                <th class="num-cell">Amount</th>
                <th class="text-cell">Paid By</th>
                <th class="date-cell">Expense Date</th>
                <th class="date-cell">Added On</th>
                ${personHeaders}
              </tr>
            </thead>
            <tbody>
              ${dataRows}
              ${totalRow}
            </tbody>
          </table>
        </div>

        <section class="settle-section">
          <h3 class="settle-section-title">Suggested Payments</h3>
          <div class="table-scroll-wrap">
            <table class="payment-table">
              <thead><tr><th>From</th><th></th><th>To</th><th class="num-cell">Amount</th></tr></thead>
              <tbody>${paymentRows}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  },

  _bind(container, group, signal) {
    container.querySelector('#btn-export-csv')
      ?.addEventListener('click', () => this._downloadCSV(group), { signal });
  },

  _downloadCSV(group) {
    const personMap = new Map(group.people.map(p => [p.id, p.name]));
    const sorted = [...group.expenses].sort((a, b) =>
      b.date !== a.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt)
    );

    const headers = ['Title', 'Amount', 'Paid By', 'Date', 'Added On',
      ...group.people.map(p => p.name)];

    const rows = sorted.map(e => {
      const share = round2(e.amount / e.splitBetween.length);
      const personCols = group.people.map(p =>
        e.splitBetween.includes(p.id) ? share : ''
      );
      return [
        e.title, e.amount, personMap.get(e.paidBy) ?? '',
        formatDate(e.date), formatDateTime(e.createdAt),
        ...personCols,
      ];
    });

    const csv = [headers, ...rows].map(row =>
      row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group.name}-summary.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
