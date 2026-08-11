const seedCustomers = [
  {
    id: 1,
    accountNo: 'NB-0001',
    name: 'Juan Dela Cruz',
    address: 'Sample Address',
    contact: '09170000001',
    plan: '50 Mbps',
    fee: 999,
    activationDate: '2026-08-01',
    dueDate: '2026-08-15',
    currentBill: 999,
    balance: 999
  },
  {
    id: 2,
    accountNo: 'NB-0002',
    name: 'Maria Santos',
    address: 'Sample Address',
    contact: '09170000002',
    plan: '100 Mbps',
    fee: 1499,
    activationDate: '2026-08-01',
    dueDate: '2026-08-10',
    currentBill: 1499,
    balance: 0
  }
];

let customers = JSON.parse(localStorage.getItem('nb_customers') || 'null') || seedCustomers;
let payments = JSON.parse(localStorage.getItem('nb_payments') || '[]');
let ledgerEntries = JSON.parse(localStorage.getItem('nb_ledger') || '[]');
let editingCustomerId = null;

const $ = id => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);
const money = value => '₱' + Number(value || 0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

function saveData(){
  localStorage.setItem('nb_customers', JSON.stringify(customers));
  localStorage.setItem('nb_payments', JSON.stringify(payments));
  localStorage.setItem('nb_ledger', JSON.stringify(ledgerEntries));
}

function getStatus(c){
  if(Number(c.balance) <= 0) return 'Paid';
  if(c.dueDate && c.dueDate < todayISO()) return 'Overdue';
  return 'Unpaid';
}

function statusBadge(status){
  return `<span class="status ${status.toLowerCase()}">${status}</span>`;
}

function nextAccountNo(){
  const nums = customers.map(c => Number(String(c.accountNo || '').replace(/\D/g,'')) || 0);
  const next = Math.max(0, ...nums) + 1;
  return 'NB-' + String(next).padStart(4,'0');
}

function nextReceiptNo(){
  return 'RCPT-' + String(payments.length + 1).padStart(5,'0');
}

function renderDashboard(){
  const totalCollected = payments.reduce((sum,p)=>sum + Number(p.amount || 0),0);
  const outstanding = customers.reduce((sum,c)=>sum + Math.max(0,Number(c.balance || 0)),0);

  $('totalCustomers').textContent = customers.length;
  $('activeCustomers').textContent = customers.length;
  $('unpaidCustomers').textContent = customers.filter(c => getStatus(c) !== 'Paid').length;
  $('totalCollected').textContent = money(totalCollected);
  $('outstandingBalance').textContent = money(outstanding);

  $('recentCustomerTable').innerHTML = customers.slice(-5).reverse().map(c => `
    <tr>
      <td>${c.accountNo}</td>
      <td>${c.name}</td>
      <td>${c.plan}</td>
      <td>${money(c.balance)}</td>
      <td>${statusBadge(getStatus(c))}</td>
    </tr>
  `).join('') || `<tr><td colspan="5">No customer records yet.</td></tr>`;
}

function renderCustomers(){
  const q = ($('customerSearch').value || '').toLowerCase().trim();
  const f = $('statusFilter').value;
  const filtered = customers.filter(c => {
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || String(c.accountNo).toLowerCase().includes(q);
    const matchesStatus = !f || getStatus(c) === f;
    return matchesSearch && matchesStatus;
  });

  $('customerTable').innerHTML = filtered.map(c => `
    <tr>
      <td>${c.accountNo}</td>
      <td><strong>${c.name}</strong><br><small>${c.address || ''}</small></td>
      <td>${c.contact || '-'}</td>
      <td>${c.plan}</td>
      <td>${money(c.fee)}</td>
      <td>${c.dueDate || '-'}</td>
      <td>${money(c.balance)}</td>
      <td>${statusBadge(getStatus(c))}</td>
      <td>
        <div class="action-group">
          <button class="small-btn" onclick="editCustomer(${c.id})">Edit</button>
          <button class="small-btn danger" onclick="deleteCustomer(${c.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="9">No matching customers.</td></tr>`;
}

function renderBilling(){
  $('billingTable').innerHTML = customers.map(c => `
    <tr>
      <td>${c.accountNo}</td>
      <td>${c.name}</td>
      <td>${money(c.currentBill || 0)}</td>
      <td>${money(c.balance || 0)}</td>
      <td>${c.dueDate || '-'}</td>
      <td>${statusBadge(getStatus(c))}</td>
    </tr>
  `).join('') || `<tr><td colspan="6">No customer records yet.</td></tr>`;
}

function renderPayments(){
  $('paymentTable').innerHTML = payments.slice().reverse().map(p => {
    const c = customers.find(x => x.id === p.customerId);
    return `
      <tr>
        <td>${p.date}</td>
        <td>${p.receiptNo}</td>
        <td>${c ? c.name : p.customerName}</td>
        <td>${money(p.amount)}</td>
        <td>${p.reference || '-'}</td>
        <td>${money(p.balanceAfter)}</td>
        <td><button class="small-btn" onclick="showReceipt('${p.receiptNo}')">View</button></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="7">No payments recorded yet.</td></tr>`;
}


function addLedgerEntry(entry){
  ledgerEntries.push({
    id: Date.now() + Math.floor(Math.random()*1000),
    ...entry
  });
}


function migrateExistingLedgerData(){
  if(localStorage.getItem('nb_ledger_migrated_v6') === '1') return;

  customers.forEach(c => {
    const existing = ledgerEntries.filter(e => e.customerId === c.id);
    if(existing.length) return;

    const customerPayments = payments
      .filter(p => p.customerId === c.id)
      .sort((a,b) => String(a.date).localeCompare(String(b.date)));

    const totalPaid = customerPayments.reduce((sum,p) => sum + Number(p.amount || 0), 0);
    const currentBalance = Number(c.balance || 0);

    // Reconstruct the opening billed amount from current balance + recorded payments.
    const reconstructedBill = currentBalance + totalPaid;

    if(reconstructedBill > 0){
      let running = reconstructedBill;
      const openingDate = c.activationDate || customerPayments[0]?.date || todayISO();

      addLedgerEntry({
        customerId: c.id,
        date: openingDate,
        type: 'Bill',
        description: 'Existing account balance (migrated)',
        previousBalance: 0,
        charge: reconstructedBill,
        payment: 0,
        runningBalance: reconstructedBill,
        reference: c.dueDate ? `Due ${c.dueDate}` : 'Migrated'
      });

      customerPayments.forEach(p => {
        const previousBalance = running;
        const paid = Number(p.amount || 0);
        running = Math.max(0, running - paid);

        addLedgerEntry({
          customerId: c.id,
          date: p.date || todayISO(),
          type: 'Payment',
          description: `Payment ${p.receiptNo || ''}`.trim(),
          previousBalance,
          charge: 0,
          payment: paid,
          runningBalance: running,
          reference: p.reference || p.receiptNo || 'Migrated'
        });
      });
    }
  });

  localStorage.setItem('nb_ledger_migrated_v6', '1');
  saveData();
}


function parseLocalDate(iso){
  if(!iso) return null;
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m-1, d);
}

function toISODateLocal(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function addMonthsClamped(date, months){
  const originalDay = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth()+1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return target;
}


function recordInitialActivationPayment(customer, status){
  if(!customer || status !== 'paid') return;

  const amount = Number(customer.fee || 0);
  if(amount <= 0) return;

  const activationDate = customer.activationDate || todayISO();
  const paymentKey = `ACTIVATION-PAID-${customer.id}`;

  const alreadyRecorded = payments.some(p => p.reference === paymentKey) ||
    ledgerEntries.some(e => e.reference === paymentKey);
  if(alreadyRecorded) return;

  // The customer creation flow already creates the initial activation bill.
  // Remove that separate ledger card and replace it with one combined
  // "Activation Bill (Paid)" transaction.
  const initialIndex = ledgerEntries.findIndex(e =>
    e.customerId === customer.id &&
    e.date === activationDate &&
    e.type === 'Bill' &&
    (e.description === 'Initial monthly bill' || String(e.reference || '').startsWith('Due '))
  );

  if(initialIndex >= 0){
    ledgerEntries.splice(initialIndex, 1);
  }

  const previousBalance = Number(customer.balance || 0);
  const paymentAmount = Math.min(amount, previousBalance || amount);

  customer.balance = Math.max(0, previousBalance - paymentAmount);

  const receiptNo = `RCPT-${String(payments.length + 1).padStart(5,'0')}`;
  payments.push({
    id: Date.now() + Math.random(),
    customerId: customer.id,
    date: activationDate,
    amount: paymentAmount,
    reference: paymentKey,
    receiptNo
  });

  addLedgerEntry({
    customerId: customer.id,
    date: activationDate,
    type: 'Activation Bill (Paid)',
    description: 'Activation monthly bill paid upon activation',
    previousBalance: 0,
    charge: amount,
    payment: amount,
    runningBalance: 0,
    reference: paymentKey
  });

  // Final safety cleanup: for a paid activation, there must never be a
  // separate Initial monthly bill on the activation date.
  for(let i = ledgerEntries.length - 1; i >= 0; i--){
    const e = ledgerEntries[i];
    if(
      e.customerId === customer.id &&
      e.date === activationDate &&
      e.type === 'Bill' &&
      e.description === 'Initial monthly bill'
    ){
      ledgerEntries.splice(i, 1);
    }
  }
}


function cleanupPaidActivationDuplicates(){
  const paidKeys = new Set(
    ledgerEntries
      .filter(e =>
        String(e.type || '').toLowerCase().includes('activation') &&
        String(e.type || '').toLowerCase().includes('paid')
      )
      .map(e => `${e.customerId}|${e.date}`)
  );

  for(let i = ledgerEntries.length - 1; i >= 0; i--){
    const e = ledgerEntries[i];
    const key = `${e.customerId}|${e.date}`;
    const desc = String(e.description || '').trim().toLowerCase();
    const type = String(e.type || '').trim().toLowerCase();

    if(
      paidKeys.has(key) &&
      type === 'bill' &&
      (desc === 'initial monthly bill' || desc.includes('initial monthly'))
    ){
      ledgerEntries.splice(i, 1);
    }
  }
}

function runAutomaticMonthlyBilling(){
  const today = parseLocalDate(todayISO());
  if(!today) return;

  customers.forEach(c => {
    const activation = parseLocalDate(c.activationDate);
    if(!activation || Number(c.fee || 0) <= 0) return;

    // First recurring monthly bill is one month after activation.
    let cycleDate = addMonthsClamped(activation, 1);
    let safety = 0;

    while(cycleDate <= today && safety < 240){
      const cycleISO = toISODateLocal(cycleDate);
      const cycleKey = `AUTO-${c.id}-${cycleISO}`;

      const alreadyBilled = ledgerEntries.some(e =>
        e.customerId === c.id && e.reference === cycleKey
      );

      if(!alreadyBilled){
        const previousBalance = Number(c.balance || 0);
        const charge = Number(c.fee || 0);
        c.currentBill = charge;
        c.balance = previousBalance + charge;
        c.dueDate = cycleISO;

        addLedgerEntry({
          customerId: c.id,
          date: cycleISO,
          type: 'Bill',
          description: 'Automatic monthly internet bill',
          previousBalance,
          charge,
          payment: 0,
          runningBalance: c.balance,
          reference: cycleKey
        });
      }

      cycleDate = addMonthsClamped(cycleDate, 1);
      safety++;
    }
  });

  saveData();
}

function renderLedger(){
  const select = $('ledgerCustomer');
  if(!select) return;
  const customerId = Number(select.value || customers[0]?.id || 0);
  const c = customers.find(x=>x.id===customerId);

  if(!c){
    $('ledgerName').textContent = '-';
    $('ledgerAccount').textContent = '-';
    $('ledgerBalance').textContent = money(0);
    $('ledgerTable').innerHTML = `<tr><td colspan="8">No customer selected.</td></tr>`;
    return;
  }

  $('ledgerName').textContent = c.name;
  $('ledgerAccount').textContent = c.accountNo;
  $('ledgerBalance').textContent = money(c.balance);

  const entries = ledgerEntries
    .filter(e=>e.customerId===c.id)
    .sort((a,b)=> String(a.date).localeCompare(String(b.date)) || Number(a.id)-Number(b.id));

  $('ledgerTable').innerHTML = entries.map(e=>`
    <tr>
      <td>${e.date}</td>
      <td>${e.type}</td>
      <td>${e.description || '-'}</td>
      <td>${money(e.previousBalance)}</td>
      <td>${e.charge ? money(e.charge) : '-'}</td>
      <td>${e.payment ? money(e.payment) : '-'}</td>
      <td>${money(e.runningBalance)}</td>
      <td>${e.reference || '-'}</td>
    </tr>
  `).join('') || `<tr><td colspan="8">No ledger transactions yet.</td></tr>`;
}



function getPaymentYear(p){
  return String(p.date || '').slice(0,4);
}

const COLLECTION_MONTHS = [
  ['01','January'],['02','February'],['03','March'],['04','April'],
  ['05','May'],['06','June'],['07','July'],['08','August'],
  ['09','September'],['10','October'],['11','November'],['12','December']
];

function renderCollectionYearOptions(){
  const select = $('collectionYearFilter');
  if(!select) return;

  const years = [...new Set(
    payments.map(getPaymentYear).filter(y => /^\d{4}$/.test(y))
  )];

  const currentYear = String(new Date().getFullYear());
  if(!years.includes(currentYear)) years.push(currentYear);
  years.sort((a,b)=>Number(b)-Number(a));

  const previous = select.value;
  select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  if(previous && years.includes(previous)) select.value = previous;
  else select.value = currentYear;
}

function getSelectedCollectionPayments(){
  const type = $('collectionReportType')?.value || 'monthly';
  const year = $('collectionYearFilter')?.value || String(new Date().getFullYear());
  const month = $('collectionMonthFilter')?.value || String(new Date().getMonth()+1).padStart(2,'0');

  if(type === 'monthly'){
    return payments.filter(p => String(p.date || '').startsWith(`${year}-${month}`));
  }
  return payments.filter(p => String(p.date || '').startsWith(`${year}-`));
}

function renderCollectionReport(){
  const type = $('collectionReportType')?.value || 'monthly';
  const year = $('collectionYearFilter')?.value || String(new Date().getFullYear());
  const month = $('collectionMonthFilter')?.value || '01';
  const monthName = COLLECTION_MONTHS.find(([m])=>m===month)?.[1] || month;
  const table = $('monthlyCollectionTable');
  const head = $('collectionTableHead');
  const summary = $('collectionReportSummary');
  const monthLabel = $('collectionMonthLabel');

  if(!table || !head || !summary) return;

  if(monthLabel) monthLabel.style.display = type === 'monthly' ? '' : 'none';

  if(type === 'monthly'){
    const matched = getSelectedCollectionPayments().slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const total = matched.reduce((sum,p)=>sum + Number(p.amount || 0),0);

    summary.innerHTML = `
      <div class="summary-item"><span>Period</span><strong>${monthName} ${year}</strong></div>
      <div class="summary-item"><span>No. of Payments</span><strong>${matched.length}</strong></div>
      <div class="summary-item"><span>Total Collected</span><strong>${money(total)}</strong></div>
    `;

    head.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Receipt No.</th>
        <th>Customer</th>
        <th>Account No.</th>
        <th>Reference</th>
        <th>Amount</th>
      </tr>
    `;

    table.innerHTML = matched.map(p => `
      <tr>
        <td>${p.date || '-'}</td>
        <td>${p.receiptNo || '-'}</td>
        <td>${p.customerName || customers.find(c=>c.id===p.customerId)?.name || '-'}</td>
        <td>${p.accountNo || customers.find(c=>c.id===p.customerId)?.accountNo || '-'}</td>
        <td>${p.reference || '-'}</td>
        <td>${money(p.amount)}</td>
      </tr>
    `).join('') || `<tr><td colspan="6">No payments for ${monthName} ${year}.</td></tr>`;
  } else {
    const rows = COLLECTION_MONTHS.map(([m,name]) => {
      const matched = payments.filter(p => String(p.date || '').startsWith(`${year}-${m}`));
      return {
        month:name,
        count:matched.length,
        total:matched.reduce((sum,p)=>sum + Number(p.amount || 0),0)
      };
    });
    const yearPayments = rows.reduce((s,r)=>s+r.count,0);
    const yearTotal = rows.reduce((s,r)=>s+r.total,0);

    summary.innerHTML = `
      <div class="summary-item"><span>Year</span><strong>${year}</strong></div>
      <div class="summary-item"><span>No. of Payments</span><strong>${yearPayments}</strong></div>
      <div class="summary-item"><span>Total Collected</span><strong>${money(yearTotal)}</strong></div>
    `;

    head.innerHTML = `
      <tr>
        <th>Month</th>
        <th>No. of Payments</th>
        <th>Total Collected</th>
      </tr>
    `;

    table.innerHTML = rows.map(r => `
      <tr>
        <td>${r.month} ${year}</td>
        <td>${r.count}</td>
        <td>${money(r.total)}</td>
      </tr>
    `).join('');
  }
}

function csvEscape(value){
  return `"${String(value ?? '').replace(/"/g,'""')}"`;
}

function excelSafe(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function downloadCollectionExcel(){
  const type = $('collectionReportType')?.value || 'monthly';
  const year = $('collectionYearFilter')?.value || String(new Date().getFullYear());
  const month = $('collectionMonthFilter')?.value || '01';
  const monthName = COLLECTION_MONTHS.find(([m])=>m===month)?.[1] || month;

  const css = `
    <style>
      body{font-family:Arial,sans-serif;color:#1f2937;}
      table{border-collapse:collapse;min-width:900px;}
      td,th{border:1px solid #cbd5e1;padding:9px 12px;vertical-align:middle;}
      .title{font-size:20px;font-weight:700;text-align:center;background:#17315f;color:white;padding:14px;}
      .subtitle{font-size:13px;text-align:center;background:#eaf0fb;color:#334155;}
      .label{font-weight:700;background:#f1f5f9;}
      .header{font-weight:700;background:#2563eb;color:white;text-align:center;}
      .money{text-align:right;mso-number-format:"₱#,##0.00";}
      .center{text-align:center;}
      .total-label{font-weight:700;background:#eaf0fb;}
      .total-value{font-weight:700;background:#eaf0fb;text-align:right;mso-number-format:"₱#,##0.00";}
      .spacer td{border:none;height:10px;}
    </style>`;

  let body = '';
  let filename = '';

  if(type === 'monthly'){
    const matched = getSelectedCollectionPayments().slice()
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const total = matched.reduce((sum,p)=>sum + Number(p.amount || 0),0);

    const rows = matched.map(p => {
      const c = customers.find(x=>x.id===p.customerId);
      return `<tr>
        <td class="center">${excelSafe(p.date || '')}</td>
        <td>${excelSafe(p.receiptNo || '')}</td>
        <td>${excelSafe(p.customerName || c?.name || '')}</td>
        <td>${excelSafe(p.accountNo || c?.accountNo || '')}</td>
        <td>${excelSafe(p.reference || '')}</td>
        <td class="money">${Number(p.amount || 0).toFixed(2)}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" class="center">No payments recorded.</td></tr>`;

    body = `
      <table>
        <colgroup>
          <col style="width:120px">
          <col style="width:150px">
          <col style="width:210px">
          <col style="width:150px">
          <col style="width:220px">
          <col style="width:130px">
        </colgroup>
        <tr><td colspan="6" class="title">NETBILL - MONTHLY COLLECTION REPORT</td></tr>
        <tr><td colspan="6" class="subtitle">Internet Billing System | Powered by CM Philippines</td></tr>
        <tr class="spacer"><td colspan="6"></td></tr>
        <tr><td class="label">Period</td><td colspan="5">${monthName} ${year}</td></tr>
        <tr><td class="label">No. of Payments</td><td colspan="5">${matched.length}</td></tr>
        <tr class="spacer"><td colspan="6"></td></tr>
        <tr>
          <th class="header">Date</th>
          <th class="header">Receipt No.</th>
          <th class="header">Customer</th>
          <th class="header">Account No.</th>
          <th class="header">Reference</th>
          <th class="header">Amount</th>
        </tr>
        ${rows}
        <tr class="spacer"><td colspan="6"></td></tr>
        <tr>
          <td colspan="5" class="total-label">TOTAL COLLECTED</td>
          <td class="total-value">${total.toFixed(2)}</td>
        </tr>
      </table>`;
    filename = `NetBill_Monthly_Report_${year}-${month}.xls`;
  } else {
    const rowsData = COLLECTION_MONTHS.map(([m,name]) => {
      const matched = payments.filter(p => String(p.date || '').startsWith(`${year}-${m}`));
      return {
        month:name,
        count:matched.length,
        total:matched.reduce((sum,p)=>sum + Number(p.amount || 0),0)
      };
    });
    const totalPayments = rowsData.reduce((s,r)=>s+r.count,0);
    const totalCollected = rowsData.reduce((s,r)=>s+r.total,0);

    const rows = rowsData.map(r => `<tr>
      <td>${r.month} ${year}</td>
      <td class="center">${r.count}</td>
      <td class="money">${r.total.toFixed(2)}</td>
    </tr>`).join('');

    body = `
      <table>
        <colgroup>
          <col style="width:230px">
          <col style="width:180px">
          <col style="width:190px">
        </colgroup>
        <tr><td colspan="3" class="title">NETBILL - YEARLY COLLECTION REPORT</td></tr>
        <tr><td colspan="3" class="subtitle">Internet Billing System | Powered by CM Philippines</td></tr>
        <tr class="spacer"><td colspan="3"></td></tr>
        <tr><td class="label">Year</td><td colspan="2">${year}</td></tr>
        <tr class="spacer"><td colspan="3"></td></tr>
        <tr>
          <th class="header">Month</th>
          <th class="header">No. of Payments</th>
          <th class="header">Total Collected</th>
        </tr>
        ${rows}
        <tr class="spacer"><td colspan="3"></td></tr>
        <tr><td colspan="2" class="total-label">TOTAL PAYMENTS</td><td class="total-value">${totalPayments}</td></tr>
        <tr><td colspan="2" class="total-label">TOTAL COLLECTED</td><td class="total-value">${totalCollected.toFixed(2)}</td></tr>
      </table>`;
    filename = `NetBill_Yearly_Report_${year}.xls`;
  }

  const workbook = `<!DOCTYPE html>
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">${css}</head>
  <body>${body}</body></html>`;

  const blob = new Blob(['\ufeff', workbook], {type:'application/vnd.ms-excel;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderOverdueCustomers(){
  const table = $('overdueCustomerTable');
  if(!table) return;

  const overdue = customers.filter(c => getStatus(c) === 'Overdue');
  table.innerHTML = overdue.map(c => `
    <tr>
      <td>${c.accountNo}</td>
      <td>${c.name}</td>
      <td>${c.dueDate || '-'}</td>
      <td>${money(c.balance)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4">No overdue customers.</td></tr>`;
}

function renderReports(){
  const totalRevenue = payments.reduce((sum,p)=>sum + Number(p.amount || 0),0);
  const receivables = customers.reduce((sum,c)=>sum + Math.max(0,Number(c.balance || 0)),0);

  $('reportPayments').textContent = payments.length;
  $('reportRevenue').textContent = money(totalRevenue);
  $('reportReceivables').textContent = money(receivables);

  const counts = {
    Paid: customers.filter(c=>getStatus(c)==='Paid').length,
    Unpaid: customers.filter(c=>getStatus(c)==='Unpaid').length,
    Overdue: customers.filter(c=>getStatus(c)==='Overdue').length
  };

  $('statusSummary').innerHTML = Object.entries(counts).map(([k,v]) => `
    <div class="summary-item"><span>${k}</span><strong>${v}</strong></div>
  `).join('');

  renderCollectionYearOptions();
  renderCollectionReport();
  renderOverdueCustomers();
}

function fillCustomerSelects(){
  const options = customers.map(c => `<option value="${c.id}">${c.accountNo} - ${c.name}</option>`).join('');
  $('paymentCustomer').innerHTML = options || `<option value="">No customers</option>`;
  $('billCustomer').innerHTML = options || `<option value="">No customers</option>`;
  if($('ledgerCustomer')){
    const previous = $('ledgerCustomer').value;
    $('ledgerCustomer').innerHTML = options || `<option value="">No customers</option>`;
    if(previous && customers.some(c => String(c.id) === String(previous))){
      $('ledgerCustomer').value = previous;
    } else if(customers.length){
      $('ledgerCustomer').value = String(customers[0].id);
    }
  }
}

function renderAll(){
  cleanupPaidActivationDuplicates();
  renderDashboard();
  renderCustomers();
  renderBilling();
  renderPayments();
  renderReports();
  fillCustomerSelects();
  renderLedger();
  saveData();
}

function openCustomerModal(customer=null){
  editingCustomerId = customer ? customer.id : null;
  $('customerModalTitle').textContent = customer ? 'Edit Customer' : 'Add Customer';
  $('accountNo').value = customer?.accountNo || nextAccountNo();
  $('customerName').value = customer?.name || '';
  $('customerAddress').value = customer?.address || '';
  $('customerContact').value = customer?.contact || '';
  $('customerPlan').value = customer?.plan || '';
  $('customerFee').value = customer?.fee || '';
  $('activationDate').value = customer?.activationDate || todayISO();
  $('customerDue').value = customer?.dueDate || '';
  $('customerModal').classList.remove('hidden');
}

window.editCustomer = id => {
  const c = customers.find(x=>x.id===id);
  if(c) openCustomerModal(c);
};

window.deleteCustomer = id => {
  const c = customers.find(x=>x.id===id);
  if(!c) return;
  if(confirm(`Delete ${c.name}? This will also remove this customer's payment and ledger history.`)){
    customers = customers.filter(x=>x.id!==id);
    payments = payments.filter(p=>p.customerId!==id);
    ledgerEntries = ledgerEntries.filter(e=>e.customerId!==id);
    renderAll();
  }
};

function closeCustomerModal(){
  $('customerModal').classList.add('hidden');
  editingCustomerId = null;
}

$('addCustomerBtn').addEventListener('click',()=>openCustomerModal());
$('quickAddBtn').addEventListener('click',()=>openCustomerModal());
$('closeCustomerModal').addEventListener('click',closeCustomerModal);
$('cancelCustomerBtn').addEventListener('click',closeCustomerModal);

$('saveCustomerBtn').addEventListener('click',()=>{
  const accountNo = $('accountNo').value.trim();
  const name = $('customerName').value.trim();
  const address = $('customerAddress').value.trim();
  const contact = $('customerContact').value.trim();
  const plan = $('customerPlan').value.trim();
  const fee = Number($('customerFee').value || 0);
  const activationDate = $('activationDate').value;
  const dueDate = $('customerDue').value;

  if(!accountNo || !name || !plan || fee <= 0){
    alert('Please complete Account No., Full Name, Internet Plan, and Monthly Rate.');
    return;
  }

  const duplicate = customers.find(c => c.accountNo.toLowerCase() === accountNo.toLowerCase() && c.id !== editingCustomerId);
  if(duplicate){
    alert('Account number already exists.');
    return;
  }

  if(editingCustomerId){
    const c = customers.find(x=>x.id===editingCustomerId);
    Object.assign(c,{accountNo,name,address,contact,plan,fee,activationDate,dueDate});
  } else {
    const newCustomer = {
      id: Date.now(),
      accountNo,name,address,contact,plan,fee,activationDate,dueDate,
      currentBill: fee,
      balance: fee
    };
    customers.push(newCustomer);
    const initialPaymentStatus = document.getElementById('initialPaymentStatus')?.value || 'unpaid';

    if(initialPaymentStatus === 'paid'){
      // Paid upon activation: record ONE combined ledger entry only.
      recordInitialActivationPayment(newCustomer, initialPaymentStatus);
    } else {
      // Unpaid upon activation: keep the initial bill as an outstanding balance.
      addLedgerEntry({
        customerId: newCustomer.id,
        date: activationDate || todayISO(),
        type: 'Bill',
        description: 'Initial monthly bill',
        previousBalance: 0,
        charge: fee,
        payment: 0,
        runningBalance: fee,
        reference: dueDate ? `Due ${dueDate}` : ''
      });
    }
  }

  closeCustomerModal();
  renderAll();
});

$('createBillBtn').addEventListener('click',()=>{
  const customerId = Number($('billCustomer').value);
  const amount = Number($('billAmount').value || 0);
  const dueDate = $('billDueDate').value;
  const c = customers.find(x=>x.id===customerId);

  if(!c || amount <= 0 || !dueDate){
    alert('Select a customer, enter billing amount, and set the due date.');
    return;
  }

  const previousBalance = Number(c.balance || 0);
  c.currentBill = amount;
  c.balance = previousBalance + amount;
  c.dueDate = dueDate;
  addLedgerEntry({
    customerId: c.id,
    date: todayISO(),
    type: 'Bill',
    description: 'Monthly internet bill',
    previousBalance,
    charge: amount,
    payment: 0,
    runningBalance: c.balance,
    reference: `Due ${dueDate}`
  });
  renderAll();
  alert('Monthly bill added successfully. Previous balance was carried forward.');
});

$('recordPaymentBtn').addEventListener('click',()=>{
  const customerId = Number($('paymentCustomer').value);
  const amount = Number($('paymentAmount').value || 0);
  const date = $('paymentDate').value || todayISO();
  const reference = $('paymentReference').value.trim();
  const c = customers.find(x=>x.id===customerId);

  if(!c || amount <= 0){
    alert('Select a customer and enter a valid payment amount.');
    return;
  }

  if(amount > Number(c.balance || 0)){
    if(!confirm('Payment is higher than the current balance. Continue?')) return;
  }

  const previousBalance = Number(c.balance || 0);
  c.balance = Math.max(0, previousBalance - amount);
  const payment = {
    id: Date.now(),
    receiptNo: nextReceiptNo(),
    customerId: c.id,
    customerName: c.name,
    accountNo: c.accountNo,
    amount,
    date,
    reference,
    balanceAfter: c.balance
  };
  payments.push(payment);
  addLedgerEntry({
    customerId: c.id,
    date,
    type: 'Payment',
    description: `Payment ${payment.receiptNo}`,
    previousBalance,
    charge: 0,
    payment: amount,
    runningBalance: c.balance,
    reference: reference || payment.receiptNo
  });

  $('paymentAmount').value = '';
  $('paymentReference').value = '';
  renderAll();
  showReceipt(payment.receiptNo);
});

window.showReceipt = receiptNo => {
  const p = payments.find(x=>x.receiptNo===receiptNo);
  if(!p) return;
  const c = customers.find(x=>x.id===p.customerId);

  $('receiptContent').innerHTML = `
    <div class="receipt">
      <h2>NETBILL</h2>
      <div class="center">Internet Billing System</div>
      <div class="center">Official Payment Receipt</div>
      <br>
      <div class="receipt-row"><span>Receipt No.</span><strong>${p.receiptNo}</strong></div>
      <div class="receipt-row"><span>Date</span><strong>${p.date}</strong></div>
      <div class="receipt-row"><span>Account No.</span><strong>${p.accountNo}</strong></div>
      <div class="receipt-row"><span>Customer</span><strong>${p.customerName}</strong></div>
      <div class="receipt-row"><span>Plan</span><strong>${c?.plan || '-'}</strong></div>
      <div class="receipt-row"><span>Reference</span><strong>${p.reference || '-'}</strong></div>
      <div class="receipt-row receipt-total"><span>Amount Paid</span><strong>${money(p.amount)}</strong></div>
      <div class="receipt-row"><span>Remaining Balance</span><strong>${money(p.balanceAfter)}</strong></div>
      <br>
      <div class="center">Thank you for your payment.</div>
    </div>
  `;
  $('receiptModal').classList.remove('hidden');
};

$('closeReceiptBtn').addEventListener('click',()=>$('receiptModal').classList.add('hidden'));
$('printReceiptBtn').addEventListener('click',()=>window.print());

$('customerSearch').addEventListener('input',renderCustomers);
$('statusFilter').addEventListener('change',renderCustomers);
if($('collectionReportType')) $('collectionReportType').addEventListener('change',renderCollectionReport);
if($('collectionYearFilter')) $('collectionYearFilter').addEventListener('change',renderCollectionReport);
if($('collectionMonthFilter')) $('collectionMonthFilter').addEventListener('change',renderCollectionReport);
if($('downloadCollectionBtn')) $('downloadCollectionBtn').addEventListener('click',downloadCollectionExcel);
if($('ledgerCustomer')) $('ledgerCustomer').addEventListener('change',renderLedger);
if($('viewLedgerBtn')) $('viewLedgerBtn').addEventListener('click',renderLedger);

$('paymentDate').value = todayISO();
$('billDueDate').value = todayISO();

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.section).classList.add('active');
    $('pageTitle').textContent = btn.textContent;
  });
});

migrateExistingLedgerData();
runAutomaticMonthlyBilling();
cleanupPaidActivationDuplicates();
saveData();
renderAll();
