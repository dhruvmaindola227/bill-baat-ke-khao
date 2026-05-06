import StorageService from './StorageService.js';
import { createGroup, createPerson, createExpense } from './models.js';
import EventBus from './utils/EventBus.js';
import { round2 } from './utils/helpers.js';

const AppService = {
  _data: null,

  init() {
    this._data = StorageService.load();
  },

  _save() {
    StorageService.save(this._data);
    EventBus.emit('data:changed', this._data);
  },

  // ── Groups ───────────────────────────────────────────────────────────────

  getGroups() {
    return this._data.groups;
  },

  getGroup(id) {
    return this._data.groups.find(g => g.id === id) ?? null;
  },

  createGroup(params) {
    const trimmed = params.name.trim();
    if (this._data.groups.some(g => g.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`A group named "${trimmed}" already exists.`);
    }
    const group = createGroup({ ...params, name: trimmed });
    this._data.groups.unshift(group);
    this._save();
    return group;
  },

  updateGroup(id, { name }) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Group name cannot be empty.');
    const duplicate = this._data.groups.find(
      g => g.id !== id && g.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) throw new Error(`A group named "${trimmed}" already exists.`);
    const group = this.getGroup(id);
    if (!group) throw new Error('Group not found.');
    group.name = trimmed;
    this._save();
  },

  deleteGroup(id) {
    this._data.groups = this._data.groups.filter(g => g.id !== id);
    this._save();
  },

  // ── People ───────────────────────────────────────────────────────────────

  addPerson(groupId, name) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('Group not found.');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name cannot be empty.');
    if (group.people.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`"${trimmed}" is already in this group.`);
    }
    const person = createPerson({ name: trimmed });
    group.people.push(person);
    this._save();
    return person;
  },

  updatePerson(groupId, personId, name) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('Group not found.');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name cannot be empty.');
    const duplicate = group.people.find(
      p => p.id !== personId && p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) throw new Error(`"${trimmed}" is already in this group.`);
    const person = group.people.find(p => p.id === personId);
    if (!person) throw new Error('Person not found.');
    person.name = trimmed;
    this._save();
  },

  removePerson(groupId, personId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('Group not found.');
    const inUse = group.expenses.some(
      e => e.paidBy === personId || e.splitBetween.includes(personId)
    );
    if (inUse) throw new Error('Cannot remove a person who has expenses. Delete their expenses first.');
    group.people = group.people.filter(p => p.id !== personId);
    this._save();
  },

  // ── Expenses ─────────────────────────────────────────────────────────────

  addExpense(groupId, params) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('Group not found.');
    if (params.splitBetween.length === 0) throw new Error('Select at least one person to split with.');
    if (params.amount <= 0) throw new Error('Amount must be greater than 0.');
    const expense = createExpense(params);
    group.expenses.push(expense);
    this._save();
    return expense;
  },

  updateExpense(groupId, expenseId, params) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('Group not found.');
    if (params.splitBetween.length === 0) throw new Error('Select at least one person to split with.');
    if (params.amount <= 0) throw new Error('Amount must be greater than 0.');
    const expense = group.expenses.find(e => e.id === expenseId);
    if (!expense) throw new Error('Expense not found.');
    expense.title = params.title.trim();
    expense.amount = parseFloat(params.amount);
    expense.paidBy = params.paidBy;
    expense.date = params.date;
    expense.splitBetween = [...params.splitBetween];
    this._save();
  },

  deleteExpense(groupId, expenseId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('Group not found.');
    group.expenses = group.expenses.filter(e => e.id !== expenseId);
    this._save();
  },

  // ── Settlement Algorithm ─────────────────────────────────────────────────

  /**
   * Returns { balances: Map<personId, number>, transactions: Array }
   * Positive balance = others owe this person.
   * Negative balance = this person owes others.
   * Uses greedy algorithm to minimise number of transactions.
   */
  calculateSettlement(group) {
    const balances = new Map(group.people.map(p => [p.id, 0]));

    for (const expense of group.expenses) {
      const share = expense.amount / expense.splitBetween.length;
      balances.set(expense.paidBy, round2((balances.get(expense.paidBy) ?? 0) + expense.amount));
      for (const pid of expense.splitBetween) {
        balances.set(pid, round2((balances.get(pid) ?? 0) - share));
      }
    }

    const personMap = new Map(group.people.map(p => [p.id, p]));
    const creditors = [];
    const debtors = [];

    for (const [id, bal] of balances) {
      if (bal > 0.01) creditors.push({ id, amount: bal });
      else if (bal < -0.01) debtors.push({ id, amount: -bal });
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    while (creditors.length && debtors.length) {
      const c = creditors[0];
      const d = debtors[0];
      const amount = round2(Math.min(c.amount, d.amount));

      transactions.push({
        from: d.id,
        fromName: personMap.get(d.id)?.name ?? 'Unknown',
        to: c.id,
        toName: personMap.get(c.id)?.name ?? 'Unknown',
        amount,
      });

      c.amount = round2(c.amount - amount);
      d.amount = round2(d.amount - amount);
      if (c.amount < 0.01) creditors.shift();
      if (d.amount < 0.01) debtors.shift();
    }

    return { balances, transactions };
  },

  // ── Import / Export ───────────────────────────────────────────────────────

  exportData() {
    StorageService.exportJSON();
  },

  importData(jsonString) {
    const data = StorageService.importJSON(jsonString);
    this._data = data;
    EventBus.emit('data:changed', this._data);
  },
};

export default AppService;
