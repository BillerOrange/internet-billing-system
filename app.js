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
let editingCustomerId = null;

const $ = id => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);
const money = value => '₱' + Number(value || 0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

function saveData(){
  localStorage.setItem('nb_customers', JSON.stringify(customers));
  localStorage.setItem('nb_payments', JSON.stringify(payments));
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
}

function fillCustomerSelects(){
  const options = customers.map(c => `<option value="${c.id}">${c.accountNo} - ${c.name}</option>`).join('');
  $('paymentCustomer').innerHTML = options || `<option value="">No customers</option>`;
  $('billCustomer').innerHTML = options || `<option value="">No customers</option>`;
}

function renderAll(){
  renderDashboard();
  renderCustomers();
  renderBilling();
  renderPayments();
  renderReports();
  fillCustomerSelects();
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
  if(confirm(`Delete ${c.name}?`)){
    customers = customers.filter(x=>x.id!==id);
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
    customers.push({
      id: Date.now(),
      accountNo,name,address,contact,plan,fee,activationDate,dueDate,
      currentBill: fee,
      balance: fee
    });
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

  c.currentBill = amount;
  c.balance = amount;
  c.dueDate = dueDate;
  renderAll();
  alert('Bill created/updated successfully.');
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

  c.balance = Math.max(0, Number(c.balance || 0) - amount);
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

renderAll();
