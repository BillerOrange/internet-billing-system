# Internet Billing System v2

A browser-based Internet Billing Management System using HTML, CSS, and JavaScript.

## Features
- Dashboard overview
- Customer account number
- Customer name, address, and contact
- Internet plan and monthly rate
- Activation date and billing due date
- Create/update monthly bill
- Automatic Paid / Unpaid / Overdue status
- Current balance tracking
- Record customer payments
- Payment history
- Receipt number generation
- Printable payment receipt
- Search and status filter
- Reports and receivables summary
- LocalStorage data persistence

## How to Run
1. Extract the ZIP.
2. Open `index.html` in a browser.

## GitHub Pages
Upload these files to the root of your GitHub repository:
- index.html
- style.css
- app.js
- README.md

GitHub Pages can then publish the site directly from the `main` branch and `/(root)` folder.


## v3 Update
- More compact mobile navigation
- Improved mobile dashboard spacing
- Two-column mobile metric cards
- Better phone-friendly forms and typography

## v4 Update
- Customer ledger
- Previous balance carried forward
- Monthly bill charges added to existing balance
- Payment transactions recorded in ledger
- Running balance per customer
- Receipt/reference tracking in ledger

## v5 Fix
- Fixed blank customer dropdown in Ledger
- Ledger automatically selects a customer
- Fixed customer/account/balance summary
- Rebuilt Ledger transactions as mobile-friendly cards on phones

## v6 Ledger Migration
- Automatically reconstructs ledger history for existing customers.
- Existing payment records are preserved.
- Existing balances are not changed.
- Migration runs once per browser/device.
- Future bills and payments continue to record directly to the ledger.

## v7 Automatic Monthly Billing
- Monthly charge is generated automatically from the customer's activation-date cycle.
- First recurring charge is one month after activation.
- Missed months are caught up automatically when the system opens.
- Each billing cycle has a unique ledger reference so refreshing the page will not duplicate a bill.
- Monthly charges are added to any unpaid previous balance.
- Automatic charges appear in the customer ledger.
