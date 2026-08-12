const SUPABASE_URL = 'https://miiyapzxercxhgcahmfu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jg9Ltn2IDaTn3Bb3mRrDDg_OUW4MtUz';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
async function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const message = document.getElementById('loginMessage');

  message.textContent = 'Logging in...';

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    message.textContent = 'Invalid email or password.';
    return;
  }
await loadCustomersFromSupabase();
await loadBillingAndPaymentsFromSupabase();
renderAll();
  
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  message.textContent = '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('loginBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', loginUser);
  }
  const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      alert('LOGOUT BUTTON WORKING');
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert('Logout failed: ' + error.message);
            return;
        }

        window.location.reload();
    });
}

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    await loadCustomersFromSupabase();
await loadBillingAndPaymentsFromSupabase();
renderAll();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
  }
});

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

let customers = [];
let payments = JSON.parse(localStorage.getItem('nb_payments') || '[]');
async function loadBillingAndPaymentsFromSupabase() {
  const { data: billingData, error: billingError } = await supabaseClient
    .from('billing')
    .select('*')
    .order('created_at', { ascending: true });

  if (billingError) {
    console.error('Error loading billing:', billingError);
  }

  const { data: paymentData, error: paymentError } = await supabaseClient
    .from('payments')
    .select('*')
    .order('created_at', { ascending: true });

  if (paymentError) {
    console.error('Error loading payments:', paymentError);
  }

  payments = (paymentData || []).map((p, index) => ({
    id: p.id,
    customerId: p.client_id,
    amount: Number(p.amount || 0),
    date: String(p.payment_date || '').slice(0, 10),
    reference: p.reference_no || '',
    issuedBy: p.collected_by || '',
    receiptNo: p.receipt_no || p.reference_no || `RCPT-${String(index + 1).padStart(5,'0')}`,
    balanceAfter: Number(p.balance_after || 0)
  }));

  const billingLedger = (billingData || []).map(b => ({
    id: b.id,
    customerId: b.client_id,
    date: String(b.billing_month || b.created_at || '').slice(0, 10),
    type: 'Bill',
    description: b.description || 'Monthly internet bill',
    previousBalance: Number(b.previous_balance || 0),
    charge: Number(b.current_charge || 0),
    payment: 0,
    runningBalance: Number(b.previous_balance || 0) + Number(b.current_charge || 0),
    reference: b.due_date ? `Due ${b.due_date}` : ''
  }));

  const paymentLedger = (paymentData || []).map(p => ({
    id: p.id,
    customerId: p.client_id,
    date: String(p.payment_date || p.created_at || '').slice(0, 10),
    type: 'Payment',
    description: `Payment ${p.receipt_no || p.reference_no || ''}`.trim(),
    previousBalance: Number(p.balance_before || 0),
    charge: 0,
    payment: Number(p.amount || 0),
    runningBalance: Number(p.balance_after || 0),
    reference: p.reference_no || ''
  }));

  ledgerEntries = [...billingLedger, ...paymentLedger];
}
let ledgerEntries = JSON.parse(localStorage.getItem('nb_ledger') || '[]');
let editingCustomerId = null;
async function loadCustomersFromSupabase() {
  const { data, error } = await supabaseClient
    .from('clients')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading customers:', error);
    return;
  }

  customers = (data || []).map(c => ({
  id: c.id,
  accountNo: c.account_no,
  name: c.name,
  address: c.address || '',
  contact: c.contact_no || '',
  plan: c.internet_plan || '',
  fee: Number(c.monthly_rate || 0),
  activationDate: c.activation_date || '',
  dueDate: c.due_date || '',
  currentBill: Number(c.current_bill || 0),
  balance: Number(c.balance || 0)
}));
}
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
          <button class="small-btn" onclick="editCustomer('${c.id}')">Edit</button>
