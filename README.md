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

## v8 Initial Payment Status
- New customers can be marked Paid upon activation or Unpaid.
- Paid upon activation records an activation-date payment in Payments and Ledger.
- The activation payment reduces the activation bill so it is not carried as unpaid balance.
- Unpaid keeps the activation bill in the running balance.
- Recurring monthly billing continues on the customer's activation-day cycle.

## v9 Clean Activation Ledger
- Paid-upon-activation customers now get ONE activation ledger entry.
- The entry shows both Charge and Payment on the same card.
- Running balance after a paid activation is zero.
- The separate same-date Initial Bill card is removed for new customers.
- July/August and future recurring monthly bills remain separate ledger entries.

## v10 Activation Ledger Fix
- Fixed the duplicate activation ledger entry for customers marked Paid upon activation.
- Paid upon activation now creates only one combined activation transaction.
- Unpaid upon activation still creates one initial bill entry.
- Existing recurring monthly billing remains unchanged.

## v11 Paid Activation Deduplication
- Removes any separate Initial monthly bill when a same-date Activation Bill (Paid) exists.
- Cleanup also runs at startup, so duplicate activation entries created by earlier v10 tests are cleaned from the ledger.
- July/August recurring bills are preserved.
- Customer running balance is not reduced a second time.

## v12 Cache + Ledger Fix
- Forces GitHub Pages/browser to load the new app.js and style.css using cache-busting query strings.
- Duplicate paid-activation initial bills are cleaned on every render.
- Customer deletion now also removes that customer's payment and ledger history.
- Existing recurring July/August bills remain intact.

## v14 Monthly Collection Reports
- Collection History per Month
- Year filter
- Downloadable CSV report for Excel/Google Sheets
- Counts all actual payments, including activation payments
- Overdue customer list
- Keeps Paid, Unpaid, and Overdue as separate account classifications

## v15 Monthly and Yearly Backtracking Reports
- Report Type selector: Monthly or Yearly
- Monthly: choose a specific year and month
- Monthly CSV includes individual payment transactions and monthly totals
- Yearly: choose a year and download January-December summary
- Designed for historical/backtracking collection reports

## v16 Formatted Excel Reports
- Replaced plain CSV export with formatted Excel-compatible .xls export
- Monthly report has wider columns, borders, title/header styling, payment details and total collected
- Yearly report has January-December summary, payment counts and annual total
- Designed to open cleanly in Excel/WPS and be easier to print or export to PDF

## v17 Professional XLSX Reports
- True .xlsx export instead of HTML-based .xls
- Fixed readable date values (no Excel serial dates)
- Wider columns for Receipt No., Customer, Account No., Reference, and Amount
- Peso currency formatting
- Monthly report: individual payment transactions and total collected
- Yearly report: January-December collection summary
- Separate worksheet name based on selected reporting period
- Cleaner print/export layout for Excel and WPS Office

## v19 Downloadable Payment Receipt
- Print Receipt replaced by Download Receipt
- Receipt downloads as PNG for easy sending by email or messaging/social apps
- Added required Issued / Processed By on every new payment
- Issued / Processed By is saved in payment history and shown on the receipt
- Existing Billing, Ledger, Monthly/Yearly Reports and XLSX reports retained

## v20 Audit-Ready Collection Reports
- Monthly report now includes Issued / Processed By for every payment
- Monthly XLSX includes a separate Collector Audit worksheet
- Yearly XLSX includes detailed Payment Audit worksheet
- Yearly XLSX includes Collector Summary with payment count and total collected per staff/collector
- Supports audit, reconciliation, inventory, and collection accountability

## v21 Final Receipt + Audit Layout
- Payment form uses required Collected By
- Receipt shows Payment Received By
- Receipt uses Download Receipt instead of Print
- Monthly XLSX detailed columns: Date, Receipt No., Client, Account No., Reference, Amount, Collected By
- Yearly Payment Audit uses the exact same detailed column order
- Collected By is always the last detailed column
- Monthly Collector Audit and Yearly Collector Summary retained

## v22 Complete Audit Reports
- Monthly and yearly detailed payment reports now include Outstanding Balance after each payment
- Detailed columns: Date, Receipt No., Client, Account No., Reference, Amount Paid, Outstanding Balance, Collected By
- Collected By remains the last column
- Monthly and yearly workbooks include a separate Current Outstanding Balances sheet
- Outstanding Balances sheet includes Account No., Client, Status, Due Date, and current outstanding balance
- Collector Audit/Summary retained
- Downloadable receipt and Payment Received By retained
