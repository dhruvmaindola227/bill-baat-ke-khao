import { generateId } from './utils/helpers.js';

export function createGroup({ name, currency, symbol }) {
  return {
    id: generateId('g'),
    name: name.trim(),
    currency,
    symbol,
    createdAt: new Date().toISOString(),
    people: [],
    expenses: [],
  };
}

export function createPerson({ name }) {
  return {
    id: generateId('p'),
    name: name.trim(),
  };
}

export function createExpense({ title, amount, paidBy, date, splitBetween }) {
  return {
    id: generateId('e'),
    title: title.trim(),
    amount: parseFloat(amount),
    paidBy,
    date,
    createdAt: new Date().toISOString(),
    splitBetween: [...splitBetween],
  };
}