<button class="small-btn danger" onclick="deleteCustomer('${c.id}')">Delete</button>
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
        <td>${p.issuedBy || '-'}</td>
        <td>${money(p.balanceAfter)}</td>
        <td><button class="small-btn" onclick="showReceipt('${p.receiptNo}')">View</button></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="8">No payments recorded yet.</td></tr>`;
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
  const customerId = select.value || customers[0]?.id || '';
  const c = customers.find(x => String(x.id) === String(customerId));

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
.sort((a,b)=> String(a.date).localeCompare(String(b.date)));

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
        <th>Amount Paid</th>
        <th>Outstanding Balance</th>
        <th>Collected By</th>
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
        <td>${money(p.balanceAfter)}</td>
        <td>${p.issuedBy || '-'}</td>
      </tr>
    `).join('') || `<tr><td colspan="8">No payments for ${monthName} ${year}.</td></tr>`;
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

function setCellStyle(cell, style){
  if(cell) cell.s = style;
}

function downloadCollectionExcel(){
  if(typeof XLSX === 'undefined'){
    alert('Excel exporter is still loading. Please check your internet connection and try again.');
    return;
  }

  const type = $('collectionReportType')?.value || 'monthly';
  const year = $('collectionYearFilter')?.value || String(new Date().getFullYear());
  const month = $('collectionMonthFilter')?.value || '01';
  const monthName = COLLECTION_MONTHS.find(([m])=>m===month)?.[1] || month;
  const wb = XLSX.utils.book_new();

  function formatMoneyColumn(ws, colIndex){
    if(!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for(let r=0;r<=range.e.r;r++){
      const cell = ws[XLSX.utils.encode_cell({r,c:colIndex})];
      if(cell && typeof cell.v === 'number') cell.z='₱#,##0.00';
    }
  }

  function addOutstandingSheet(){
    const outstanding = customers
      .filter(c=>Number(c.balance || 0) > 0)
      .slice()
      .sort((a,b)=>Number(b.balance||0)-Number(a.balance||0));

    const rows = [
      ['NETBILL - CURRENT OUTSTANDING BALANCES','','','',''],
      ['Generated', new Date().toLocaleString(),'','',''],
      [],
      ['Account No.','Client','Status','Due Date','Outstanding Balance']
    ];

    outstanding.forEach(c=>{
      rows.push([
        String(c.accountNo || ''),
        String(c.name || ''),
        String(getStatus(c) || ''),
        String(c.dueDate || ''),
        Number(c.balance || 0)
      ]);
    });

    const total = outstanding.reduce((s,c)=>s+Number(c.balance||0),0);
    rows.push([]);
    rows.push(['TOTAL OUTSTANDING','','','',total]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:18},{wch:30},{wch:16},{wch:16},{wch:22}];
    formatMoneyColumn(ws,4);
    XLSX.utils.book_append_sheet(wb,ws,'Outstanding Balances');
  }

  function addCollectorSummary(sourcePayments, sheetName, periodLabel){
    const collectors = {};
    sourcePayments.forEach(p=>{
      const name = String(p.issuedBy || 'Unspecified').trim() || 'Unspecified';
      if(!collectors[name]) collectors[name]={count:0,total:0};
      collectors[name].count += 1;
      collectors[name].total += Number(p.amount||0);
    });

    const rows = [
      ['NETBILL - COLLECTOR SUMMARY','',''],
      ['Period',periodLabel,''],
      [],
      ['Collected By','No. of Payments','Total Collected']
    ];

    Object.entries(collectors)
      .sort((a,b)=>b[1].total-a[1].total)
      .forEach(([name,v])=>rows.push([name,v.count,v.total]));

    rows.push([]);
    rows.push([
      'TOTAL',
      sourcePayments.length,
      sourcePayments.reduce((s,p)=>s+Number(p.amount||0),0)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:30},{wch:18},{wch:20}];
    formatMoneyColumn(ws,2);
    XLSX.utils.book_append_sheet(wb,ws,sheetName);
  }

  if(type === 'monthly'){
    const matched = getSelectedCollectionPayments().slice()
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const total = matched.reduce((s,p)=>s+Number(p.amount||0),0);

    const rows = [
      ['NETBILL - MONTHLY COLLECTION REPORT','','','','','','',''],
      ['Internet Billing System | Powered by CM Philippines','','','','','','',''],
      [],
      ['Period',`${monthName} ${year}`,'','','','','',''],
      ['No. of Payments',matched.length,'','','','','',''],
      [],
      ['Date','Receipt No.','Client','Account No.','Reference','Amount Paid','Outstanding Balance','Collected By']
    ];

    matched.forEach(p=>{
      const c = customers.find(x=>x.id===p.customerId);
      rows.push([
        String(p.date||''),
        String(p.receiptNo||''),
        String(p.customerName||c?.name||''),
        String(p.accountNo||c?.accountNo||''),
        String(p.reference||''),
        Number(p.amount||0),
        Number(p.balanceAfter||0),
        String(p.issuedBy||'-')
      ]);
    });

    rows.push([]);
    rows.push(['TOTAL COLLECTED','','','','',total,'','']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges']=[
      {s:{r:0,c:0},e:{r:0,c:7}},
      {s:{r:1,c:0},e:{r:1,c:7}},
      {s:{r:3,c:1},e:{r:3,c:7}},
      {s:{r:4,c:1},e:{r:4,c:7}},
      {s:{r:rows.length-1,c:0},e:{r:rows.length-1,c:4}}
    ];
    ws['!cols']=[
      {wch:15},{wch:18},{wch:28},{wch:18},
      {wch:28},{wch:17},{wch:22},{wch:24}
    ];
    ws['!freeze']={xSplit:0,ySplit:7,topLeftCell:'A8',activePane:'bottomLeft',state:'frozen'};
    formatMoneyColumn(ws,5);
    formatMoneyColumn(ws,6);
    XLSX.utils.book_append_sheet(wb,ws,`${monthName} ${year}`);

    addCollectorSummary(matched,'Collector Audit',`${monthName} ${year}`);
    addOutstandingSheet();

    wb.Props={
      Title:`NetBill Monthly Collection Report - ${monthName} ${year}`,
      Subject:'Complete Collection, Outstanding Balance, and Collector Audit Report',
      Author:'NetBill - CM Philippines',
      Company:'CM Philippines'
    };
    XLSX.writeFile(wb,`NetBill_Monthly_Report_${year}-${month}.xlsx`,{
      bookType:'xlsx',compression:true,cellStyles:true
    });

  } else {
    const yearPayments = payments
      .filter(p=>String(p.date||'').startsWith(`${year}-`))
      .slice()
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)));

    const monthlyRows = COLLECTION_MONTHS.map(([m,name])=>{
      const matched = yearPayments.filter(p=>String(p.date||'').startsWith(`${year}-${m}`));
      return [name,matched.length,matched.reduce((s,p)=>s+Number(p.amount||0),0)];
    });

    const totalPayments=yearPayments.length;
    const totalCollected=yearPayments.reduce((s,p)=>s+Number(p.amount||0),0);

    const summary=[
      ['NETBILL - YEARLY COLLECTION REPORT','',''],
      ['Internet Billing System | Powered by CM Philippines','',''],
      [],
      ['Year',year,''],
      [],
      ['Month','No. of Payments','Total Collected']
    ];
    monthlyRows.forEach(r=>summary.push([`${r[0]} ${year}`,r[1],r[2]]));
    summary.push([]);
    summary.push(['TOTAL PAYMENTS','',totalPayments]);
    summary.push(['TOTAL COLLECTED','',totalCollected]);

    const sws=XLSX.utils.aoa_to_sheet(summary);
    sws['!cols']=[{wch:24},{wch:20},{wch:20}];
    formatMoneyColumn(sws,2);
    XLSX.utils.book_append_sheet(wb,sws,`Year ${year}`);

    // Full transaction-level yearly audit with balance after every payment.
    const detail=[
      ['NETBILL - YEARLY PAYMENT AUDIT','','','','','','',''],
      ['Date','Receipt No.','Client','Account No.','Reference','Amount Paid','Outstanding Balance','Collected By']
    ];

    yearPayments.forEach(p=>{
      const c=customers.find(x=>x.id===p.customerId);
      detail.push([
        String(p.date||''),
        String(p.receiptNo||''),
        String(p.customerName||c?.name||''),
        String(p.accountNo||c?.accountNo||''),
        String(p.reference||''),
        Number(p.amount||0),
        Number(p.balanceAfter||0),
        String(p.issuedBy||'-')
      ]);
    });

    const dws=XLSX.utils.aoa_to_sheet(detail);
    dws['!cols']=[
      {wch:15},{wch:18},{wch:28},{wch:18},
      {wch:28},{wch:17},{wch:22},{wch:24}
    ];
    formatMoneyColumn(dws,5);
    formatMoneyColumn(dws,6);
    XLSX.utils.book_append_sheet(wb,dws,'Payment Audit');

    addCollectorSummary(yearPayments,'Collector Summary',year);
    addOutstandingSheet();

    wb.Props={
      Title:`NetBill Yearly Collection Report - ${year}`,
      Subject:'Complete Collection, Outstanding Balance, and Collector Audit Report',
      Author:'NetBill - CM Philippines',
      Company:'CM Philippines'
    };
    XLSX.writeFile(wb,`NetBill_Yearly_Report_${year}.xlsx`,{
      bookType:'xlsx',compression:true,cellStyles:true
    });
  }
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
  const c = customers.find(x => String(x.id) === String(id));

  if (!c) {
    alert('Customer record not found.');
    return;
  }

  openCustomerModal(c);
};

