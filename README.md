# Bill Baat Ke Khao

A lightweight, offline expense-splitting web app — no backend, no sign-up, all data stored in your browser.

**Live:** https://dhruvmaindola227.github.io/bill-baat-ke-khao/

---

## Features

### Groups
- Create multiple groups (e.g. Goa Trip, Flat Expenses)
- Each group has its own currency (INR, USD, EUR, GBP, and more)
- Rename or delete groups at any time
- Duplicate group names are rejected (case-insensitive)

### People
- Add people to a group by name only — no accounts needed
- Rename or remove people (removal blocked if they have active expenses)
- Duplicate names within a group are rejected

### Expenses
- Add expenses with title, amount, date, who paid, and who to split between
- Edit any existing expense — change the amount, payer, split members, or date
- Delete expenses with a confirmation prompt
- "Toggle all" shortcut to quickly select/deselect everyone in the split

### Settle Up
- **Balance cards** — each person's net position (gets back / owes / settled)
- **Pending Payments** — minimum number of transactions needed to settle all debts (greedy algorithm)
- **Mark as Paid** — move a pending payment to the settled list with one tap
- **15-second undo** — a snackbar lets you reverse a settlement immediately after marking it
- **Settled Payments** — running history of all recorded payments

### Summary
- Full expense table with per-person share breakdown
- Grand total row
- Suggested payments table (same as Settle Up)
- **Download CSV** — export the full expense table as a spreadsheet

### Data & Backup
- All data stored in browser `localStorage` — works completely offline
- **Export** — download a full JSON backup of all groups and expenses
- **Import** — restore from a previously exported backup file

---

## Tech

Pure HTML + CSS + JavaScript (ES6 modules). No frameworks, no build step, no dependencies.