window.deleteCustomer = async id => {
  const c = customers.find(x => x.id == id);
  if (!c) return;

  if (!confirm(`Delete ${c.name}? This will permanently remove this customer.`)) {
    return;
  }

  const { error } = await supabaseClient
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    alert('Error deleting customer: ' + error.message);
    return;
  }

  alert('Customer deleted successfully.');

  await loadCustomersFromSupabase();
  renderAll();
};

function closeCustomerModal(){
  $('customerModal').classList.add('hidden');
  editingCustomerId = null;
}

$('addCustomerBtn').addEventListener('click',()=>openCustomerModal());
$('quickAddBtn').addEventListener('click',()=>openCustomerModal());
$('closeCustomerModal').addEventListener('click',closeCustomerModal);
$('cancelCustomerBtn').addEventListener('click',closeCustomerModal);

$('saveCustomerBtn').addEventListener('click', async ()=>{
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

  const customerData = {
  account_no: accountNo,
  name: name,
  address: address,
  contact_no: contact,
  internet_plan: plan,
  monthly_rate: fee,
  activation_date: activationDate || null,
  due_date: dueDate || null,
  current_bill: fee,
  balance: fee,
  is_active: true
};

  let result;

  if(editingCustomerId){
    result = await supabaseClient
      .from('clients')
      .update(customerData)
      .eq('id', editingCustomerId)
      .select();
  } else {
    result = await supabaseClient
      .from('clients')
      .insert([customerData])
      .select();
  }

  if(result.error){
    console.error(result.error);
    alert('Error saving customer: ' + result.error.message);
    return;
  }

  alert('Customer saved successfully.');
  
  await loadCustomersFromSupabase();
renderAll();
  
  closeCustomerModal();
});

$('createBillBtn').addEventListener('click', async ()=>{
  const customerId = $('billCustomer').value;
  const amount = Number($('billAmount').value || 0);
  const dueDate = $('billDueDate').value;
  const c = customers.find(x=>x.id===customerId);

  if(!c || amount <= 0 || !dueDate){
    alert('Select a customer, enter billing amount, and set the due date.');
    return;
  }

  const previousBalance = Number(c.balance || 0);
const newBalance = previousBalance + amount;

const { error: billError } = await supabaseClient
  .from('billing')
  .insert([{
    client_id: c.id,
    billing_month: todayISO(),
    previous_balance: previousBalance,
    current_charge: amount,
    due_date: dueDate,
    status: 'Unpaid',
    description: 'Monthly internet bill'
  }]);

if(billError){
  console.error(billError);
  alert('Error saving bill: ' + billError.message);
  return;
}

const { error: clientError } = await supabaseClient
  .from('clients')
  .update({
    current_bill: amount,
    balance: newBalance,
    due_date: dueDate
  })
  .eq('id', c.id);

if(clientError){
  console.error(clientError);
  alert('Bill was created, but customer balance update failed: ' + clientError.message);
  return;
}

await loadCustomersFromSupabase();
renderAll();

alert('Monthly bill saved successfully.');
});

$('recordPaymentBtn').addEventListener('click', async ()=>{
  const customerId = $('paymentCustomer').value;
  const amount = Number($('paymentAmount').value || 0);
  const date = $('paymentDate').value || todayISO();
  const reference = $('paymentReference').value.trim();
  const issuedBy = $('paymentIssuedBy')?.value.trim() || '';
  const c = customers.find(x=>x.id===customerId);

  if(!c || amount <= 0){
    alert('Select a customer and enter a valid payment amount.');
    return;
  }
  if(!issuedBy){
    alert('Please enter the name of the collector.');
    return;
  }

  if(amount > Number(c.balance || 0)){
    if(!confirm('Payment is higher than the current balance. Continue?')) return;
  }

  const previousBalance = Number(c.balance || 0);
const newBalance = Math.max(0, previousBalance - amount);
const receiptNo = nextReceiptNo();

const { data: latestBill } = await supabaseClient
  .from('billing')
  .select('id')
  .eq('client_id', c.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const { data: savedPayment, error: paymentError } = await supabaseClient
  .from('payments')
  .insert([{
    billing_id: latestBill?.id || null,
    client_id: c.id,
    amount: amount,
    payment_date: date,
    payment_method: 'Cash',
    reference_no: reference || receiptNo,
    notes: '',
    collector_email: '',
    collected_by: issuedBy,
    balance_before: previousBalance,
    balance_after: newBalance
  }])
  .select()
  .single();

if(paymentError){
  console.error(paymentError);
  alert('Error saving payment: ' + paymentError.message);
  return;
}

const { error: clientError } = await supabaseClient
  .from('clients')
  .update({
    balance: newBalance
  })
  .eq('id', c.id);

if(clientError){
  console.error(clientError);
  alert('Payment saved, but customer balance update failed: ' + clientError.message);
  return;
}

const payment = {
  id: savedPayment.id,
  receiptNo: receiptNo,
  customerId: c.id,
  customerName: c.name,
  accountNo: c.accountNo,
  amount,
  date,
  reference: reference || receiptNo,
  issuedBy,
  balanceAfter: newBalance
};

payments.push(payment);

$('paymentAmount').value = '';
$('paymentReference').value = '';
if($('paymentIssuedBy')) $('paymentIssuedBy').value = '';

await loadCustomersFromSupabase();
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
      <div class="receipt-row"><span>Payment Received By</span><strong>${p.issuedBy || '-'}</strong></div>
      <div class="receipt-row receipt-total"><span>Amount Paid</span><strong>${money(p.amount)}</strong></div>
      <div class="receipt-row"><span>Remaining Balance</span><strong>${money(p.balanceAfter)}</strong></div>
      <br>
      <div class="center">Thank you for your payment.</div>
    </div>
  `;
  $('receiptModal').classList.remove('hidden');
};

$('closeReceiptBtn').addEventListener('click',()=>$('receiptModal').classList.add('hidden'));
if($('downloadReceiptBtn')){
  $('downloadReceiptBtn').addEventListener('click', async ()=>{
    const receipt = $('receiptContent');
    if(!receipt) return;
    if(typeof html2canvas === 'undefined'){
      alert('Receipt downloader is still loading. Please try again.');
      return;
    }

    const btn = $('downloadReceiptBtn');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Preparing Receipt...';

    try{
      const canvas = await html2canvas(receipt, {
        backgroundColor:'#ffffff',
        scale:2,
        useCORS:true
      });
      const receiptNo = receipt.querySelector('.receipt-row strong')?.textContent || 'Receipt';
      const link = document.createElement('a');
      link.download = `NetBill_${receiptNo.replace(/[^A-Za-z0-9_-]/g,'_')}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }catch(e){
      alert('Unable to download the receipt. Please try again.');
    }finally{
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });
}

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
